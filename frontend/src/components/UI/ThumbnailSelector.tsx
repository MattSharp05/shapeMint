import { useState, useRef } from 'react';
import { X, Upload, Trash2, Check } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';
import { supabase } from '../../supabaseClient';

interface ThumbnailSelectorProps {
  modelId: string;
  angles: { [angle: string]: string };
  selectedAngle: string;
  onSelect: (angle: string) => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
  isOpen: boolean;
  onClose: () => void;
  isCustom: boolean;
}

export function ThumbnailSelector({
  modelId,
  angles,
  selectedAngle,
  onSelect,
  onUpload,
  onRemove,
  isOpen,
  onClose,
  isCustom
}: ThumbnailSelectorProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }
      
      // Upload custom thumbnail
      const { data: uploadData, error } = await supabase.storage
        .from('thumbnails')
        .upload(`${modelId}/custom.jpg`, file, {
          contentType: file.type,
          upsert: true
        });
      
      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }
      // get a public URL we can render immediately
      const { data: pub } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(uploadData.path);
      const publicUrl = pub.publicUrl;
      
      // Update model with custom thumbnail
      const { error: updateError } = await supabase
        .from('generated_models')
        .update({
          thumbnail_url: publicUrl,
          thumbnail_custom: true
        })
        .eq('id', modelId);
      
      if (updateError) {
        throw new Error(`Failed to update model: ${updateError.message}`);
      }
      
      onUpload(file);
      
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveCustom = async () => {
    try {
      // Remove custom thumbnail from storage
      await supabase.storage
        .from('thumbnails')
        .remove([`${modelId}/custom.jpg`]);
      
      // Reset to auto-generated thumbnail
      const { error: updateError } = await supabase
        .from('generated_models')
        .update({
          thumbnail_url: angles[selectedAngle],
          thumbnail_custom: false
        })
        .eq('id', modelId);
      
      if (updateError) {
        throw new Error(`Failed to update model: ${updateError.message}`);
      }
      
      onRemove();
      
    } catch (error) {
      console.error('Remove failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Remove failed');
    }
  };

  const handleAngleSelect = async (angle: string) => {
    try {
      const { error } = await supabase
        .from('generated_models')
        .update({
          thumbnail_url: angles[angle],
          thumbnail_selected: angle,
          thumbnail_custom: false
        })
        .eq('id', modelId);
      
      if (error) {
        throw new Error(`Failed to update model: ${error.message}`);
      }
      
      onSelect(angle);
      
    } catch (error) {
      console.error('Angle selection failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Selection failed');
    }
  };

  const angleLabels: { [key: string]: string } = {
    'front': 'Front View',
    'back': 'Back View',
    'isometric': 'Isometric View',
    'side': 'Side View',
    'top': 'Top View',
    'diagonal': 'Diagonal View',
    // Legacy angle numbers for backward compatibility
    '0': 'Front View',
    '45': 'Diagonal View',
    '90': 'Side View',
    '135': 'Back Diagonal'
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Select Thumbnail for Your Model
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {uploadError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{uploadError}</p>
          </div>
        )}

        {/* Auto-generated Angles */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Auto-generated Views
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(angles).map(([angle, url]) => {
              console.log('thumb', angle, url.slice(0,50));
              return (
              <div
                key={angle}
                className={`relative cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                  selectedAngle === angle && !isCustom
                    ? 'border-brand-primary ring-2 ring-brand-light'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleAngleSelect(angle)}
              >
                <img 
                  src={typeof url === 'string' ? url : url} 
                  alt={`${angleLabels[angle] || `Angle ${angle}`}`} 
                  className="w-full h-32 object-cover"
                />
                <div className="p-2 text-center">
                  <p className="text-xs font-medium text-gray-700">
                    {angleLabels[angle] || `Angle ${angle}`}
                  </p>
                </div>
                {selectedAngle === angle && !isCustom && (
                  <div className="absolute top-2 right-2 bg-brand-primary text-white rounded-full p-1">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>

        {/* Upload Custom Thumbnail */}
        <div className="space-y-4">
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Upload Custom Thumbnail
            </h4>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
            />
            
            <div className="space-y-3">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full"
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Custom Thumbnail'}
              </Button>
              
              {isCustom && (
                <Button
                  onClick={handleRemoveCustom}
                  disabled={uploading}
                  className="w-full"
                  variant="outline"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Custom Thumbnail
                </Button>
              )}
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              Supported formats: JPG, PNG, WebP. Max size: 5MB.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <Button
            onClick={onClose}
            variant="outline"
          >
            Continue
          </Button>
        </div>
      </div>
    </Modal>
  );
} 