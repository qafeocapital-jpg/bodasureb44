import { useId, useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, Loader2, Check, RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * Reusable camera/upload component with animated overlay guides.
 * overlayType: 'rect' (ID cards), 'rect-wide' (bike photos), 'circle' (selfie)
 *
 * Uses native <label htmlFor> + sr-only <input> instead of programmatic .click()
 * on a hidden input — Chrome Android, Samsung Internet, and iOS Safari block
 * programmatic clicks on display:none inputs as non-user-gesture, so the camera
 * would never open. The label pattern forwards the tap directly to the input.
 */
export default function CameraCapture({ overlayType = 'rect', label, sublabel, onUploaded, existingUrl }) {
  const cameraInputId = useId();
  const galleryInputId = useId();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(existingUrl || null);
  const [error, setError] = useState('');

  // Sync preview when existingUrl prop changes (e.g., switching bike angles)
  useEffect(() => {
    setPreview(existingUrl || null);
  }, [existingUrl]);

  async function handleFile(file) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPreview(file_url);
      onUploaded?.(file_url);
    } catch (e) {
      setError(e.message || 'Upload failed');
    }
    setUploading(false);
  }

  const overlayClass = overlayType === 'circle'
    ? 'rounded-full'
    : overlayType === 'rect-wide'
    ? 'rounded-lg aspect-[4/3]'
    : 'rounded-lg aspect-[3/4]';

  return (
    <div className="space-y-3">
      {preview ? (
        <div className="relative">
          <img src={preview} alt={label} className={`w-full object-cover ${overlayClass} border-2 border-border`} />
          <button
            onClick={() => { setPreview(null); }}
            disabled={uploading}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-success/90 text-white rounded-full px-2 py-0.5 text-[10px] font-semibold">
            <Check className="w-3 h-3" /> Uploaded
          </div>
        </div>
      ) : (
        <div className={`relative w-full ${overlayClass} bg-muted/50 border-2 border-dashed border-primary/30 flex flex-col items-center justify-center overflow-hidden`}>
          {/* Animated pulse frame */}
          <div className={`absolute inset-3 ${overlayType === 'circle' ? 'rounded-full' : 'rounded-md'} border-2 border-primary/40 animate-pulse`} />
          <div className={`absolute inset-3 ${overlayType === 'circle' ? 'rounded-full' : 'rounded-md'} border border-primary/20 animate-ping`} style={{ animationDuration: '2s' }} />
          <div className="relative z-10 text-center px-4">
            {uploading ? (
              <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin" />
            ) : (
              <>
                <Camera className="w-8 h-8 mx-auto text-primary/60 mb-2" />
                {label && <p className="text-xs font-medium text-foreground">{label}</p>}
                {sublabel && <p className="text-[10px] text-muted-foreground mt-0.5">{sublabel}</p>}
              </>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {!preview && (
        <>
          <div className={`flex gap-2 ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
            <label
              htmlFor={cameraInputId}
              className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold cursor-pointer"
            >
              <Camera className="w-4 h-4" /> Take Photo
            </label>
            <label
              htmlFor={galleryInputId}
              className="flex items-center justify-center gap-1.5 border border-border rounded-xl py-2.5 px-4 text-sm font-semibold cursor-pointer"
            >
              <ImageIcon className="w-4 h-4" /> Gallery
            </label>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            Allow camera access when prompted, or use Gallery to upload from your phone.
          </p>
        </>
      )}

      <input
        id={cameraInputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
      />
      <input
        id={galleryInputId}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
      />
    </div>
  );
}