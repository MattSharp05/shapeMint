import { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { Loader2, AlertCircle, Package, RefreshCw } from 'lucide-react';
import * as THREE from 'three';

interface ModelViewerProps {
  modelUrl?: string;
  className?: string;
  debug?: boolean;
}

// Utility function to check if proxy server is ready
const checkProxyHealth = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch('http://localhost:3001/api/health', { 
      method: 'HEAD',
      signal: controller.signal,
      mode: 'cors'
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn('⚠️ Proxy health check failed:', error);
    // If health check fails, assume proxy is ready (fallback)
    return true;
  }
};

// Utility function to validate URL accessibility with retry
const validateUrlWithRetry = async (url: string, maxRetries = 2): Promise<boolean> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal,
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      if (response.ok) return true;
      
      // Wait before retry
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    } catch (error) {
      console.warn(`URL validation attempt ${attempt + 1} failed:`, error);
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  return false;
};

function Model({ url, debug = false, onLoadStart, onLoadComplete, onLoadError }: { 
  url: string; 
  debug?: boolean;
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onLoadError?: (error: string) => void;
}) {
  const [hasErrored, setHasErrored] = useState(false);
  const [scene, setScene] = useState<THREE.Object3D | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const errorReported = useRef(false);
  const validationAttempted = useRef(false);
  
  // Use proxy endpoint to avoid CORS issues
  let proxiedUrl = url;
  
  // Check if this is a Meshy URL that needs proxying
  if (url.includes('assets.meshy.ai') || url.includes('meshy.ai')) {
    proxiedUrl = `/api/meshy/glb?url=${encodeURIComponent(url)}`;
  }
  // Check if this is a Supabase storage URL that needs proxying  
  else if (url.includes('supabase.co/storage/v1/object/public/')) {
    proxiedUrl = `/api/meshy/glb?url=${encodeURIComponent(url)}`;
  }
  
  if (debug) {
    console.log('🔍 ModelViewer Debug Info:', {
      originalUrl: url,
      proxiedUrl,
      isMeshyUrl: url.includes('assets.meshy.ai') || url.includes('meshy.ai'),
      isSupabaseUrl: url.includes('supabase.co/storage/v1/object/public/')
    });
  }
  
  // Only log in debug mode
  if (debug) {
    console.log('🎮 Loading GLB:', proxiedUrl);
  }
  
  // Validate URL and proxy readiness before loading
  useEffect(() => {
    if (validationAttempted.current) return;
    validationAttempted.current = true;
    
    const validateAndLoad = async () => {
      try {
        setIsValidating(true);
        onLoadStart?.();
        
        // Check proxy health first
        const proxyReady = await checkProxyHealth();
        if (!proxyReady && debug) {
          console.warn('⚠️ Proxy health check failed, proceeding anyway...');
        }
        
        // Wait longer for proxy to be ready (increased from 1s to 2s)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Validate the URL is accessible
        const urlValid = await validateUrlWithRetry(proxiedUrl);
        if (!urlValid) {
          // Try direct URL as fallback if proxy fails
          if (proxiedUrl !== url) {
            console.warn('⚠️ Proxy URL failed, trying direct URL as fallback');
            const directUrlValid = await validateUrlWithRetry(url);
            if (directUrlValid) {
              // Update proxiedUrl to use direct URL
              proxiedUrl = url;
              if (debug) console.log('✅ Using direct URL as fallback');
            } else {
              throw new Error('Model file is not accessible from either proxy or direct URL');
            }
          } else {
            throw new Error('Model file is not accessible or server is not ready');
          }
        }
        
        setIsValidating(false);
        if (debug) console.log('✅ URL validation successful');
        
      } catch (error) {
        console.error('❌ Model validation failed:', error);
        setIsValidating(false);
        setHasErrored(true);
        errorReported.current = true;
        onLoadError?.(error instanceof Error ? error.message : 'Failed to validate model URL');
      }
    };
    
    validateAndLoad();
  }, [url, proxiedUrl, debug, onLoadStart, onLoadError]);

  // Reset error state on URL change
  useEffect(() => {
    setHasErrored(false);
    setScene(null);
    errorReported.current = false;
    validationAttempted.current = false;
    setIsValidating(true); // Reset validation state
  }, [url]);

  // Handle errors from useGLTF hook and other global errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error && !errorReported.current) {
        if (debug) console.error('❌ Model loading error caught:', event.error);
        setHasErrored(true);
        errorReported.current = true;
        onLoadError?.(event.error.message || 'Failed to load 3D model');
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && !errorReported.current) {
        if (debug) console.error('❌ Model loading promise rejection:', event.reason);
        setHasErrored(true);
        errorReported.current = true;
        onLoadError?.(event.reason.message || 'Failed to load 3D model');
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [onLoadError, debug]);

  // Load the GLB model - ALWAYS call useGLTF hook (React rule)
  let gltf: any = null;
  let gltfError: string | null = null;
  
  try {
    // Always attempt to load, but handle errors gracefully
    gltf = useGLTF(proxiedUrl);
  } catch (error) {
    gltfError = error instanceof Error ? error.message : 'Failed to load GLB model';
    if (debug) console.error('❌ useGLTF synchronous error:', error);
  }

  // Handle successful load
  useEffect(() => {
    if (gltf?.scene && !hasErrored && !gltfError && !errorReported.current) {
      if (debug) console.log('✅ GLB loaded successfully');
      setScene(gltf.scene);
      onLoadComplete?.();
    }
  }, [gltf, hasErrored, gltfError, debug, onLoadComplete]);

  // Handle GLTF errors
  useEffect(() => {
    if (gltfError && !errorReported.current && !isValidating) {
      console.error('❌ Model loading failed:', gltfError);
      setHasErrored(true);
      errorReported.current = true;
      onLoadError?.(gltfError);
    }
  }, [gltfError, onLoadError, isValidating]);

  // Early returns AFTER all hooks
  if (hasErrored || gltfError) {
    return null; // Return nothing if there's an error, let the parent handle it
  }

  if (isValidating || !scene) {
    return null; // Still loading or validating
  }

  return <primitive object={scene} key={proxiedUrl} />;
}

function Scene({ modelUrl, debug = false, onLoadStart, onLoadComplete, onLoadError }: { 
  modelUrl?: string; 
  debug?: boolean;
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onLoadError?: (error: string) => void;
}) {
  if (debug) console.log('🎬 Scene rendering with modelUrl:', modelUrl);
  
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      {modelUrl ? (
        <Model 
          url={modelUrl} 
          debug={debug} 
          onLoadStart={onLoadStart}
          onLoadComplete={onLoadComplete}
          onLoadError={onLoadError}
        />
      ) : null}
    </>
  );
}

export function ModelViewer({ modelUrl, className = '', debug = false }: ModelViewerProps) {
  const [loadingState, setLoadingState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [retryKey, setRetryKey] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

  useEffect(() => {
    if (modelUrl) {
      setLoadingState('loading');
      setErrorMessage('');
    } else {
      setLoadingState('idle');
    }
  }, [modelUrl, retryKey]);

  const handleLoadStart = () => {
    setLoadingState('loading');
    setErrorMessage('');
  };

  const handleLoadComplete = () => {
    setLoadingState('loaded');
    setErrorMessage('');
    setRetryCount(0); // Reset retry count on success
  };

  const handleLoadError = (error: string) => {
    setLoadingState('error');
    // Sanitize error message for production users
    const userFriendlyError = debug ? error : 'Unable to load 3D model. Please try again.';
    setErrorMessage(userFriendlyError);
  };

  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setRetryKey(prev => prev + 1);
      setLoadingState('loading');
      setErrorMessage('');
      
      if (debug) {
        console.log(`🔄 Retry attempt ${retryCount + 1}/${maxRetries}`);
      }
    }
  };

  // Only log in debug mode
  if (debug) {
    console.log('🎬 ModelViewer rendering with URL:', modelUrl, 'State:', loadingState);
  }
  
  return (
    <div className={`relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg ${className}`}>
      {/* Loading Overlay */}
      {loadingState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg z-10">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-purple-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-600 font-medium">Loading 3D Model...</p>
            <p className="text-xs text-gray-500 mt-1">
              {retryCount > 0 ? `Retry attempt ${retryCount}...` : 'This may take a few seconds'}
            </p>
            {/* Only show URL in debug mode */}
            {debug && modelUrl && (
              <p className="text-xs text-gray-400 mt-2 font-mono max-w-xs truncate">
                URL: {modelUrl.length > 50 ? modelUrl.substring(0, 50) + '...' : modelUrl}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {loadingState === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg z-10">
          <div className="text-center max-w-sm mx-auto px-4">
            <AlertCircle className="h-8 w-8 text-orange-500 mx-auto mb-3" />
            <p className="text-sm text-gray-700 font-medium mb-2">Failed to load 3D model</p>
            <p className="text-xs text-gray-500 mb-3">
              {retryCount >= maxRetries 
                ? 'The model appears to be unavailable. Please try again later.' 
                : 'The model file may be processing or temporarily unavailable.'
              }
            </p>
            
            {/* Only show retry if under max attempts */}
            {retryCount < maxRetries && (
              <button 
                onClick={handleRetry}
                className="inline-flex items-center px-3 py-1.5 text-xs bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry ({maxRetries - retryCount} left)
              </button>
            )}
            
            {/* Only show debug info in debug mode */}
            {debug && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs">
                <p className="text-red-600 font-medium">Debug Info:</p>
                <p className="text-red-500 font-mono break-all">{errorMessage}</p>
                {modelUrl && (
                  <p className="text-red-500 font-mono break-all mt-1">
                    URL: {modelUrl}
                  </p>
                )}
                <p className="text-red-500 mt-1">Retry: {retryCount}/{maxRetries}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Model State */}
      {loadingState === 'idle' && !modelUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <Package className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No 3D model available</p>
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas 
        key={retryKey} // Force re-render on retry
        className={loadingState === 'loaded' ? 'opacity-100' : 'opacity-0'}
        onCreated={() => {
          if (debug) console.log('🎨 Canvas created');
        }}
      >
        <Suspense fallback={null}>
          <Scene 
            modelUrl={modelUrl} 
            debug={debug} 
            onLoadStart={handleLoadStart}
            onLoadComplete={handleLoadComplete}
            onLoadError={handleLoadError}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}