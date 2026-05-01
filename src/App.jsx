import React, { useState, useRef, useEffect } from 'react';
import { Layers, Paintbrush, Settings2, ChevronLeft, ChevronRight, Eye, Box, Save, Folder } from 'lucide-react';
import CanvasPreview from './components/CanvasPreview';
import ControlPanel from './components/ControlPanel';
import LayerManager from './components/LayerManager';
import ThreePreview from './components/ThreePreview';

function App() {
  const [channels, setChannels] = useState({
    height: [],
    metallic: [],
    roughness: [],
  });
  const [activeChannel, setActiveChannel] = useState('height');
  const [activeLayerId, setActiveLayerId] = useState(null);
  
  const layers = channels[activeChannel];
  const setLayers = (newLayersOrFn) => {
    setChannels(prev => {
      const currentLayers = prev[activeChannel];
      const nextLayers = typeof newLayersOrFn === 'function' ? newLayersOrFn(currentLayers) : newLayersOrFn;
      return { ...prev, [activeChannel]: nextLayers };
    });
  };

  // Paint Tool State
  const [paintMode, setPaintMode] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [viewportMode, setViewportMode] = useState('normal'); 
  const [tiling, setTiling] = useState(1);
  
  const [brushSettings, setBrushSettings] = useState({
    size: 40,
    color: '#ffffff',
    opacity: 100,
    type: 'round'
  });

  const [globalSettings, setGlobalSettings] = useState({
    intensity: 1,
    level: 7.0,
    blur: 0,
    filter: 'sobel',
    invertR: false,
    invertG: false,
    invertH: false,
    metallic: 0,
    roughness: 0.5,
  });
  
  const [uiSettings, setUiSettings] = useState(globalSettings);
  const [leftPanelWidth, setLeftPanelWidth] = useState(300);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [storageHandle, setStorageHandle] = useState(null);

  const canvasRef = useRef(null);

  const getCompositeForChannel = async (channelName) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    const channelLayers = channels[channelName];
    if (channelLayers.length === 0) {
      const val = channelName === 'metallic' ? globalSettings.metallic : (channelName === 'roughness' ? globalSettings.roughness : 0.5);
      ctx.fillStyle = `rgb(${val * 255}, ${val * 255}, ${val * 255})`;
      ctx.fillRect(0, 0, 1024, 1024);
      return canvas;
    }

    const reversed = [...channelLayers].reverse();
    reversed.forEach(layer => {
      if (!layer.visible || !layer.image) return;
      ctx.globalAlpha = layer.opacity / 100;
      ctx.drawImage(layer.image, 0, 0, 1024, 1024);
    });
    return canvas;
  };

  const handleExport = async (type, format = 'png') => {
    let exportCanvas;
    
    if (type === 'unity_mask') {
      const width = 1024;
      const height = 1024;
      exportCanvas = document.createElement('canvas');
      exportCanvas.width = width;
      exportCanvas.height = height;
      const ctx = exportCanvas.getContext('2d');
      
      const metComp = await getCompositeForChannel('metallic');
      const rougComp = await getCompositeForChannel('roughness');
      const heightComp = await getCompositeForChannel('height');
      
      const metData = metComp.getContext('2d').getImageData(0, 0, width, height).data;
      const rougData = rougComp.getContext('2d').getImageData(0, 0, width, height).data;
      const heightData = heightComp.getContext('2d').getImageData(0, 0, width, height).data;
      
      const packedData = ctx.createImageData(width, height);
      for (let i = 0; i < packedData.data.length; i += 4) {
        packedData.data[i] = metData[i]; // R: Metallic
        packedData.data[i+1] = 255; // G: Occlusion (default white for now)
        packedData.data[i+2] = heightData[i]; // B: Detail (Height)
        packedData.data[i+3] = 255 - rougData[i]; // A: Smoothness (Inverted Roughness)
      }
      ctx.putImageData(packedData, 0, 0);
    } else {
      const canvas = canvasRef.current?.getCanvas();
      if (!canvas) return;
      exportCanvas = canvas;
    }

    const link = document.createElement('a');
    link.download = `dsy_${type}_${Date.now()}.${format}`;
    link.href = exportCanvas.toDataURL(`image/${format === 'jpg' ? 'jpeg' : 'png'}`);
    link.click();
  };

  // Global Drag & Drop Handler
  const handleGlobalDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const newLayer = {
            id: Date.now().toString(),
            name: file.name,
            image: img,
            visible: true,
            opacity: 100,
            blendMode: 'normal',
            intensity: 1,
            blur: 0,
            type: activeChannel === 'height' ? 'height' : 'color'
          };
          setLayers(prev => [newLayer, ...prev]);
          setActiveLayerId(newLayer.id);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  // Resize Logic
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      let newWidth = e.clientX - 16;
      if (newWidth < 150) newWidth = 150;
      if (newWidth > 600) newWidth = 600;
      setLeftPanelWidth(newWidth);
    };

    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const selectDirectory = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setStorageHandle(handle);
      alert('Directory selected for auto-save.');
    } catch (err) {
      console.error(err);
    }
  };

  const saveProject = async () => {
    if (!storageHandle) {
      alert('No storage directory selected. Selecting directory first...');
      await selectDirectory();
      return;
    }

    try {
      if (await storageHandle.queryPermission({ mode: 'readwrite' }) !== 'granted') {
        await storageHandle.requestPermission({ mode: 'readwrite' });
      }

      const date = new Date().toISOString().split('T')[0];
      const dateDir = await storageHandle.getDirectoryHandle(date, { create: true });
      
      const projectName = prompt('Enter project name:', `Project_${Date.now()}`) || `Project_${Date.now()}`;
      const projectDir = await dateDir.getDirectoryHandle(projectName, { create: true });

      const metadata = {
        name: projectName,
        date: new Date().toISOString(),
        layers: layers.map(l => ({
          id: l.id,
          name: l.name,
          visible: l.visible,
          opacity: l.opacity,
          blendMode: l.blendMode,
          type: l.type
        })),
        globalSettings
      };

      const metaFile = await projectDir.getFileHandle('project.json', { create: true });
      const writable = await metaFile.createWritable();
      await writable.write(JSON.stringify(metadata, null, 2));
      await writable.close();

      for (const layer of layers) {
        if (!layer.image) continue;
        const canvas = document.createElement('canvas');
        canvas.width = layer.image.width;
        canvas.height = layer.image.height;
        canvas.getContext('2d').drawImage(layer.image, 0, 0);
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const layerFile = await projectDir.getFileHandle(`${layer.name.replace(/[^a-z0-9]/gi, '_')}.png`, { create: true });
        const layerWritable = await layerFile.createWritable();
        await layerWritable.write(blob);
        await layerWritable.close();
      }

      alert(`Project saved to ${date}/${projectName}`);
    } catch (err) {
      console.error(err);
      alert('Save failed: ' + err.message);
    }
  };

  return (
    <div 
      className="app-container"
      onDragOver={handleDragOver}
      onDrop={handleGlobalDrop}
    >
      {/* Top Header */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        height: '60px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        zIndex: 1000,
        background: 'rgba(5, 5, 6, 0.9)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--panel-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="/Group 4 (2).png" alt="Logo" style={{ height: '28px' }} />
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }}></div>
          <button onClick={saveProject} title="Save Project" style={{ padding: '0.4rem' }}><Save size={16} /></button>
          <button onClick={selectDirectory} title="Set Storage Dir" style={{ padding: '0.4rem' }}><Folder size={16} /></button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>EXPORT</span>
          <button onClick={() => handleExport('normal')} style={{ padding: '0.4rem 0.8rem', fontSize: '0.65rem' }}>Normal</button>
          <button onClick={() => handleExport('unity_mask')} style={{ padding: '0.4rem 1rem', fontSize: '0.65rem', background: 'var(--accent)', color: '#000', border: 'none', fontWeight: '900' }}>Unity Mask</button>
          <button onClick={() => handleExport('ao')} style={{ padding: '0.4rem 0.8rem', fontSize: '0.65rem' }}>AO</button>
        </div>
      </div>

      <div style={{ display: 'flex', width: '100%', height: '100%', paddingTop: '60px', gap: '1rem' }}>
        {/* Channel Selector Sidebar (Narrow) */}
        <div className="glass-panel" style={{ 
          width: '60px', 
          height: '100%', 
          alignItems: 'center', 
          padding: '1.5rem 0',
          gap: '1.5rem',
          background: 'rgba(5, 5, 6, 0.95)',
          zIndex: 100
        }}>
          {['height', 'metallic', 'roughness'].map(ch => (
            <button 
              key={ch}
              onClick={() => { setActiveChannel(ch); setActiveLayerId(null); }}
              title={ch.toUpperCase()}
              style={{
                width: '40px',
                height: '40px',
                padding: 0,
                borderRadius: '12px',
                background: activeChannel === ch ? 'var(--accent)' : 'transparent',
                color: activeChannel === ch ? '#000' : 'rgba(255,255,255,0.4)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.6rem',
                fontWeight: 'bold'
              }}
            >
              {ch.slice(0, 1).toUpperCase()}
            </button>
          ))}
        </div>

        {isSidebarCollapsed && (
          <button 
            onClick={() => setIsSidebarCollapsed(false)}
            className="glass-panel"
            style={{
              position: 'absolute',
              top: '50%',
              left: '5rem',
              transform: 'translateY(-50%)',
              zIndex: 200,
              padding: '1.2rem 0.6rem',
              borderRadius: '16px',
              background: 'var(--panel-bg)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 0 30px rgba(0,0,0,0.8)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}
          >
            <ChevronRight size={20} />
            <span style={{ writingMode: 'vertical-rl', fontSize: '0.6rem', letterSpacing: '2px', opacity: 0.6 }}>LAYERS</span>
          </button>
        )}

        <div 
          className="glass-panel left-panel" 
          style={{ 
            width: isSidebarCollapsed ? '0px' : `${leftPanelWidth}px`,
            minWidth: isSidebarCollapsed ? '0px' : '150px',
            padding: isSidebarCollapsed ? '0px' : '1.5rem',
            opacity: isSidebarCollapsed ? 0 : 1,
            pointerEvents: isSidebarCollapsed ? 'none' : 'auto',
          }}
        >
          <div className="header-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              <Layers size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
              {activeChannel.toUpperCase()}
            </span>
            <button 
              onClick={() => setIsSidebarCollapsed(true)} 
              style={{ padding: '4px', background: 'transparent', border: 'none' }}
            >
              <ChevronLeft size={18} />
            </button>
          </div>
          
          <LayerManager 
            layers={layers} 
            setLayers={setLayers} 
            activeLayerId={activeLayerId} 
            setActiveLayerId={setActiveLayerId} 
          />
        </div>

        {!isSidebarCollapsed && (
          <div 
            className={`resizer ${isResizing ? 'active' : ''}`} 
            onMouseDown={() => setIsResizing(true)}
          />
        )}

        <div className="center-panel">
          <div style={{ position: 'relative', flex: 1, width: '100%', display: 'flex', justifyContent: 'center' }}>
            {/* Vertical Viewport Controls */}
            <div style={{ 
              position: 'absolute', 
              top: '50%', 
              right: '20px', 
              transform: 'translateY(-50%)', 
              zIndex: 100, 
              display: 'flex', 
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div className="glass-panel" style={{ 
                padding: '6px', 
                borderRadius: '30px', 
                gap: '6px', 
                background: 'rgba(5, 5, 6, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                {['normal', 'displacement', 'ao', 'metallic', 'roughness'].map(mode => (
                  <button 
                    key={mode}
                    onClick={() => setViewportMode(mode)} 
                    title={mode.toUpperCase()}
                    style={{ 
                      width: '40px',
                      height: '40px',
                      padding: 0,
                      fontSize: '0.55rem',
                      background: viewportMode === mode ? 'var(--accent)' : 'transparent', 
                      color: viewportMode === mode ? '#000' : '',
                      border: 'none',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold'
                    }}
                  >
                    {mode.slice(0, 2).toUpperCase()}
                  </button>
                ))}
              </div>

              <button 
                className="glass-panel"
                onClick={() => setShow3D(!show3D)} 
                title={show3D ? 'View 2D' : 'View 3D'}
                style={{ 
                  width: '52px',
                  height: '52px',
                  background: show3D ? 'var(--accent)' : 'rgba(5, 5, 6, 0.8)', 
                  color: show3D ? '#000' : '', 
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
              >
                {show3D ? <Eye size={20} /> : <Box size={20} />}
                <span style={{ fontSize: '0.5rem', marginTop: '2px', fontWeight: 'bold' }}>{show3D ? '2D' : '3D'}</span>
              </button>
            </div>
            
            <div style={{ display: show3D ? 'none' : 'block', width: '100%', height: '100%' }}>
              <CanvasPreview 
                ref={canvasRef} 
                layers={layers} 
                setLayers={setLayers}
                activeLayerId={activeLayerId}
                globalSettings={globalSettings} 
                paintMode={paintMode}
                brushSettings={brushSettings}
                viewportMode={viewportMode}
                tiling={tiling}
              />
            </div>

            {show3D && (
              <div style={{ width: '100%', height: '100%', zIndex: 50 }}>
                <ThreePreview canvasRef={canvasRef} globalSettings={globalSettings} />
              </div>
            )}

            {/* Tool Dock */}
            <div className="glass-panel" style={{ 
              position: 'absolute', 
              bottom: '2rem', 
              flexDirection: 'row', 
              gap: '1.2rem', 
              padding: '0.6rem 1.2rem',
              borderRadius: '40px',
              zIndex: 100,
              alignItems: 'center',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(10, 10, 12, 0.9)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                 <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>TILING</span>
                 <input type="range" min="1" max="5" step="1" value={tiling} onChange={(e) => setTiling(parseInt(e.target.value))} style={{ width: '70px' }} />
                 <span style={{ fontSize: '0.65rem', width: '20px' }}>{tiling}x</span>
              </div>

              <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }}></div>

              <button 
                onClick={() => setPaintMode(!paintMode)} 
                style={{ 
                  background: paintMode ? 'var(--accent)' : 'transparent', 
                  color: paintMode ? '#000' : '', 
                  borderRadius: '20px',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.65rem',
                  border: paintMode ? 'none' : '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <Paintbrush size={14} /> 
                <span style={{ marginLeft: '4px' }}>{paintMode ? 'EXIT PAINT' : 'PAINT'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="glass-panel right-panel">
          <div className="header-title">
            <Settings2 size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            Settings
          </div>
          <ControlPanel 
            layers={layers}
            setLayers={setLayers}
            activeLayerId={activeLayerId}
            activeChannel={activeChannel}
            globalSettings={globalSettings}
            setGlobalSettings={setGlobalSettings}
            uiSettings={uiSettings}
            setUiSettings={setUiSettings}
            paintMode={paintMode}
            brushSettings={brushSettings}
            setBrushSettings={setBrushSettings}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
