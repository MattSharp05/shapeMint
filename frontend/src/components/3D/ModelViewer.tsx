import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';

interface ModelViewerProps {
  modelUrl?: string;
  className?: string;
}

function Model({ url }: { url: string }) {
  // Use proxy endpoint to avoid CORS issues
  const proxiedUrl = `/api/meshy/glb?url=${encodeURIComponent(url)}`;
  const { scene } = useGLTF(proxiedUrl);
  return <primitive object={scene} key={proxiedUrl} />;
}

function Scene({ modelUrl }: { modelUrl?: string }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      {modelUrl ? (
        <Model url={modelUrl} />
      ) : (
        // Placeholder geometry when no model is loaded
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#8B5CF6" />
        </mesh>
      )}
    </>
  );
}

export function ModelViewer({ modelUrl, className = '' }: ModelViewerProps) {
  return (
    <div className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg ${className}`}>
      <Canvas>
        <Suspense fallback={null}>
          <Scene modelUrl={modelUrl} key={modelUrl} />
        </Suspense>
      </Canvas>
    </div>
  );
}