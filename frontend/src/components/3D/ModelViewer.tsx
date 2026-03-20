import { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Loader2, AlertCircle, Package, RefreshCw } from 'lucide-react';
import * as THREE from 'three';

// Always use relative URLs for API endpoints to ensure they work in both development and production
// This ensures that in production, the URLs are relative and handled by Vercel API routes
// In development, they'll be handled by Vite's dev server proxy configuration
const isProduction = import.meta.env.PROD;
const proxyBaseUrl = import.meta.env.VITE_PROXY_URL || '';

export interface ModelDimensions3D {
  width: number;   // cm
  height: number;  // cm
  depth: number;   // cm
}

interface ModelViewerProps {
  modelUrl?: string | { modelUrl?: string };
  className?: string;
  debug?: boolean;
  onDimensions?: (dims: ModelDimensions3D) => void;
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



function Model({ url, debug = false, onLoadStart, onLoadComplete, onLoadError, onDimensions }: {
  url: string;
  debug?: boolean;
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onLoadError?: (error: string) => void;
  onDimensions?: (dims: ModelDimensions3D) => void;
}) {
  const { camera } = useThree();
  const [hasErrored, setHasErrored] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const errorReported = useRef(false);
  const validationAttempted = useRef(false);

  // Resolve the model URL — try direct first, proxy as fallback for CORS issues
  const proxiedUrl = useMemo(() => {
    // Try loading directly first — Meshy CDN (CloudFront) typically allows CORS
    // Only fall back to proxy if VITE_PROXY_URL is explicitly set
    if (proxyBaseUrl && (
      url.includes('assets.meshy.ai') ||
      url.includes('meshy.ai') ||
      url.includes('cloudfront.net')
    )) {
      const proxyUrl = `${proxyBaseUrl}/api/meshy/glb?url=${encodeURIComponent(url)}`;
      if (debug) console.log('🔗 Using proxy for Meshy URL:', proxyUrl);
      return proxyUrl;
    }
    if (debug) console.log('🔗 Loading URL directly:', url);
    return url;
  }, [url, debug]);

  // Load the model using the proxied URL
  const [gltfScene, setGltfScene] = useState<THREE.Group | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);

  // Load GLTF using manual GLTFLoader in all environments
  // (useGLTF hook cannot be called inside useEffect — Rules of Hooks violation)
  useEffect(() => {
    console.log('🎮 Loading GLTF model:', proxiedUrl);
    setLoadError(null);
    setGltfScene(null);

    import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
      const loader = new GLTFLoader();
      loader.load(
        proxiedUrl,
        (gltf) => {
          console.log('✅ GLTF load successful');
          setGltfScene(gltf.scene);
        },
        undefined,
        (error) => {
          console.error('❌ GLTF load failed:', error);
          setLoadError(error as Error);
        }
      );
    }).catch(error => {
      console.error('❌ Failed to import GLTFLoader:', error);
      setLoadError(error as Error);
    });
  }, [proxiedUrl]);
  
  // Test API endpoint accessibility in production
  useEffect(() => {
    if (isProduction && proxiedUrl.includes('/api/meshy/glb')) {
      console.log('🧪 Testing API endpoint accessibility in production...');
      fetch(proxiedUrl, { method: 'HEAD' })
        .then(response => {
          console.log('🧪 API endpoint test result:', {
            status: response.status,
            statusText: response.statusText,
            url: proxiedUrl
          });
        })
        .catch(error => {
          console.error('🧪 API endpoint test failed:', error);
        });
    }
  }, [proxiedUrl, isProduction]);

  // Update scene state when GLTF loads
  useEffect(() => {
    if (gltfScene) {
      setIsValidating(false);
      onLoadComplete?.();
    } else if (loadError) {
      setIsValidating(false);
      setHasErrored(true);
      onLoadError?.(loadError.message || 'Failed to load 3D model');
    }
  }, [gltfScene, loadError, onLoadComplete, onLoadError]);

  // Auto-frame: center model and position camera to fit bounding box
  useEffect(() => {
    if (!gltfScene) return;

    const box = new THREE.Box3().setFromObject(gltfScene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Center the model at origin
    gltfScene.position.sub(center);

    // Calculate camera distance from bounding sphere
    const maxDim = Math.max(size.x, size.y, size.z);
    const perspCam = camera as THREE.PerspectiveCamera;
    const fov = perspCam.fov * (Math.PI / 180);
    const distance = maxDim / (2 * Math.tan(fov / 2)) * 1.5; // 1.5x padding

    camera.position.set(0, size.y * 0.3, distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    // Report dimensions in cm (GLB units are meters)
    if (onDimensions) {
      onDimensions({
        width: parseFloat((size.x * 100).toFixed(1)),
        height: parseFloat((size.y * 100).toFixed(1)),
        depth: parseFloat((size.z * 100).toFixed(1)),
      });
    }

    if (debug) console.log('📐 Auto-framed model:', { size, distance });
  }, [gltfScene, camera, debug, onDimensions]);

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
        
        // Skip validation in production - just let useGLTF handle it
        if (isProduction) {
          setIsValidating(false);
          if (debug) console.log('✅ Production mode - skipping validation');
          return;
        }
        
        // Only do health check in development
        const proxyReady = await checkProxyHealth();
        if (!proxyReady && debug) {
          console.warn('⚠️ Proxy health check failed, proceeding anyway...');
        }
        
        setIsValidating(false);
        if (debug) console.log('✅ Validation complete');
        
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

function Scene({ modelUrl, debug = false, onLoadStart, onLoadComplete, onLoadError, onDimensions }: {
  modelUrl?: string;
  debug?: boolean;
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onLoadError?: (error: string) => void;
  onDimensions?: (dims: ModelDimensions3D) => void;
}) {
  if (debug) console.log('🎬 Scene rendering with modelUrl:', modelUrl);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow={false} />
      <directionalLight position={[-10, 5, -5]} intensity={0.4} castShadow={false} />

      {modelUrl ? (
        <Model
          url={modelUrl}
          debug={debug}
          onLoadStart={onLoadStart}
          onLoadComplete={onLoadComplete}
          onLoadError={onLoadError}
          onDimensions={onDimensions}
        />
      ) : null}
    </>
  );
}

export function ModelViewer({ modelUrl: modelProp, className = '', debug = false, onDimensions }: ModelViewerProps) {
  // Handle both string URL and model object being passed
  const modelUrl = typeof modelProp === 'string' ? modelProp : modelProp?.modelUrl;
  
  // Debug logging to see what we're receiving
  if (debug) {
    console.log('🔍 ModelViewer received:', { 
      modelProp, 
      modelUrl, 
      type: typeof modelProp,
      environment: isProduction ? 'PRODUCTION' : 'DEVELOPMENT',
      hasProxyUrl: !!import.meta.env.VITE_PROXY_URL,
      proxyUrl: import.meta.env.VITE_PROXY_URL
    });
  }
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
            <Loader2 className="h-8 w-8 text-brand-primary animate-spin mx-auto mb-3" />
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
                className="inline-flex items-center px-3 py-1.5 text-xs bg-brand-primary text-white rounded-md hover:bg-brand-primary-dark transition-colors"
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
            onDimensions={onDimensions}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}