import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Type, X, Loader2, RotateCcw, Send, Image as ImageIcon, Settings2, Ruler } from 'lucide-react';
import { ModelViewer } from '../components/3D/ModelViewer';
import { falImageService, TransformOptions } from '../services/falImageService';
import { modelService } from '../services/modelService';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';
import type { DimensionUnit, DimensionTarget } from '../utils/modelScaler';

const DEFAULT_SYSTEM_PROMPT = `You are an expert 3D modeling assistant. Generate or transform the image according to the user's prompt, producing an output image that is optimized for conversion into a 3D-printable model.

Follow these rules strictly:
- Show the FULL object from a clear 3/4 perspective angle — no cropping, no partial views
- Place the object on a plain white or light gray background with no distractions
- Ensure the object has a SOLID, STABLE BASE that can sit flat on a surface
- Avoid thin protruding parts, delicate overhangs, or floating elements that would break when 3D printed
- Make surfaces smooth and well-defined with clear edges — avoid fuzzy or ambiguous geometry
- Use bold, solid forms over intricate filigree or fine detail
- Ensure the design is a single connected piece (no separate floating parts)
- Lighting should be even and diffuse — no harsh shadows or reflections
- The object should look like a real physical item that could exist as a solid sculpture or figurine
- Do NOT add text, watermarks, or UI elements to the image`;

const DEFAULT_MULTI_ANGLE_PROMPT = `You are generating reference views of a 3D object for multi-angle 3D reconstruction. Given the reference image of the object, generate the exact same object from the specified angle.

Rules:
- Show the EXACT same object — same shape, proportions, colors, and details
- Plain white background, no shadows, no floor
- Even, diffuse lighting from all sides
- Object should be centered and fill the frame
- Maintain consistent scale across all views
- No text, watermarks, or UI elements`;

const ANGLE_PROMPTS = [
  'Front view of this object, straight on from the front.',
  'Left side view of this object, rotated 90 degrees to show the left side.',
  'Right side view of this object, rotated 90 degrees to show the right side.',
  'Back view of this object, rotated 180 degrees to show the back.',
];

const ANGLE_LABELS = ['Front', 'Left', 'Right', 'Back'];

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

export function TestingEnv() {
  const { user } = useAuth();
  const logEndRef = useRef<HTMLDivElement>(null);

  // Input state
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState('');

  // System prompts
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [multiAnglePrompt, setMultiAnglePrompt] = useState(DEFAULT_MULTI_ANGLE_PROMPT);

  // fal.ai config
  const [falConfig, setFalConfig] = useState({
    numImages: 4,
    resolution: '1K',
    aspectRatio: '1:1',
    outputFormat: 'png',
  });

  // Meshy config
  const [meshyConfig, setMeshyConfig] = useState({
    enablePbr: true,
    artStyle: 'realistic',
  });

  // Dimensions
  const [dimensions, setDimensions] = useState({
    value: 10,
    unit: 'cm' as DimensionUnit,
    target: 'longest' as DimensionTarget,
  });

  // Pipeline state
  const [transformedImages, setTransformedImages] = useState<string[] | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [generatedModelUrl, setGeneratedModelUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'transforming' | 'generating' | 'scaling' | 'completed' | 'failed' | 'generating-angles'>('idle');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Multi-angle state
  const [multiAngleImages, setMultiAngleImages] = useState<string[] | null>(null);
  const [showAngleConfirmModal, setShowAngleConfirmModal] = useState(false);

  // Refs
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { time, message, type }]);
  }, []);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ── fal.ai: Generate Previews ──────────────────────────────────
  const handleGeneratePreviews = async () => {
    const inputPrompt = mode === 'text' ? prompt.trim() : (imagePrompt.trim() || 'Transform this image into a 3D-printable model');
    if (mode === 'text' && !inputPrompt) return;
    if (mode === 'image' && !imagePreview) return;

    setStatus('transforming');
    setTransformedImages(null);
    setSelectedImageIndex(null);
    setSelectedImageUrl(null);
    setMultiAngleImages(null);

    const options: TransformOptions = {
      systemPrompt,
      numImages: falConfig.numImages,
      resolution: falConfig.resolution,
      aspectRatio: falConfig.aspectRatio,
      outputFormat: falConfig.outputFormat,
    };

    addLog(`Sending to fal.ai — mode: ${mode}, prompt: "${inputPrompt.slice(0, 80)}..."`, 'info');
    addLog(`Config: ${JSON.stringify({ ...options, systemPrompt: `(${systemPrompt.length} chars)` })}`, 'info');

    const startTime = Date.now();

    try {
      const result = await falImageService.transformImage(
        inputPrompt,
        mode === 'image' ? imagePreview : null,
        options
      );
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      addLog(`fal.ai returned ${result.images.length} images in ${elapsed}s`, 'success');
      setTransformedImages(result.images);
      setStatus('idle');
    } catch (err: any) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      addLog(`fal.ai error after ${elapsed}s: ${err.message}`, 'error');
      setStatus('failed');
    }
  };

  // ── Multi-Angle: Generate 4 angle views ────────────────────────
  const handleGenerateMultiAngle = async () => {
    if (!selectedImageUrl) return;

    setStatus('generating-angles');
    setMultiAngleImages(null);
    addLog('Starting multi-angle generation (4 views)...', 'info');

    const startTime = Date.now();

    try {
      const promises = ANGLE_PROMPTS.map((anglePrompt, i) => {
        addLog(`Generating ${ANGLE_LABELS[i]} view...`, 'info');
        return falImageService.transformImage(
          anglePrompt,
          selectedImageUrl,
          {
            systemPrompt: multiAnglePrompt,
            numImages: 1,
            resolution: falConfig.resolution,
            aspectRatio: '1:1',
            outputFormat: 'png',
          }
        ).then(result => {
          if (result.images.length > 0) {
            addLog(`${ANGLE_LABELS[i]} view generated`, 'success');
            return result.images[0];
          }
          throw new Error(`No image returned for ${ANGLE_LABELS[i]} view`);
        });
      });
      const generatedImages = await Promise.all(promises);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      addLog(`All 4 angle views generated in ${elapsed}s`, 'success');
      setMultiAngleImages(generatedImages);
      setShowAngleConfirmModal(true);
      setStatus('idle');
    } catch (err: any) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      addLog(`Multi-angle generation failed after ${elapsed}s: ${err.message}`, 'error');
      setStatus('failed');
    }
  };

  // ── Meshy: Send single image to 3D ─────────────────────────────
  const handleSendToMeshy = async () => {
    if (!selectedImageUrl) return;

    setStatus('generating');
    setGenerationProgress(0);
    setGeneratedModelUrl(null);

    addLog(`Sending selected image to Meshy for 3D generation (image-to-3d)`, 'info');
    addLog(`Meshy config: enablePbr=${meshyConfig.enablePbr}, artStyle=${meshyConfig.artStyle}`, 'info');

    const startTime = Date.now();

    try {
      const modelData = await modelService.generate3DModel({
        type: 'image-to-3d',
        mode: 'preview',
        prompt: prompt || imagePrompt || 'Testing environment generation',
        image: selectedImageUrl,
        userId: user?.id || '00000000-0000-0000-0000-000000000000',
      });

      if (modelData.data?.status === 'processing' && modelData.data?.taskId) {
        const taskId = modelData.data.taskId;
        addLog(`Meshy task created: ${taskId} — starting polling`, 'info');
        pollMeshyStatus(taskId, startTime, 'image-to-3d');
      } else {
        addLog(`Unexpected Meshy response: ${JSON.stringify(modelData)}`, 'error');
        setStatus('failed');
      }
    } catch (err: any) {
      addLog(`Meshy generation failed: ${err.message}`, 'error');
      setStatus('failed');
    }
  };

  // ── Meshy: Send multi-image to 3D ──────────────────────────────
  const handleSendToMeshyMulti = async (imageUrls: string[]) => {
    setShowAngleConfirmModal(false);
    setStatus('generating');
    setGenerationProgress(0);
    setGeneratedModelUrl(null);

    addLog(`Sending ${imageUrls.length} angle images to Meshy (multi-image-to-3d)`, 'info');
    addLog(`Meshy config: enablePbr=${meshyConfig.enablePbr}`, 'info');

    const startTime = Date.now();

    try {
      const modelData = await modelService.generate3DModel({
        type: 'multi-image-to-3d',
        mode: 'preview',
        prompt: prompt || imagePrompt || 'Multi-angle 3D generation',
        image: imageUrls,
        userId: user?.id || '00000000-0000-0000-0000-000000000000',
      });

      if (modelData.data?.status === 'processing' && modelData.data?.taskId) {
        const taskId = modelData.data.taskId;
        addLog(`Meshy multi-image task created: ${taskId} — starting polling`, 'info');
        pollMeshyStatus(taskId, startTime, 'multi-image-to-3d');
      } else {
        addLog(`Unexpected Meshy response: ${JSON.stringify(modelData)}`, 'error');
        setStatus('failed');
      }
    } catch (err: any) {
      addLog(`Meshy multi-image generation failed: ${err.message}`, 'error');
      setStatus('failed');
    }
  };

  const pollMeshyStatus = (taskId: string, startTime: number, type: 'image-to-3d' | 'multi-image-to-3d') => {
    let attempts = 0;
    const maxAttempts = 60;

    const check = async () => {
      if (attempts >= maxAttempts) {
        addLog(`Polling timeout after ${maxAttempts} attempts`, 'error');
        setStatus('failed');
        if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
        return;
      }

      try {
        const res = await modelService.checkModelStatus(taskId, type);
        attempts++;

        if (res?.status === 'completed') {
          if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          addLog(`Meshy completed in ${elapsed}s — model URL: ${res.model_url?.slice(0, 80)}...`, 'success');

          let finalUrl = res.model_url;

          // Apply scaling if dimensions specified
          if (dimensions.value > 0 && res.model_url) {
            setStatus('scaling');
            addLog(`Scaling model: ${dimensions.value}${dimensions.unit} ${dimensions.target}`, 'info');
            try {
              const { data, error } = await supabase.functions.invoke('scale-model', {
                body: {
                  glbUrl: res.model_url,
                  modelId: taskId,
                  userId: user?.id || '00000000-0000-0000-0000-000000000000',
                  targetValue: dimensions.value,
                  unit: dimensions.unit,
                  target: dimensions.target,
                },
              });
              if (data?.success) {
                finalUrl = data.data.scaledUrl;
                addLog(`Scaling complete — ${JSON.stringify(data.data.finalDimensions)}`, 'success');
              } else {
                addLog(`Scaling failed: ${data?.error || error?.message} — using original`, 'error');
              }
            } catch (scaleErr: any) {
              addLog(`Scaling error: ${scaleErr.message} — using original`, 'error');
            }
          }

          setGeneratedModelUrl(finalUrl);
          setStatus('completed');
        } else if (res?.status === 'failed') {
          if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
          addLog(`Meshy generation failed: ${res.error || 'Unknown error'}`, 'error');
          setStatus('failed');
        } else if (res?.status === 'processing') {
          const progress = typeof res.progress === 'number' ? res.progress : 0;
          setGenerationProgress(progress);
          if (attempts % 3 === 0) {
            addLog(`Meshy progress: ${progress}% (attempt ${attempts})`, 'info');
          }
        }
      } catch (err: any) {
        addLog(`Polling error: ${err.message}`, 'error');
        attempts++;
      }
    };

    // First check immediately
    check();
    pollingRef.current = setInterval(check, 10000);
  };

  // ── Clear all ──────────────────────────────────────────────────
  const handleClearAll = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    setPrompt('');
    setImageFile(null);
    setImagePreview(null);
    setImagePrompt('');
    setTransformedImages(null);
    setSelectedImageIndex(null);
    setSelectedImageUrl(null);
    setGeneratedModelUrl(null);
    setStatus('idle');
    setGenerationProgress(0);
    setLogs([]);
    setMultiAngleImages(null);
    setShowAngleConfirmModal(false);
  };

  const isTransforming = status === 'transforming';
  const isGenerating = status === 'generating' || status === 'scaling';
  const isGeneratingAngles = status === 'generating-angles';

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-3 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <Settings2 className="h-5 w-5 text-blue-600" />
          <h1 className="text-lg font-semibold text-gray-900">Testing Environment</h1>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Pipeline Fine-Tuning</span>
        </div>
        <button onClick={handleClearAll} className="text-sm text-gray-500 hover:text-gray-900 transition-colors px-3 py-1 rounded border border-gray-300 hover:border-gray-400">
          Clear All
        </button>
      </div>

      <div className="flex h-[calc(100vh-49px)]">
        {/* ── Left Panel: Controls ── */}
        <div className="w-[420px] min-w-[420px] overflow-y-auto border-r border-gray-200 p-4 space-y-5 bg-gray-50">

          {/* Input Mode */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Input</h3>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setMode('text')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm transition-colors ${
                  mode === 'text' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-300 text-gray-500 hover:border-gray-400'
                }`}
              >
                <Type className="h-4 w-4" /> Text
              </button>
              <button
                onClick={() => setMode('image')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm transition-colors ${
                  mode === 'image' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-300 text-gray-500 hover:border-gray-400'
                }`}
              >
                <Upload className="h-4 w-4" /> Image
              </button>
            </div>

            {mode === 'text' ? (
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your 3D model..."
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
              />
            ) : (
              <div className="space-y-2">
                <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors bg-white">
                  <input type="file" onChange={handleImageChange} accept="image/*" className="hidden" id="test-image-upload" />
                  <label htmlFor="test-image-upload" className="cursor-pointer">
                    <ImageIcon className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">{imageFile ? imageFile.name : 'Click to upload image'}</p>
                  </label>
                </div>
                {imagePreview && (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full rounded-lg" />
                    <button
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Transform prompt (optional)..."
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={2}
                />
              </div>
            )}
          </section>

          {/* System Prompt */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">System Prompt</h3>
              <button
                onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-700 font-mono focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y"
              rows={8}
            />
            <p className="text-xs text-gray-400 mt-1">{systemPrompt.length} chars</p>
          </section>

          {/* fal.ai Config */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">fal.ai Config</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Images</label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={falConfig.numImages}
                  onChange={(e) => setFalConfig({ ...falConfig, numImages: Math.max(1, Math.min(4, Number(e.target.value))) })}
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Resolution</label>
                <select
                  value={falConfig.resolution}
                  onChange={(e) => setFalConfig({ ...falConfig, resolution: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="512">512</option>
                  <option value="1K">1K</option>
                  <option value="2K">2K</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Aspect Ratio</label>
                <select
                  value={falConfig.aspectRatio}
                  onChange={(e) => setFalConfig({ ...falConfig, aspectRatio: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="1:1">1:1</option>
                  <option value="16:9">16:9</option>
                  <option value="4:3">4:3</option>
                  <option value="9:16">9:16</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Format</label>
                <select
                  value={falConfig.outputFormat}
                  onChange={(e) => setFalConfig({ ...falConfig, outputFormat: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                </select>
              </div>
            </div>
          </section>

          {/* Generate Previews Button */}
          <button
            onClick={handleGeneratePreviews}
            disabled={isTransforming || (mode === 'text' ? !prompt.trim() : !imagePreview)}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isTransforming ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating Previews...</>
            ) : (
              <><ImageIcon className="h-4 w-4" /> Generate Previews</>
            )}
          </button>

          {/* Action Buttons: Single vs Multi-Angle (shown when image is selected) */}
          {selectedImageUrl && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Send to Meshy</h3>
              <button
                onClick={handleSendToMeshy}
                disabled={isGenerating || isGeneratingAngles}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating 3D ({generationProgress}%)...</>
                ) : (
                  <><Send className="h-4 w-4" /> Send Single Image → Meshy</>
                )}
              </button>
              <button
                onClick={handleGenerateMultiAngle}
                disabled={isGenerating || isGeneratingAngles}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isGeneratingAngles ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating Angle Views...</>
                ) : (
                  <><RotateCcw className="h-4 w-4" /> Generate Multi-Angle → Meshy</>
                )}
              </button>
            </section>
          )}

          {/* Progress bar during Meshy generation */}
          {isGenerating && (
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-700"
                style={{ width: `${Math.max(generationProgress, 3)}%` }}
              />
            </div>
          )}

          {/* Multi-Angle System Prompt */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Multi-Angle System Prompt</h3>
              <button
                onClick={() => setMultiAnglePrompt(DEFAULT_MULTI_ANGLE_PROMPT)}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            </div>
            <textarea
              value={multiAnglePrompt}
              onChange={(e) => setMultiAnglePrompt(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-700 font-mono focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y"
              rows={6}
            />
            <p className="text-xs text-gray-400 mt-1">{multiAnglePrompt.length} chars</p>
          </section>

          {/* Meshy Config */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Meshy Config</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={meshyConfig.enablePbr}
                  onChange={(e) => setMeshyConfig({ ...meshyConfig, enablePbr: e.target.checked })}
                  className="rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500"
                />
                Enable PBR
              </label>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Art Style</label>
                <select
                  value={meshyConfig.artStyle}
                  onChange={(e) => setMeshyConfig({ ...meshyConfig, artStyle: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="realistic">Realistic</option>
                  <option value="sculpture">Sculpture</option>
                </select>
              </div>
            </div>
          </section>

          {/* Dimensions */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Ruler className="h-3.5 w-3.5 text-gray-500" />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dimensions</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Size</label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={dimensions.value}
                  onChange={(e) => setDimensions({ ...dimensions, value: Math.max(1, Number(e.target.value)) })}
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Unit</label>
                <select
                  value={dimensions.unit}
                  onChange={(e) => setDimensions({ ...dimensions, unit: e.target.value as DimensionUnit })}
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                  <option value="inches">inches</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Target</label>
                <select
                  value={dimensions.target}
                  onChange={(e) => setDimensions({ ...dimensions, target: e.target.value as DimensionTarget })}
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="longest">Longest</option>
                  <option value="height">Height</option>
                  <option value="width">Width</option>
                  <option value="depth">Depth</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">{dimensions.target} → {dimensions.value} {dimensions.unit}</p>
          </section>
        </div>

        {/* ── Right Panel: Model Viewer + Log ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Main Viewer Area */}
          <div className="flex-1 min-h-0 relative bg-gray-100">
            {generatedModelUrl ? (
              <ModelViewer modelUrl={generatedModelUrl} className="w-full h-full" />
            ) : isTransforming ? (
              <div className="w-full h-full flex items-center justify-center p-8">
                <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto w-full">
                  {Array.from({ length: falConfig.numImages }).map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-200 rounded-xl flex items-center justify-center border border-gray-300 animate-pulse">
                      <Loader2 className="h-10 w-10 text-gray-400 animate-spin" />
                    </div>
                  ))}
                </div>
              </div>
            ) : transformedImages ? (
              <div className="w-full h-full flex items-center justify-center p-8">
                <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto w-full">
                  {transformedImages.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedImageIndex(i);
                        setSelectedImageUrl(url);
                        setMultiAngleImages(null);
                        addLog(`Selected image ${i + 1}`, 'info');
                      }}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        selectedImageIndex === i ? 'border-blue-500 ring-2 ring-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-400 hover:shadow-md'
                      }`}
                    >
                      <img src={url} alt={`Variation ${i + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-2 left-2 text-sm bg-black/60 text-white px-2 py-0.5 rounded-md font-medium">{i + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center mb-4">
                  <Settings2 className="h-8 w-8" />
                </div>
                <p className="text-sm text-gray-500">3D model will appear here</p>
                <p className="text-xs text-gray-400 mt-1">Generate previews → select image → send to Meshy</p>
              </div>
            )}

            {/* Status badge */}
            {status !== 'idle' && (
              <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium ${
                status === 'completed' ? 'bg-green-100 text-green-700' :
                status === 'failed' ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {status === 'transforming' ? 'Generating Previews...' :
                 status === 'generating' ? `Generating 3D (${generationProgress}%)` :
                 status === 'scaling' ? 'Scaling Model...' :
                 status === 'generating-angles' ? 'Generating Angle Views...' :
                 status === 'completed' ? 'Complete' : 'Failed'}
              </div>
            )}
          </div>

          {/* Selected 2D image (persists for comparison) */}
          {selectedImageUrl && (
            <div className="border-t border-gray-200 bg-white px-4 py-3 flex items-center gap-4">
              <img src={selectedImageUrl} alt="Selected" className="w-20 h-20 rounded-lg object-cover border border-gray-200" />
              <div>
                <p className="text-xs text-gray-500">Selected 2D Preview</p>
                <p className="text-xs text-gray-400 mt-0.5">Image {(selectedImageIndex ?? 0) + 1} — ready to send</p>
              </div>
            </div>
          )}

          {/* Persistent Multi-Angle Strip */}
          {multiAngleImages && (
            <div className="border-t border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Multi-Angle Views</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateMultiAngle}
                    disabled={isGenerating || isGeneratingAngles}
                    className="text-xs px-2.5 py-1 text-purple-600 hover:text-purple-700 border border-purple-300 rounded-md hover:border-purple-400 transition-colors disabled:opacity-40"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={() => handleSendToMeshyMulti(multiAngleImages)}
                    disabled={isGenerating || isGeneratingAngles}
                    className="text-xs px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium disabled:opacity-40"
                  >
                    Send Multi-Angle → Meshy
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                {multiAngleImages.map((url, i) => (
                  <div key={i} className="flex-1 space-y-1">
                    <div className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                      <img src={url} alt={ANGLE_LABELS[i]} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-[10px] text-center text-gray-500 font-medium">{ANGLE_LABELS[i]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generation Log */}
          <div className="border-t border-gray-200 bg-gray-50 h-48 min-h-[192px] overflow-y-auto px-4 py-2 font-mono text-xs">
            <div className="flex items-center justify-between mb-1 sticky top-0 bg-gray-50 py-1">
              <span className="text-gray-400 uppercase tracking-wider text-[10px]">Generation Log</span>
              <span className="text-gray-400">{logs.length} entries</span>
            </div>
            {logs.length === 0 ? (
              <p className="text-gray-400 italic">Waiting for activity...</p>
            ) : (
              logs.map((entry, i) => (
                <div key={i} className="flex gap-2 py-0.5">
                  <span className="text-gray-400 shrink-0">{entry.time}</span>
                  <span className={
                    entry.type === 'error' ? 'text-red-600' :
                    entry.type === 'success' ? 'text-green-600' :
                    'text-gray-700'
                  }>{entry.message}</span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>

      {/* ── Multi-Angle Confirmation Modal ── */}
      {showAngleConfirmModal && multiAngleImages && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Multi-Angle Views</h2>
            <p className="text-sm text-gray-500 mb-4">Review the generated angle views before sending to Meshy for 3D reconstruction.</p>

            <div className="grid grid-cols-4 gap-3 mb-6">
              {multiAngleImages.map((url, i) => (
                <div key={i} className="space-y-1">
                  <div className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <img src={url} alt={ANGLE_LABELS[i]} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-xs text-center text-gray-500 font-medium">{ANGLE_LABELS[i]}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAngleConfirmModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowAngleConfirmModal(false);
                  handleGenerateMultiAngle();
                }}
                className="px-4 py-2 text-sm text-purple-600 hover:text-purple-700 border border-purple-300 rounded-lg hover:border-purple-400 transition-colors"
              >
                Regenerate All
              </button>
              <button
                onClick={() => handleSendToMeshyMulti(multiAngleImages)}
                className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
              >
                Confirm & Send to Meshy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
