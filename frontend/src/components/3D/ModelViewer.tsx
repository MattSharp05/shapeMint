import { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { Loader2, AlertCircle, Package, RefreshCw } from 'lucide-react';
import * as THREE from 'three';

// Always use relative URLs for API endpoints to ensure they work in both development and production
// This ensures that in production, the URLs are relative and handled by Vercel API routes
// In development, they'll be handled by Vite's dev server proxy configuration
const isProduction = import.meta.env.PROD;
const proxyBaseUrl = import.meta.env.VITE_PROXY_URL || '';

interface ModelViewerProps {
  modelUrl?: string | { modelUrl?: string };
  className?: string;
  debug?: boolean;
}

// Utility function to check if proxy server is ready
const checkProxyHealth = async (): Promise<boolean> => {
  // Skip health checks in production when VITE_PROXY_URL is undefined
  if (!import.meta.env.VITE_PROXY_URL) {
    return true;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    // Use a simple test URL to check if proxy is working
    const PROXY_HEALTH_CHECK_URL = `${import.meta.env.VITE_PROXY_URL}/api/health`;
    const response = await fetch(PROXY_HEALTH_CHECK_URL, { 
      method: 'HEAD',
      signal: controller.signal,
      mode: 'cors'
    });
    
    clearTimeout(timeoutId);
    // A 403 or 404 status means the proxy is working, but the test URL is invalid.
    return response.status === 403 || response.status === 404 || response.ok;
  } catch (error) {
    console.warn('⚠️ Proxy health check failed:', error);
    // If health check fails, assume proxy is ready (fallback)
    return true;
  }
};

// Utility function to validate URL accessibility with retry
const validateUrlWithRetry = async (url: string, maxRetries = 2): Promise<boolean> => {
  // URL is already proxied by modelService if needed
  const finalUrl = url;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(finalUrl, { 
        method: 'HEAD',
        signal: controller.signal,
        mode: 'cors',
        headers: {
          'Accept': '*/*'
        }
      });
      
      clearTimeout(timeoutId);
      return response.ok || response.status === 404; // 404 is ok for proxy validation
      
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
  const [isValidating, setIsValidating] = useState(true);
  const errorReported = useRef(false);
  const validationAttempted = useRef(false);

  // Use proxy endpoint to avoid CORS issues
  const proxiedUrl = useMemo(() => {
    if (url.includes('assets.meshy.ai') || 
        url.includes('meshy.ai') || 
        url.includes('cloudfront.net')) {
      // In both dev and production, use the /api/meshy/glb endpoint
      // In dev, proxyBaseUrl might be localhost or empty
      // In production, proxyBaseUrl is empty, making this a relative URL
      const proxyUrl = `${proxyBaseUrl}/api/meshy/glb?url=${encodeURIComponent(url)}`;
      if (debug) {
        console.log('🔗 Original URL:', url);
        console.log('🔗 Proxied URL:', proxyUrl);
        console.log('🔗 Environment:', isProduction ? 'Production' : 'Development');
      }
      return proxyUrl;
    }
    return url;
  }, [url, debug]);

  // Load the model using the proxied URL
  const { scene: gltfScene } = useGLTF(proxiedUrl);
  
  // Update scene state when GLTF loads
  useEffect(() => {
    if (gltfScene) {
      setIsValidating(false);
      onLoadComplete?.();
    }
  }, [gltfScene, onLoadComplete]);
  
  useEffect(() => {
    // Cleanup function to dispose of resources when the component unmounts
    return () => {
      if (gltfScene) {
        if (debug) console.log('🧹 Disposing of GLTF scene...');
        gltfScene.traverse((object: any) => {
          // Type guard to ensure we only operate on meshes
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }
    };
  }, [gltfScene, debug]);

  // Debug logging
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
            if (!directUrlValid) {
              throw new Error('Model file is not accessible from either proxy or direct URL');
            }
            if (debug) console.log('✅ Using direct URL as fallback');
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


  // Early returns AFTER all hooks
  if (hasErrored) {
    return null; // Return nothing if there's an error, let the parent handle it
  }

  if (isValidating || !gltfScene) {
    return null; // Still loading or validating
  }

  return <primitive object={gltfScene} key={proxiedUrl} />;
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

export function ModelViewer({ modelUrl: modelProp, className = '', debug = false }: ModelViewerProps) {
  // Handle both string URL and model object being passed
  const modelUrl = typeof modelProp === 'string' ? modelProp : modelProp?.modelUrl;
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