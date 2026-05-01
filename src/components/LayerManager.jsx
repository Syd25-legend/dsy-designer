import React from 'react';
import { Trash2, Eye, EyeOff, Plus } from 'lucide-react';

export default function LayerManager({ layers, setLayers, activeLayerId, setActiveLayerId }) {
  
  const handleAddLayer = (e) => {
    const file = e.target.files[0];
    if (!file) return;

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
          type: 'color' // 'color' or 'height'
        };
        setLayers(prev => [newLayer, ...prev]);
        setActiveLayerId(newLayer.id);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const addBlankLayer = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#808080'; // Neutral height
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const img = new Image();
    img.onload = () => {
      const newLayer = {
        id: Date.now().toString(),
        name: `Blank Layer ${layers.length + 1}`,
        image: img,
        visible: true,
        opacity: 100,
        blendMode: 'normal',
        intensity: 1,
        blur: 0,
        type: 'height'
      };
      setLayers(prev => [newLayer, ...prev]);
      setActiveLayerId(newLayer.id);
    };
    img.src = canvas.toDataURL();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const syntheticEvent = { target: { files: e.dataTransfer.files } };
      handleAddLayer(syntheticEvent);
    }
  };

  const removeLayer = (id) => {
    setLayers(layers.filter(l => l.id !== id));
    if (activeLayerId === id) setActiveLayerId(null);
  };

  const toggleVisibility = (id) => {
    setLayers(layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button 
          onClick={addBlankLayer}
          style={{ width: '100%', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', fontSize: '0.7rem' }}
        >
          <Plus size={14} /> New Blank Map
        </button>

        <input 
          type="file" 
          id="layer-upload" 
          style={{ display: 'none' }} 
          accept="image/*"
          onChange={handleAddLayer}
        />
        <label 
          htmlFor="layer-upload"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px dashed rgba(255,255,255,0.2)',
            borderRadius: '6px',
            padding: '1rem',
            textAlign: 'center',
            cursor: 'pointer',
            fontSize: '0.7rem',
            color: 'var(--text-muted)'
          }}>
            Drag & Drop or Click
          </div>
        </label>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {layers.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2rem' }}>
            No layers added yet.
          </div>
        )}
        
        {layers.map((layer) => (
          <div 
            key={layer.id}
            onClick={() => setActiveLayerId(layer.id)}
            style={{
              padding: '0.5rem',
              background: activeLayerId === layer.id ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
              border: `1px solid ${activeLayerId === layer.id ? 'var(--accent)' : 'transparent'}`,
              borderRadius: '6px',
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}
          >
            <div onClick={(e) => { e.stopPropagation(); toggleVisibility(layer.id); }} style={{ cursor: 'pointer' }}>
              {layer.visible ? <Eye size={16} /> : <EyeOff size={16} color="var(--text-muted)" />}
            </div>
            
            <div style={{
              width: '32px',
              height: '32px',
              background: `url(${layer.image.src}) center/cover`,
              borderRadius: '4px'
            }}></div>
            
            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
              {layer.name}
            </div>
            
            <div onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }} style={{ cursor: 'pointer', color: '#ff4444' }}>
              <Trash2 size={16} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
