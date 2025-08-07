import React, { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';

class ModelErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('🚨 ModelErrorBoundary caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 ModelViewer Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      console.log('🚨 ModelErrorBoundary: Rendering fallback cube due to error');
      return (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
      );
    }

    return this.props.children;
  }
}

interface ModelViewerProps {
  modelUrl?: string;
  className?: string;
}

function Model({ url }: { url: string }) {
  console.log('🎯 Model component: Loading GLB from URL:', url);
  console.log('🔍 Model component: URL type:', typeof url);
  console.log('🔍 Model component: URL length:', url?.length);
  console.log('🔍 Model component: URL starts with http:', url?.startsWith('http'));
  
  // Try direct access first, then proxy as fallback
  let proxyUrl = url;
  
  if (url?.includes('supabase.co')) {
    // First try direct access (Supabase storage might have CORS configured now)
    console.log('🔄 Model component: Trying direct Supabase storage access first');
    
    // If direct access fails, we'll fall back to proxy
    // For now, let's try direct access and see if it works
    proxyUrl = url;
    console.log('🔄 Model component: Using direct Supabase URL:', proxyUrl);
  } else if (url?.includes('meshy.ai')) {
    // Use the Meshy proxy endpoint for Meshy URLs
    proxyUrl = `http://localhost:3001/api/meshy/glb?url=${encodeURIComponent(url)}`;
    console.log('🔄 Model component: Using Meshy proxy URL:', proxyUrl);
  } else {
    console.log('🔄 Model component: Using direct URL (no proxy needed):', proxyUrl);
  }
  
  try {
    console.log('🔄 Model component: Attempting to load GLB with useGLTF...');
    
    // Add error handling for useGLTF
    const gltfResult = useGLTF(proxyUrl);
    console.log('✅ Model component: GLB loaded successfully, result:', gltfResult);
    
    if (!gltfResult.scene) {
      console.error('❌ Model component: No scene in GLTF result');
      throw new Error('No scene found in GLB file');
    }
    
    return <primitive object={gltfResult.scene} />;
  } catch (error: any) {
    console.error('❌ Model component: Error loading GLB:', error);
    console.error('❌ Model component: Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    
    // If direct access failed and it's a Supabase URL, try proxy as fallback
    if (url?.includes('supabase.co') && proxyUrl === url) {
      console.log('🔄 Model component: Direct access failed, trying proxy as fallback...');
      const fallbackUrl = `http://localhost:3001/api/supabase/storage?url=${encodeURIComponent(url)}`;
      console.log('🔄 Model component: Using fallback proxy URL:', fallbackUrl);
      
      try {
        const fallbackResult = useGLTF(fallbackUrl);
        console.log('✅ Model component: GLB loaded successfully with proxy fallback:', fallbackResult);
        
        if (!fallbackResult.scene) {
          throw new Error('No scene found in GLB file (proxy fallback)');
        }
        
        return <primitive object={fallbackResult.scene} />;
      } catch (fallbackError: any) {
        console.error('❌ Model component: Proxy fallback also failed:', fallbackError);
      }
    }
    
    console.log('🔄 Model component: Returning fallback red cube');
    // Return a fallback cube if loading fails
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    );
  }
}

function Scene({ modelUrl }: { modelUrl?: string }) {
  console.log('🎬 Scene component: Rendering with modelUrl:', modelUrl);
  console.log('🔍 Scene component: modelUrl type:', typeof modelUrl);
  console.log('🔍 Scene component: modelUrl is truthy:', !!modelUrl);
  
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />
      <OrbitControls 
        enablePan={true} 
        enableZoom={true} 
        enableRotate={true}
        maxDistance={10}
        minDistance={1}
      />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      {modelUrl ? (
        <ModelErrorBoundary>
          <Suspense fallback={
            <mesh>
              <boxGeometry args={[0.3, 0.3, 0.3]} />
              <meshStandardMaterial color="#6366f1" />
            </mesh>
          }>
            <Model url={modelUrl} />
          </Suspense>
        </ModelErrorBoundary>
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
  console.log('🎨 ModelViewer: Rendering with URL:', modelUrl);
  console.log('🔍 ModelViewer: modelUrl type:', typeof modelUrl);
  console.log('🔍 ModelViewer: modelUrl is truthy:', !!modelUrl);
  console.log('🔍 ModelViewer: modelUrl length:', modelUrl?.length);
  
  if (!modelUrl) {
    console.log('⚠️ ModelViewer: No model URL provided, showing placeholder');
    return (
      <div className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <p className="text-gray-500">No model to display</p>
      </div>
    );
  }
  
  console.log('✅ ModelViewer: Rendering Canvas with modelUrl:', modelUrl);
  
  return (
    <div className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        onError={(error) => {
          console.error('🚨 Canvas error:', error);
        }}
      >
        <Suspense fallback={
          <mesh>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
        }>
          <Scene modelUrl={modelUrl} />
        </Suspense>
      </Canvas>
    </div>
  );
}