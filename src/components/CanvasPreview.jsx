import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { generateNormalMap, applyBlur } from '../utils/imageProcessing';

const CanvasPreview = forwardRef(({ layers, setLayers, activeLayerId, globalSettings, paintMode, brushSettings, viewportMode, tiling }, ref) => {
  const canvasRef = useRef(null);
  const rawCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const lastDrawPos = useRef(null);
  
  // Viewport Transform State
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    getRawComposite: () => rawCanvasRef.current
  }));

  // Handle Zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const scaleAdjust = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => {
      let newScale = prev.scale * scaleAdjust;
      newScale = Math.max(0.1, Math.min(newScale, 10));
      return { ...prev, scale: newScale };
    });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (container) container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Main Render Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    let baseWidth = 1024;
    let baseHeight = 1024;
    
    if (layers.length > 0 && layers[0].image) {
      baseWidth = layers[0].image.width;
      baseHeight = layers[0].image.height;
    }

    if (canvas.width !== baseWidth || canvas.height !== baseHeight) {
      canvas.width = baseWidth;
      canvas.height = baseHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (layers.length === 0) {
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#444';
      ctx.font = '24px Anta';
      ctx.textAlign = 'center';
      ctx.fillText('ADD AN IMAGE LAYER', canvas.width / 2, canvas.height / 2);
      return;
    }

    const offCanvas = document.createElement('canvas');
    offCanvas.width = canvas.width;
    offCanvas.height = canvas.height;
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

    const reversedLayers = [...layers].reverse();
    
    reversedLayers.forEach(layer => {
      if (!layer.visible || !layer.image) return;
      
      offCtx.globalCompositeOperation = getCanvasBlendMode(layer.blendMode);
      offCtx.globalAlpha = layer.opacity / 100;
      
      const x = (canvas.width - layer.image.width) / 2;
      const y = (canvas.height - layer.image.height) / 2;
      
      // Handle Tiling if requested (internal tiling for the layer)
      // For now, we apply global tiling to the final composite for previewing
      offCtx.drawImage(layer.image, x, y);
    });

    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = canvas.width;
    rawCanvas.height = canvas.height;
    rawCanvas.getContext('2d').drawImage(offCanvas, 0, 0);
    rawCanvasRef.current = rawCanvas;

    applyBlur(offCtx, offCanvas.width, offCanvas.height, globalSettings.blur);

    const drawTiled = (source) => {
      const tileWidth = canvas.width / tiling;
      const tileHeight = canvas.height / tiling;
      for (let tx = 0; tx < tiling; tx++) {
        for (let ty = 0; ty < tiling; ty++) {
          ctx.drawImage(source, tx * tileWidth, ty * tileHeight, tileWidth, tileHeight);
        }
      }
    };

    if (viewportMode === 'normal') {
      generateNormalMap(offCtx, offCanvas.width, offCanvas.height, globalSettings);
      drawTiled(offCanvas);
    } else if (viewportMode === 'displacement') {
      ctx.filter = 'grayscale(100%)';
      drawTiled(offCanvas);
      ctx.filter = 'none';
    } else if (viewportMode === 'ao') {
      const aoCanvas = document.createElement('canvas');
      aoCanvas.width = canvas.width;
      aoCanvas.height = canvas.height;
      const aoCtx = aoCanvas.getContext('2d');
      aoCtx.filter = 'grayscale(100%)';
      aoCtx.drawImage(offCanvas, 0, 0);
      aoCtx.globalCompositeOperation = 'difference';
      aoCtx.fillStyle = 'white';
      aoCtx.fillRect(0, 0, canvas.width, canvas.height);
      aoCtx.globalCompositeOperation = 'source-over';
      aoCtx.filter = 'blur(4px)';
      aoCtx.drawImage(aoCanvas, 0, 0);
      drawTiled(aoCanvas);
    } else if (viewportMode === 'metallic') {
      // If we have metallic layers, they are already in offCanvas
      ctx.filter = 'grayscale(100%)';
      drawTiled(offCanvas);
      ctx.filter = 'none';
    } else if (viewportMode === 'roughness') {
      // If we have roughness layers, they are already in offCanvas
      ctx.filter = 'grayscale(100%)';
      drawTiled(offCanvas);
      ctx.filter = 'none';
    }
    
  }, [layers, globalSettings, viewportMode, tiling]);

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e) => {
    if (paintMode && activeLayerId) {
      setIsDrawing(true);
      const pos = getMousePos(e);
      lastDrawPos.current = pos;
      drawOnLayer(e);
    } else {
      setIsPanning(true);
      panStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    }
  };

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    
    if (isDrawing && paintMode && activeLayerId) {
      drawOnLayer(e);
    } else if (isPanning) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setIsPanning(false);
    lastDrawPos.current = null;
  };

  const drawOnLayer = (e) => {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer || !activeLayer.image) return;

    const canvas = canvasRef.current;
    const pos = getMousePos(e);

    const offsetX = (canvas.width - activeLayer.image.width) / 2;
    const offsetY = (canvas.height - activeLayer.image.height) / 2;

    const layerX = pos.x - offsetX;
    const layerY = pos.y - offsetY;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = activeLayer.image.width;
    tempCanvas.height = activeLayer.image.height;
    const ctx = tempCanvas.getContext('2d');
    
    ctx.drawImage(activeLayer.image, 0, 0);
    
    ctx.globalAlpha = brushSettings.opacity / 100;
    ctx.strokeStyle = brushSettings.color;
    ctx.fillStyle = brushSettings.color;
    ctx.lineWidth = brushSettings.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (lastDrawPos.current) {
      const lastX = lastDrawPos.current.x - offsetX;
      const lastY = lastDrawPos.current.y - offsetY;
      
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(layerX, layerY);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(layerX, layerY, brushSettings.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    lastDrawPos.current = pos;

    const newImage = new Image();
    newImage.onload = () => {
      setLayers(layers.map(l => l.id === activeLayerId ? { ...l, image: newImage } : l));
    };
    newImage.src = tempCanvas.toDataURL();
  };

  const getCanvasBlendMode = (mode) => {
    switch (mode) {
      case 'multiply': return 'multiply';
      case 'screen': return 'screen';
      case 'overlay': return 'overlay';
      default: return 'source-over';
    }
  };

  return (
    <div 
      ref={containerRef}
      className="canvas-container"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
        cursor: paintMode ? 'none' : (isPanning ? 'grabbing' : 'grab')
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {paintMode && (
        <div 
          className="brush-preview"
          style={{
            left: mousePos.x,
            top: mousePos.y,
            width: brushSettings.size * transform.scale,
            height: brushSettings.size * transform.scale,
          }}
        />
      )}

      <div style={{
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        transformOrigin: 'center center',
        transition: isPanning ? 'none' : 'transform 0.1s ease-out'
      }}>
        <canvas 
          ref={canvasRef} 
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            borderRadius: '4px',
            background: 'transparent',
            pointerEvents: 'none'
          }} 
        />
      </div>
    </div>
  );
});

export default CanvasPreview;
