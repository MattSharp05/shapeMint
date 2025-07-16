import { Suspense, useEffect, useState, ErrorInfo, Component } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';

interface ModelViewerProps {
  modelUrl?: string;
  className?: string;
}

// Error Boundary for Three.js components
class ThreeErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('🚨 Error boundary caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Three.js Error Boundary caught an error:', error, errorInfo);
    // Handle Promise errors specifically
    if (error instanceof Promise) {
      console.error('🚨 Promise error in error boundary');
      error.catch((promiseError: any) => {
        console.error('🚨 Promise rejection details:', promiseError);
      });
    }
  }

  render() {
    if (this.state.hasError) {
      console.error('🚨 Rendering fallback due to error:', this.state.error);
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function LoadingBox() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#8B5CF6" />
    </mesh>
  );
}

function LoadingIndicator({ message }: { message: string }) {
  console.log('🔄 LoadingIndicator:', message);
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#FF6B6B" />
    </mesh>
  );
}

function Model({ url }: { url: string }) {
  console.log('🔄 Model component starting load for URL:', url);
  
  // Clean and validate the URL
  const cleanUrl = url.trim();
  // Add cache busting for refined models
  const isRefinedModel = cleanUrl.includes('_refined');
  const finalUrl = isRefinedModel ? `${cleanUrl}?cb=${Date.now()}` : cleanUrl;
  console.log('🧹 Processing URL:', {
    original: cleanUrl,
    final: finalUrl,
    isRefined: isRefinedModel
  });
  
  try {
    console.log('📦 Attempting useGLTF load with final URL:', finalUrl);
    // Use useGLTF from drei which handles URLs better
    const gltfResult = useGLTF(finalUrl);
    console.log('✅ useGLTF returned result:', gltfResult);
    
    // Add more detailed logging about the GLTF result
    console.log('📋 GLTF result keys:', Object.keys(gltfResult));
    console.log('📋 GLTF scenes:', gltfResult.scenes?.length || 'no scenes');
    console.log('📋 GLTF animations:', gltfResult.animations?.length || 'no animations');
    const { scene } = gltfResult;
    console.log('🎭 Extracted scene:', scene);
    console.log('🎭 Scene children count:', scene.children.length);
    console.log('🎭 Scene type:', scene.type);
    console.log('🎭 Scene userData:', scene.userData);
    
    if (!scene) {
      console.error('❌ Scene is null or undefined from GLTF result');
      console.error('❌ Full GLTF result:', JSON.stringify(gltfResult, null, 2));
      return <LoadingBox />;
    }
    
    if (scene.children.length === 0) {
      console.warn('⚠️ Scene has no children');
    }
    
    // Clone the scene to avoid sharing issues
    console.log('📋 Cloning scene...');
    const clonedScene = scene.clone();
    console.log('📋 Cloned scene:', clonedScene);
    
    // Scale the model to fit in view if it's too large or small
    console.log('📏 Calculating bounding box...');
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    console.log('📏 Model dimensions:', { x: size.x, y: size.y, z: size.z, maxDim });
    
    if (maxDim > 5) {
      const scale = 5 / maxDim;
      console.log('📏 Scaling down by factor:', scale);
      clonedScene.scale.setScalar(scale);
    } else if (maxDim < 0.1) {
      const scale = 1 / maxDim;
      console.log('📏 Scaling up by factor:', scale);
      clonedScene.scale.setScalar(scale);
    } else {
      console.log('📏 Model size is good, no scaling needed');
    }
    
    // Center the model
    console.log('🎯 Centering model...');
    const center = box.getCenter(new THREE.Vector3());
    clonedScene.position.sub(center);
    console.log('🎯 Model centered at:', clonedScene.position);
    
    console.log('🎉 Model component ready to render');
    return <primitive object={clonedScene} />;
  } catch (error) {
    console.error('💥 useGLTF failed with error:', error);
    // Handle Promise errors specifically
    if (error instanceof Promise) {
      console.error('💥 Promise error detected - async loading issue');
      error.then((resolvedError: any) => {
        console.error('💥 Promise resolved with error:', resolvedError);
      }).catch((rejectedError: any) => {
        console.error('💥 Promise rejected with error:', rejectedError);
      });
      return <LoadingBox />;
    }
    // Type guard for Error-like object
    const errObj = error as { name?: string; message?: string; stack?: string };
    console.error('💥 Error name:', errObj?.name);
    console.error('💥 Error message:', errObj?.message);
    console.error('💥 Error stack:', errObj?.stack);
    // Log more details about the error type
    if (errObj?.message?.includes('404')) {
      console.error('💥 404 Error - File not found at URL:', cleanUrl);
    } else if (errObj?.message?.includes('CORS')) {
      console.error('💥 CORS Error - Cross-origin request blocked for URL:', cleanUrl);
    } else if (errObj?.message?.includes('Invalid')) {
      console.error('💥 Invalid File Error - GLB file may be corrupted or invalid');
    } else {
      console.error('💥 Unknown error type during GLTF loading');
    }
    return <LoadingBox />;
  }
}

function Scene({ modelUrl }: { modelUrl?: string }) {
  console.log('Scene rendering with modelUrl:', modelUrl);
  
  // If no model URL, show placeholder
  if (!modelUrl) {
    console.log('No model URL provided, showing placeholder');
    return (
      <>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <LoadingBox />
      </>
    );
  }

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <Model url={modelUrl} />
    </>
  );
}

function ModelScene({ modelUrl }: { modelUrl?: string }) {
  console.log('🎬 ModelScene component called with URL:', modelUrl);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [urlStatus, setUrlStatus] = useState<string>('idle');
  
  useEffect(() => {
    console.log('🔄 ModelScene useEffect triggered with URL:', modelUrl);
    if (modelUrl) {
      console.log('✅ ModelScene: Model URL changed to:', modelUrl);
      setLoadingError(null);
      setIsLoading(true);
      setUrlStatus('testing URL...');
      
      // Validate URL format
      try {
        const urlObj = new URL(modelUrl);
        console.log('✅ URL parsed successfully:', urlObj.hostname);
        setUrlStatus(`URL valid: ${urlObj.hostname}`);
      } catch (urlError) {
        console.error('❌ Invalid URL format:', urlError);
        setLoadingError(`Invalid URL format: ${(urlError as Error).message}`);
        setIsLoading(false);
        setUrlStatus('Invalid URL format');
        return;
      }
      
      // Test if the URL is accessible
      console.log('🌐 Testing URL accessibility...');
      fetch(modelUrl, { 
        method: 'HEAD',
        mode: 'cors'
      })
        .then(response => {
          console.log('✅ Model URL accessibility test:', response.status, response.statusText);
          if (response.ok) {
            setUrlStatus(`URL accessible: ${response.status}`);
            setIsLoading(false);
            console.log('✅ URL is accessible, ready to load model');
          } else {
            setLoadingError(`Model URL not accessible: ${response.status} ${response.statusText}`);
            setUrlStatus(`URL failed: ${response.status}`);
            setIsLoading(false);
            console.log('❌ URL not accessible');
          }
        })
        .catch(error => {
          console.error('🌐 Model URL accessibility test failed:', error);
          
          // For AWS CloudFront URLs, HEAD requests might be blocked but GET still works
          if (modelUrl.includes('assets.meshy.ai') || modelUrl.includes('cloudfront')) {
            console.log('☁️ AWS CloudFront URL detected, allowing load attempt despite HEAD failure');
            setUrlStatus('CloudFront URL - attempting load');
            setIsLoading(false);
          } else if (error.message.includes('CORS')) {
            setLoadingError(`CORS error - model URL may not allow cross-origin requests`);
            setUrlStatus('CORS error');
            setIsLoading(false);
          } else {
            setLoadingError(`Model URL test failed: ${error.message}`);
            setUrlStatus(`Test failed: ${error.message}`);
            setIsLoading(false);
          }
        });
    } else {
      setUrlStatus('No URL provided');
      console.log('❌ ModelScene: No URL provided');
    }
  }, [modelUrl]);

  if (isLoading) {
    console.log('⏳ ModelScene: Still loading, showing loading indicator');
    return (
      <>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <LoadingIndicator message="Testing URL..." />
      </>
    );
  }

  if (loadingError) {
    console.error('❌ ModelScene: Loading error:', loadingError);
    return (
      <>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <LoadingIndicator message="URL Error" />
      </>
    );
  }

  console.log('🎬 ModelScene: Rendering Scene component with URL:', modelUrl);
  return <Scene modelUrl={modelUrl} />;
}

export function ModelViewer({ modelUrl, className = '' }: ModelViewerProps) {
  console.log('🏗️ ModelViewer rendering with modelUrl:', modelUrl);
  const [debugInfo, setDebugInfo] = useState<string>('Initializing...');
  
  useEffect(() => {
    console.log('🔄 ModelViewer useEffect triggered with URL:', modelUrl);
    if (modelUrl) {
      setDebugInfo('Model URL provided, analyzing...');
      
      // Check if it's a Meshy URL
      if (modelUrl.includes('assets.meshy.ai')) {
        setDebugInfo('Meshy AWS CloudFront URL detected');
        console.log('☁️ CloudFront URL detected');
      } else {
        setDebugInfo('External URL detected');
        console.log('🌐 External URL detected');
      }
      
      // Test the URL
      fetch(modelUrl, { method: 'HEAD', mode: 'cors' })
        .then(response => {
          console.log('🌐 HEAD request result:', response.status, response.statusText);
          setDebugInfo(`URL test: ${response.status} ${response.statusText}`);
        })
        .catch(error => {
          console.log('🌐 HEAD request failed:', error.message);
          if (modelUrl.includes('assets.meshy.ai')) {
            setDebugInfo('CloudFront HEAD blocked, but should work for loading');
            console.log('☁️ CloudFront HEAD blocked as expected');
          } else {
            setDebugInfo(`URL test failed: ${error.message}`);
          }
        });
    } else {
      setDebugInfo('No model URL provided');
      console.log('❌ No model URL provided');
    }
  }, [modelUrl]);
  
  console.log('🎨 Rendering Canvas with URL:', modelUrl);
  
  return (
    <div className={`relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={<LoadingIndicator message="Loading model..." />}>
          <ThreeErrorBoundary fallback={<LoadingIndicator message="Error loading model" />}>
            <ModelScene modelUrl={modelUrl} />
          </ThreeErrorBoundary>
        </Suspense>
      </Canvas>
      
      {/* Debug info */}
      <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded z-10 max-w-xs">
        <div>Status: {debugInfo}</div>
        <div>Model URL: {modelUrl ? 'Provided' : 'None'}</div>
        {modelUrl && (
          <>
            <div className="break-all">
              Domain: {new URL(modelUrl).hostname}
            </div>
            <div className="break-all">
              File: {modelUrl.split('/').pop()?.split('?')[0]}
            </div>
          </>
        )}
      </div>
    </div>
  );
}