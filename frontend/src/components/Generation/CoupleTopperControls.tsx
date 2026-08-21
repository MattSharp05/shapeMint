import { useCallback, useState } from 'react';
import { Heart, Users, Upload, X, ChevronLeft } from 'lucide-react';
import {
  CAKE_TOPPER_POSE_PRESETS,
  CAKE_TOPPER_OUTFIT_PRESETS,
  CAKE_TOPPER_STYLE_PRESETS,
  CAKE_TOPPER_HEIGHT_PRESETS,
  CoupleToppersPreset,
  CoupleToppersPresetSelection,
} from '../../data/printTypes';

export type CoupleMode = 'single' | 'pair' | null;

interface CoupleTopperControlsProps {
  coupleMode: CoupleMode;
  setCoupleMode: (m: CoupleMode) => void;
  // Partner 1 reuses the form's primary image state so the rest of the
  // pipeline (regenerate, resume, single-mode) keeps working unchanged.
  partner1File: File | null;
  setPartner1File: (f: File | null) => void;
  partner1Preview: string | null;
  setPartner1Preview: (p: string | null) => void;
  // Partner 2 is paired-mode only.
  partner2File: File | null;
  setPartner2File: (f: File | null) => void;
  partner2Preview: string | null;
  setPartner2Preview: (p: string | null) => void;
  presets: CoupleToppersPresetSelection;
  setPresets: (p: CoupleToppersPresetSelection) => void;
}

const labelClass = 'block text-sm font-medium text-white/70 mb-1';

export function CoupleTopperControls({
  coupleMode,
  setCoupleMode,
  partner1File,
  setPartner1File,
  partner1Preview,
  setPartner1Preview,
  partner2File,
  setPartner2File,
  partner2Preview,
  setPartner2Preview,
  presets,
  setPresets,
}: CoupleTopperControlsProps) {
  // ── Mode picker ────────────────────────────────────────────────────
  if (coupleMode === null) {
    return (
      <div className="space-y-3">
        <label className={labelClass}>How do you want to upload your photos?</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ModeButton
            icon={<Heart className="h-7 w-7" />}
            title="Upload 1 image of the couple"
            subtitle="One photo with both people in it"
            onClick={() => setCoupleMode('single')}
          />
          <ModeButton
            icon={<Users className="h-7 w-7" />}
            title="Upload an image of each partner"
            subtitle="Two separate photos, we'll combine them"
            onClick={() => setCoupleMode('pair')}
          />
        </div>
      </div>
    );
  }

  // ── Upload + presets view ──────────────────────────────────────────
  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => {
          setCoupleMode(null);
          setPartner1File(null);
          setPartner1Preview(null);
          setPartner2File(null);
          setPartner2Preview(null);
        }}
        className="flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Change upload mode
      </button>

      {coupleMode === 'single' ? (
        <Dropzone
          label="Upload a photo of the couple"
          file={partner1File}
          preview={partner1Preview}
          setFile={setPartner1File}
          setPreview={setPartner1Preview}
          inputId="couple-photo"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Dropzone
            label="Partner 1"
            file={partner1File}
            preview={partner1Preview}
            setFile={setPartner1File}
            setPreview={setPartner1Preview}
            inputId="partner-1-photo"
            compact
          />
          <Dropzone
            label="Partner 2"
            file={partner2File}
            preview={partner2Preview}
            setFile={setPartner2File}
            setPreview={setPartner2Preview}
            inputId="partner-2-photo"
            compact
          />
        </div>
      )}

      {/* Preset rows — all optional, default to none */}
      <div className="space-y-4 pt-2 border-t border-white/5">
        <PresetRow
          label="Pose"
          options={CAKE_TOPPER_POSE_PRESETS}
          value={presets.pose}
          onChange={(v) => setPresets({ ...presets, pose: v })}
        />
        <PresetRow
          label="Outfits"
          options={CAKE_TOPPER_OUTFIT_PRESETS}
          value={presets.outfit}
          onChange={(v) => setPresets({ ...presets, outfit: v })}
        />
        <PresetRow
          label="Style"
          options={CAKE_TOPPER_STYLE_PRESETS}
          value={presets.style}
          onChange={(v) => setPresets({ ...presets, style: v })}
        />
        {coupleMode === 'pair' && (
          <PresetRow
            label="Heights"
            options={CAKE_TOPPER_HEIGHT_PRESETS}
            value={presets.heights}
            onChange={(v) => setPresets({ ...presets, heights: v })}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function ModeButton({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-lg border-2 border-white/10 hover:border-brand-accent/50 hover:bg-brand-accent/5 text-white/70 hover:text-brand-accent transition-all text-center"
    >
      <span className="text-white/50 group-hover:text-brand-accent transition-colors">{icon}</span>
      <span className="font-medium">{title}</span>
      <span className="text-xs text-white/40 font-normal">{subtitle}</span>
    </button>
  );
}

function Dropzone({
  label,
  file,
  preview,
  setFile,
  setPreview,
  inputId,
  compact,
}: {
  label: string;
  file: File | null;
  preview: string | null;
  setFile: (f: File | null) => void;
  setPreview: (p: string | null) => void;
  inputId: string;
  compact?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const ingestFile = useCallback(
    (f: File) => {
      if (!f.type.startsWith('image/')) return;
      setFile(f);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    },
    [setFile, setPreview],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) ingestFile(f);
    },
    [ingestFile],
  );

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-lg ${compact ? 'p-4' : 'p-6'} text-center transition-colors ${
          isDragging
            ? 'border-brand-accent/60 bg-brand-accent/10'
            : 'border-white/10 hover:border-brand-accent/30'
        }`}
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id={inputId}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) ingestFile(f);
          }}
        />
        <label htmlFor={inputId} className="cursor-pointer">
          <Upload className={`${compact ? 'h-6 w-6' : 'h-8 w-8'} text-white/50 mx-auto mb-2`} />
          <p className="text-sm text-white/50">
            {file ? file.name : 'Click to upload or drag and drop'}
          </p>
          {!compact && <p className="text-xs text-white/50 mt-1">PNG, JPG up to 10MB</p>}
        </label>
        {preview && (
          <div className="mt-4 relative">
            <img src={preview} alt="Preview" className="w-full h-auto rounded-lg" />
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/75"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PresetRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: CoupleToppersPreset[];
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div>
      <label className={labelClass}>
        {label} <span className="text-white/40 font-normal">(optional)</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value === opt.prompt;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange(selected ? undefined : opt.prompt)}
              className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                selected
                  ? 'bg-brand-accent/20 border border-brand-accent/50 text-brand-accent'
                  : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
