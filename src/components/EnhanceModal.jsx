import React, { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';

export default function EnhanceModal({ layer, onClose, onApply }) {
  const [settings, setSettings] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sharpen: 0
  });

  const canvasRef = useRef(null);

  useEffect(() => {
    if (!layer || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = layer.image.width;
    canvas.height = layer.image.height;
    
    // Apply CSS filters for brightness, contrast, saturation
    ctx.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%)`;
    ctx.drawImage(layer.image, 0, 0);
    ctx.filter = 'none';

    // Simple Sharpening using convolution matrix if > 0
    if (settings.sharpen > 0) {
      applySharpen(ctx, canvas.width, canvas.height, settings.sharpen / 100);
    }
  }, [layer, settings]);

  const applySharpen = (ctx, w, h, mix) => {
    const weights = [
       0, -1,  0,
      -1,  5, -1,
       0, -1,  0
    ];
    const katet = Math.round(Math.sqrt(weights.length));
    const half = (katet * 0.5) | 0;
    const dstData = ctx.createImageData(w, h);
    const dstBuff = dstData.data;
    const srcBuff = ctx.getImageData(0, 0, w, h).data;
    const yStep = w * 4;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sy = y;
        const sx = x;
        const dstOff = (y * w + x) * 4;
        let r = 0, g = 0, b = 0, a = 0;
        for (let cy = 0; cy < katet; cy++) {
          for (let cx = 0; cx < katet; cx++) {
            const scy = sy + cy - half;
            const scx = sx + cx - half;
            if (scy >= 0 && scy < h && scx >= 0 && scx < w) {
              const srcOff = (scy * w + scx) * 4;
              const wt = weights[cy * katet + cx];
              r += srcBuff[srcOff] * wt;
              g += srcBuff[srcOff + 1] * wt;
              b += srcBuff[srcOff + 2] * wt;
              a += srcBuff[srcOff + 3] * wt;
            }
          }
        }
        dstBuff[dstOff]     = r * mix + srcBuff[dstOff] * (1 - mix);
        dstBuff[dstOff + 1] = g * mix + srcBuff[dstOff + 1] * (1 - mix);
        dstBuff[dstOff + 2] = b * mix + srcBuff[dstOff + 2] * (1 - mix);
        dstBuff[dstOff + 3] = srcBuff[dstOff + 3];
      }
    }
    ctx.putImageData(dstData, 0, 0);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const newImage = new Image();
    newImage.onload = () => {
      onApply(newImage);
    };
    newImage.src = canvas.toDataURL('image/png');
  };

  if (!layer) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="glass-panel" style={{ width: '80%', height: '80%', flexDirection: 'row', padding: '0' }}>
        
        {/* Preview Area */}
        <div style={{ flex: 1, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
          <canvas 
            ref={canvasRef} 
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>

        {/* Controls Area */}
        <div style={{ width: '300px', padding: '1.5rem', borderLeft: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Enhance Image</h2>
            <button onClick={onClose} style={{ padding: '0.2rem', background: 'transparent', border: 'none' }}>
              <X size={20} />
            </button>
          </div>

          <div className="control-group">
            <label>Brightness: {settings.brightness}%</label>
            <input type="range" min="0" max="200" value={settings.brightness} onChange={(e) => setSettings({...settings, brightness: e.target.value})} />
          </div>
          <div className="control-group">
            <label>Contrast: {settings.contrast}%</label>
            <input type="range" min="0" max="200" value={settings.contrast} onChange={(e) => setSettings({...settings, contrast: e.target.value})} />
          </div>
          <div className="control-group">
            <label>Saturation: {settings.saturation}%</label>
            <input type="range" min="0" max="200" value={settings.saturation} onChange={(e) => setSettings({...settings, saturation: e.target.value})} />
          </div>
          <div className="control-group">
            <label>Sharpen: {settings.sharpen}</label>
            <input type="range" min="0" max="100" value={settings.sharpen} onChange={(e) => setSettings({...settings, sharpen: e.target.value})} />
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem' }}>
            <button onClick={onClose} style={{ flex: 1, background: 'transparent' }}>Cancel</button>
            <button onClick={handleSave} style={{ flex: 1, background: 'var(--accent)', color: '#000' }}><Check size={16} /> Apply</button>
          </div>
        </div>

      </div>
    </div>
  );
}
