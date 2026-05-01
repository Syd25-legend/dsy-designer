import React from 'react';

export default function ControlPanel({ layers, setLayers, activeLayerId, activeChannel, globalSettings, setGlobalSettings, uiSettings, setUiSettings, paintMode, brushSettings, setBrushSettings }) {
  
  const activeLayer = layers.find(l => l.id === activeLayerId);

  const updateActiveLayer = (updates) => {
    if (!activeLayerId) return;
    setLayers(layers.map(l => l.id === activeLayerId ? { ...l, ...updates } : l));
  };

  const handleGlobalChange = (field, value) => {
    setUiSettings({ ...uiSettings, [field]: value });
  };

  const handleGlobalApply = () => {
    setGlobalSettings({ ...uiSettings });
  };

  const resetToDefault = () => {
    const def = {
      intensity: 1,
      level: 7.0,
      blur: 0,
      filter: 'sobel',
      invertR: false,
      invertG: false,
      invertH: false,
      metallic: 0,
      roughness: 0.5,
    };
    setUiSettings(def);
    setGlobalSettings(def);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.2rem', overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
      
      {/* Global Controls */}
      <div>
        <h3 className="section-title">Global Base Settings</h3>
        
        {activeChannel === 'height' && (
          <>
            <div className="control-group">
              <label><span>Normal Strength</span> <span>{uiSettings.intensity.toFixed(1)}x</span></label>
              <input 
                type="range" min="-10" max="10" step="0.1" 
                value={uiSettings.intensity} 
                onChange={(e) => handleGlobalChange('intensity', parseFloat(e.target.value))}
                onMouseUp={handleGlobalApply}
              />
            </div>
            <div className="control-group">
              <label><span>Height Level</span> <span>{uiSettings.level.toFixed(1)}</span></label>
              <input 
                type="range" min="0" max="20" step="0.1" 
                value={uiSettings.level} 
                onChange={(e) => handleGlobalChange('level', parseFloat(e.target.value))}
                onMouseUp={handleGlobalApply}
              />
            </div>
          </>
        )}

        {activeChannel === 'metallic' && (
          <div className="control-group">
            <label><span>Base Metallic</span> <span>{(uiSettings.metallic * 100).toFixed(0)}%</span></label>
            <input 
              type="range" min="0" max="1" step="0.01" 
              value={uiSettings.metallic} 
              onChange={(e) => handleGlobalChange('metallic', parseFloat(e.target.value))}
              onMouseUp={handleGlobalApply}
            />
          </div>
        )}

        {activeChannel === 'roughness' && (
          <div className="control-group">
            <label><span>Base Roughness</span> <span>{(uiSettings.roughness * 100).toFixed(0)}%</span></label>
            <input 
              type="range" min="0" max="1" step="0.01" 
              value={uiSettings.roughness} 
              onChange={(e) => handleGlobalChange('roughness', parseFloat(e.target.value))}
              onMouseUp={handleGlobalApply}
            />
          </div>
        )}
        
        <div className="control-group">
          <label><span>Global Blur</span> <span style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>{uiSettings.blur > 0 ? 'Blur' : 'Sharp'}</span></label>
          <input 
            type="range" min="-10" max="20" step="1" 
            value={uiSettings.blur} 
            onChange={(e) => handleGlobalChange('blur', parseFloat(e.target.value))}
            onMouseUp={handleGlobalApply}
          />
        </div>

        <button onClick={resetToDefault} style={{ width: '100%', marginTop: '0.5rem', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.6rem', border: '1px solid rgba(255,255,255,0.1)' }}>
          Reset Settings
        </button>
      </div>

      {paintMode && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid var(--panel-border)' }} />
          <div>
            <h3 className="section-title" style={{ color: 'var(--accent)' }}>Brush: {activeChannel.toUpperCase()}</h3>
            <div className="control-group">
              <label><span>Size</span> <span>{brushSettings.size}px</span></label>
              <input 
                type="range" min="1" max="200" step="1" 
                value={brushSettings.size} 
                onChange={(e) => setBrushSettings({...brushSettings, size: parseInt(e.target.value)})} 
              />
            </div>
            <div className="control-group">
              <label><span>Opacity</span> <span>{brushSettings.opacity}%</span></label>
              <input 
                type="range" min="1" max="100" step="1" 
                value={brushSettings.opacity} 
                onChange={(e) => setBrushSettings({...brushSettings, opacity: parseInt(e.target.value)})} 
              />
            </div>
            <div className="control-group">
              <label>{activeChannel.charAt(0).toUpperCase() + activeChannel.slice(1)} Value</label>
              <input 
                type="color" 
                value={brushSettings.color} 
                onChange={(e) => setBrushSettings({...brushSettings, color: e.target.value})} 
                style={{ width: '100%', height: '30px', border: 'none', background: 'transparent' }}
              />
            </div>
          </div>
        </>
      )}

      <hr style={{ border: 'none', borderTop: '1px solid var(--panel-border)' }} />

      {/* Layer specific controls */}
      <div style={{ opacity: activeLayer ? 1 : 0.4, pointerEvents: activeLayer ? 'auto' : 'none' }}>
        <h3 className="section-title">
          Layer Settings {activeLayer ? `(${activeLayer.name})` : ''}
        </h3>

        <div className="control-group">
          <label>Blend Mode</label>
          <select 
            value={activeLayer?.blendMode || 'normal'} 
            onChange={(e) => updateActiveLayer({ blendMode: e.target.value })}
          >
            <option value="normal">Normal</option>
            <option value="multiply">Multiply</option>
            <option value="screen">Screen</option>
            <option value="overlay">Overlay</option>
          </select>
        </div>

        <div className="control-group">
          <label><span>Opacity</span> <span>{activeLayer?.opacity || 0}%</span></label>
          <input 
            type="range" min="0" max="100" step="1" 
            value={activeLayer?.opacity || 0} 
            onChange={(e) => updateActiveLayer({ opacity: parseInt(e.target.value) })} 
          />
        </div>

        <div className="control-group">
          <label><span>Layer Intensity</span> <span>{activeLayer?.intensity || 0}</span></label>
          <input 
            type="range" min="0" max="5" step="0.1" 
            value={activeLayer?.intensity || 0} 
            onChange={(e) => updateActiveLayer({ intensity: parseFloat(e.target.value) })} 
          />
        </div>
      </div>
    </div>
  );
}
