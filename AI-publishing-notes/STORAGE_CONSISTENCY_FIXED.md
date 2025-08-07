# ShapeMint Storage Configuration - Mixed Bucket Setup

## ⚠️ REVERTED: Mixed Bucket Configuration

Due to user request, the system now uses a **mixed bucket approach**:

### Frontend Services ✅
- `storage.ts` - Uses `model-files` bucket
- `thumbnailGenerator.ts` - Uses `model-files` bucket with path `thumbnails/{modelId}/{angle}.jpg`
- `model.ts` - Uses `model-files` bucket 

### Edge Functions ⚠️ (REVERTED)
- `save-stl-to-bucket` - Uses `3d-models` bucket with path `models/{modelId}.stl`
- `obj-to-stl` - Uses `3d-models` bucket
- `generate-3d-model` - Uses `3d-models` bucket  
- `refine-model` - Uses `3d-models` bucket

### Storage Paths Convention
```
3d-models/                     # Edge Functions bucket
├── models/                    # Main 3D model files
│   ├── {taskId}.glb
│   ├── {taskId}.obj  
│   └── {taskId}.stl

model-files/                   # Frontend bucket
├── thumbnails/                # Generated thumbnails
│   └── {modelId}/
│       ├── front.jpg
│       ├── back.jpg
│       ├── isometric.jpg
│       ├── side.jpg
│       ├── top.jpg
│       └── diagonal.jpg
└── marketplace_thumbnails/    # Custom marketplace thumbnails
    └── {listingId}/
        └── custom.{ext}
```

## ⚠️ POTENTIAL ISSUES

This mixed configuration may cause:
- Bucket not found errors if `3d-models` bucket doesn't exist
- Permission issues between different buckets
- Inconsistent file storage locations

## ✅ STILL FIXED

- Frontend calls `save-stl-to-bucket` instead of non-existent `glb-to-stl`
- React performance optimizations in MarketplaceUpload
- Reduced console logging noise
