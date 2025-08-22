import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';

interface ModelViewerProps {
  modelUrl?: string;
  className?: string;
}

function Scene({ modelUrl }: { modelUrl?: string }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      {/* Placeholder geometry - in a real app, you'd load the actual model */}
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#8B5CF6" />
      </mesh>
    </>
  );
}

export function ModelViewer({ modelUrl, className = '' }: ModelViewerProps) {
  return (
    <div className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg ${className}`}>
      <Canvas>
        <Suspense fallback={null}>
          <Scene modelUrl={modelUrl} />
        </Suspense>
      </Canvas>
    </div>
  );
}