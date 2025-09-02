import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  backgroundColor?: string;
}

export interface CameraAngle {
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  label: string;
}

export const DEFAULT_CAMERA_ANGLES: CameraAngle[] = [
  {
    name: 'front',
    position: [0, 0, 3.5], // Moved closer from 5 to 3.5
    target: [0, 0, 0],
    label: 'Front View'
  },
  {
    name: 'back',
    position: [0, 0, -3.5], // Back view - opposite of front
    target: [0, 0, 0],
    label: 'Back View'
  },
  {
    name: 'isometric',
    position: [2.5, 2.5, 2.5], // Moved closer from [3, 3, 3] to [2.5, 2.5, 2.5]
    target: [0, 0, 0],
    label: 'Isometric View'
  },
  {
    name: 'side',
    position: [3.5, 0, 0], // Moved closer from 5 to 3.5
    target: [0, 0, 0],
    label: 'Side View'
  },
  {
    name: 'top',
    position: [0, 3.5, 0], // Moved closer from 5 to 3.5
    target: [0, 0, 0],
    label: 'Top View'
  },
  {
    name: 'diagonal',
    position: [2.5, 1.8, 3], // Moved closer from [3, 2, 4] to [2.5, 1.8, 3]
    target: [0, 0, 0],
    label: 'Diagonal View'
  }
];

export class ThumbnailGenerator {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private loader: GLTFLoader;

  constructor(options: ThumbnailOptions = {}) {
    // Create offscreen canvas for rendering
    const canvas = document.createElement('canvas');
    canvas.width = options.width || 400;
    canvas.height = options.height || 300;

    // Set up Three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(options.backgroundColor || '#f8fafc');

    // Set up camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.width / canvas.height,
      0.1,
      1000
    );

    // Set up renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true, // Required for canvas.toDataURL()
    });
    this.renderer.setSize(canvas.width, canvas.height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Set up loader
    this.loader = new GLTFLoader();

    // Add lighting
    this.setupLighting();
  }

  private setupLighting() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Main directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    this.scene.add(directionalLight);

    // Fill light from opposite side
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 0, -5);
    this.scene.add(fillLight);
  }

  async loadModel(modelUrl: string): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      // Use proxy endpoint to avoid CORS issues in development
      // In production, use direct URLs for model assets
      const isProduction = import.meta.env.PROD;
      let proxiedUrl;
      
      if (isProduction) {
        // In production, use direct URL
        proxiedUrl = modelUrl;
      } else {
        // In development, use proxy server
        const proxyBaseUrl = import.meta.env.VITE_PROXY_URL || '';
        proxiedUrl = `${proxyBaseUrl}/api/download?url=${encodeURIComponent(modelUrl)}`;
      }
      
      this.loader.load(
        proxiedUrl,
        (gltf) => {
          const model = gltf.scene;
          
          // Center and scale the model
          this.centerAndScaleModel(model);
          
          resolve(model);
        },
        (progress) => {
          console.log('Loading progress:', progress);
        },
        (error) => {
          console.error('Error loading model:', error);
          reject(error);
        }
      );
    });
  }

  private centerAndScaleModel(model: THREE.Object3D) {
    // Calculate bounding box
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Center the model
    model.position.sub(center);

    // Scale to fit in view (slightly reduced from 3.5 for better framing)
    const maxDimension = Math.max(size.x, size.y, size.z);
    const scale = 3.2 / maxDimension; // Reduced from 3.5 to 3.2 for better balance
    model.scale.setScalar(scale);

    // Add to scene
    this.scene.add(model);
  }

  generateThumbnail(angle: CameraAngle, quality: number = 0.8): string {
    // Position camera
    this.camera.position.set(...angle.position);
    this.camera.lookAt(...angle.target);

    // Render the scene
    this.renderer.render(this.scene, this.camera);

    // Convert to data URL
    return this.renderer.domElement.toDataURL('image/jpeg', quality);
  }

  async generateAllThumbnails(
    modelUrl: string,
    angles: CameraAngle[] = DEFAULT_CAMERA_ANGLES,
    onProgress?: (angle: string, dataUrl: string) => void
  ): Promise<{ [angleName: string]: string }> {
    try {
      console.log('🎨 Starting client-side thumbnail generation for:', modelUrl);
      
      // Load the model
      await this.loadModel(modelUrl);
      console.log('✅ Model loaded successfully');

      const thumbnails: { [angleName: string]: string } = {};

      // Generate thumbnail for each angle
      for (const angle of angles) {
        console.log(`📸 Generating thumbnail for ${angle.label}...`);
        
        const dataUrl = this.generateThumbnail(angle);
        thumbnails[angle.name] = dataUrl;
        
        // Call progress callback if provided
        if (onProgress) {
          onProgress(angle.name, dataUrl);
        }
        
        console.log(`✅ Generated ${angle.label} thumbnail`);
      }

      console.log('🎉 All thumbnails generated successfully!');
      return thumbnails;

    } catch (error) {
      console.error('❌ Error generating thumbnails:', error);
      throw error;
    }
  }

  // Upload thumbnails to Supabase Storage (optional for persistent storage)
  async uploadThumbnails(
    modelId: string,
    thumbnails: { [angleName: string]: string }
  ): Promise<{ [angleName: string]: string }> {
    const { supabase } = await import('../lib/supabase');
    const uploadedUrls: { [angleName: string]: string } = {};

    for (const [angleName, dataUrl] of Object.entries(thumbnails)) {
      try {
        // Convert data URL to blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        // Upload to Supabase Storage
        const fileName = `${modelId}/${angleName}.jpg`;
        const { data, error } = await supabase.storage
          .from('thumbnails')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (error) {
          console.error(`Failed to upload ${angleName} thumbnail:`, error);
          // Fallback to data URL if upload fails
          uploadedUrls[angleName] = dataUrl;
        } else {
          // Get public URL
          const { data: publicData } = supabase.storage
            .from('thumbnails')
            .getPublicUrl(data.path);
          
          uploadedUrls[angleName] = publicData.publicUrl;
        }
      } catch (error) {
        console.error(`Error uploading ${angleName} thumbnail:`, error);
        // Fallback to data URL
        uploadedUrls[angleName] = dataUrl;
      }
    }

    return uploadedUrls;
  }

  dispose() {
    // Clean up Three.js resources
    this.renderer.dispose();
    this.scene.clear();
  }
}
