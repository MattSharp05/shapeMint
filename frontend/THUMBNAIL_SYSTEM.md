# Thumbnail Generation System

This document describes the automatic thumbnail generation system for 3D models in ShapeMint.

## Overview

The thumbnail system automatically generates preview images for 3D models from multiple angles, allowing users to select their preferred view or upload custom thumbnails.

## Features

- **Multi-angle Generation**: Creates thumbnails from 5 different angles (0°, 45°, 90°, 135°, isometric)
- **User Selection**: Modal interface for users to choose their preferred thumbnail
- **Custom Uploads**: Users can upload their own custom thumbnails
- **Background Processing**: Asynchronous generation to avoid blocking the UI
- **Storage Optimization**: Automatically cleans up unused angle images
- **Retroactive Processing**: Script to generate thumbnails for existing models

## Architecture

### Database Schema

```sql
-- Thumbnail management columns in generated_models table
ALTER TABLE generated_models ADD COLUMN thumbnail_url TEXT;
ALTER TABLE generated_models ADD COLUMN thumbnail_angles JSONB DEFAULT '[]';
ALTER TABLE generated_models ADD COLUMN thumbnail_selected INTEGER DEFAULT 0;
ALTER TABLE generated_models ADD COLUMN thumbnail_custom BOOLEAN DEFAULT FALSE;
ALTER TABLE generated_models ADD COLUMN thumbnail_status TEXT DEFAULT 'pending';
ALTER TABLE generated_models ADD COLUMN thumbnail_error TEXT;

-- Processing queue table
CREATE TABLE thumbnail_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES generated_models(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_message TEXT,
  processing_started_at TIMESTAMP WITH TIME ZONE
);
```

### Storage Structure

```
supabase-storage/
└── thumbnails/
    └── {model-id}/
        ├── angle-0.jpg      (front view)
        ├── angle-45.jpg     (diagonal view)
        ├── angle-90.jpg     (side view)
        ├── angle-135.jpg    (back diagonal)
        ├── angle-isometric.jpg (isometric view)
        └── custom.jpg       (user uploaded)
```

### Edge Functions

1. **`generate-thumbnail`**: Creates thumbnails from 3D models
2. **`process-thumbnail-queue`**: Background worker for processing queued models
3. **`cleanup-thumbnails`**: Removes unused angle images after selection

## Implementation Details

### Thumbnail Generation Process

1. **Model Creation**: When a model is generated, it's queued for thumbnail processing
2. **Background Processing**: The queue processor picks up pending models
3. **Multi-angle Rendering**: Creates thumbnails from 5 different camera angles
4. **Storage Upload**: Saves thumbnails to Supabase Storage
5. **Database Update**: Updates model with thumbnail URLs and status

### User Interface Flow

1. **Generation Complete**: After model generation, system polls for thumbnail completion
2. **Modal Display**: Thumbnail selector modal appears when thumbnails are ready
3. **Selection Process**: User can choose from auto-generated angles or upload custom
4. **Storage Cleanup**: Unused angles are automatically removed to save space

### Error Handling

- **Retry Logic**: Failed generations are retried up to 3 times
- **Fallback Images**: Models without thumbnails show placeholder images
- **Progress Tracking**: Users see "Generating..." status for pending thumbnails
- **Error Logging**: All errors are logged for debugging

## Usage

### For New Models

Thumbnail generation happens automatically when models are created. Users will see a modal to select their preferred thumbnail after generation completes.

### For Existing Models

Run the retroactive processing script:

```bash
npm run process-thumbnails
```

This will queue all existing models without thumbnails for processing.

### Manual Processing

To manually trigger thumbnail generation for a specific model:

```javascript
// Add to processing queue
await supabase
  .from('thumbnail_processing_queue')
  .insert({
    model_id: 'model-uuid',
    priority: 1
  });
```

## Configuration

### Thumbnail Settings

- **Resolution**: 400x200px (configurable)
- **Format**: JPEG with 85% quality
- **Angles**: 0°, 45°, 90°, 135°, isometric
- **Max File Size**: 5MB for custom uploads

### Performance Settings

- **Batch Size**: 10 models per processing batch
- **Retry Attempts**: 3 per model
- **Polling Interval**: 5 seconds for completion checks
- **Queue Priority**: New models (1), existing models (0)

## Monitoring

### Queue Status

Check the processing queue in Supabase:

```sql
SELECT status, COUNT(*) 
FROM thumbnail_processing_queue 
GROUP BY status;
```

### Model Status

Check thumbnail status for models:

```sql
SELECT 
  thumbnail_status,
  thumbnail_custom,
  COUNT(*) as count
FROM generated_models 
GROUP BY thumbnail_status, thumbnail_custom;
```

## Troubleshooting

### Common Issues

1. **Thumbnails Not Generating**
   - Check Edge Function logs in Supabase dashboard
   - Verify GLB URLs are accessible
   - Check queue processing status

2. **Storage Errors**
   - Verify Supabase Storage bucket permissions
   - Check storage quota limits
   - Ensure bucket name is 'thumbnails'

3. **Modal Not Appearing**
   - Check thumbnail_status in database
   - Verify polling is working
   - Check browser console for errors

### Debug Commands

```bash
# Check queue status
supabase functions invoke process-thumbnail-queue

# Clean up unused thumbnails
supabase functions invoke cleanup-thumbnails

# Process existing models
npm run process-thumbnails
```

## Future Enhancements

- **Quality Options**: High-quality rendering option
- **Batch Selection**: Select multiple angles at once
- **Thumbnail Editing**: Basic image editing capabilities
- **Analytics**: Track which angles are most popular
- **CDN Integration**: Faster thumbnail delivery
- **AI Enhancement**: Smart angle selection based on model type

## Security Considerations

- **File Validation**: Only image files accepted for uploads
- **Size Limits**: 5MB maximum for custom thumbnails
- **Access Control**: Thumbnails are publicly accessible but organized by model ID
- **Cleanup**: Unused files are automatically removed

## Performance Considerations

- **Async Processing**: Thumbnail generation doesn't block model creation
- **Batch Processing**: Multiple models processed efficiently
- **Storage Optimization**: Only selected angles are kept
- **Caching**: Thumbnails are cached for faster loading 