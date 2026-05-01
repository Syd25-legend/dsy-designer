import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

const RotatingModel = ({ mapUrl, modelType, metallic, roughness }) => {
  const meshRef = useRef();

  // Load texture
  const normalMap = useMemo(() => {
    if (!mapUrl) return null;
    const loader = new THREE.TextureLoader();
    const tex = loader.load(mapUrl);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, [mapUrl]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <mesh ref={meshRef}>
      {modelType === 'cube' && <boxGeometry args={[2, 2, 2]} />}
      {modelType === 'sphere' && <sphereGeometry args={[1.5, 64, 64]} />}
      {modelType === 'plane' && <planeGeometry args={[4, 4, 128, 128]} />}
      <meshStandardMaterial 
        color="#ffffff" 
        normalMap={normalMap} 
        roughness={roughness}
        metalness={metallic}
        envMapIntensity={1.5}
      />
    </mesh>
  );
};

export default function ThreePreview({ canvasRef, globalSettings }) {
  const [modelType, setModelType] = React.useState('cube');
  const [mapUrl, setMapUrl] = React.useState(null);

  // Sync canvas to texture periodically
  React.useEffect(() => {
    const updateTexture = () => {
      const canvas = canvasRef?.current?.getCanvas();
      if (canvas) {
        setMapUrl(canvas.toDataURL());
      }
    };
    
    updateTexture();
    const interval = setInterval(updateTexture, 1000);
    return () => clearInterval(interval);
  }, [canvasRef]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, display: 'flex', gap: '0.8rem' }}>
        <button onClick={() => setModelType('cube')} style={{ background: modelType === 'cube' ? 'var(--accent)' : 'rgba(0,0,0,0.5)', color: modelType === 'cube' ? '#000' : '#fff' }}>Cube</button>
        <button onClick={() => setModelType('sphere')} style={{ background: modelType === 'sphere' ? 'var(--accent)' : 'rgba(0,0,0,0.5)', color: modelType === 'sphere' ? '#000' : '#fff' }}>Sphere</button>
        <button onClick={() => setModelType('plane')} style={{ background: modelType === 'plane' ? 'var(--accent)' : 'rgba(0,0,0,0.5)', color: modelType === 'plane' ? '#000' : '#fff' }}>Plane</button>
      </div>
      
      <Canvas camera={{ position: [0, 0, 4] }}>
        <Environment preset="studio" />
        <RotatingModel 
          mapUrl={mapUrl} 
          modelType={modelType} 
          metallic={globalSettings?.metallic || 0}
          roughness={globalSettings?.roughness || 0.5}
        />
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}
