import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ModelViewer, ModelDimensions3D } from '../components/3D/ModelViewer';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { FadeIn, FadeInUp } from '../components/Motion';
import { supabase } from '../supabaseClient';
import { getQuote as getCraftcloudQuote, CraftcloudVendorOption } from '../services/craftcloud';
import { createOrder as createCraftcloudOrder } from '../services/craftcloudOrder';
import { Loader2, Package, Truck, MapPin, Link2, Check, ChevronRight, X, Palette, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { CRAFTCLOUD_MATERIALS, getCraftcloudMaterialConfigId } from '../data/craftcloudMaterials';
import { US_STATES } from '../types/order';

const COLOR_CONFIG_ID = 'a69b05d8-39b9-5f3e-bd47-9df42b4b84c3';
const MONO_CONFIG_ID = '6250ed03-5e96-5de8-bf06-44a13b952058';  // SLA Resin
const SLS_CONFIG_ID = '6c633df0-aca1-5b95-aaab-5c19b4e0d24f';   // SLS Nylon PA12

interface ModelData {
  id: string;
  status: string;
  prompt: string;
  glb_url: string;
  model_url: string;
  stl_url: string;
  thumbnail_url: string;
  selected_2d_preview: string;
  shipping_info: any;
  color_quotes: any;
  mono_quotes: any;
  sls_quotes: any;
  progress: number;
  user_id: string;
}

interface QuoteSet {
  vendors: CraftcloudVendorOption[];
  craftcloudPriceId: string;
  currency: string;
  loading: boolean;
  error?: string;
}

interface ShippingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
}

export function ModelResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [model, setModel] = useState<ModelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract original (colored) GLB URL from notes if available
  const getOriginalGlbUrl = (m: ModelData | null): string | null => {
    if (!m?.notes) return null;
    const match = m.notes.match(/Original:\s*(https?:\/\/\S+\.glb)/);
    return match ? match[1] : null;
  };

  // Quote state
  const [colorQuote, setColorQuote] = useState<QuoteSet>({ vendors: [], craftcloudPriceId: '', currency: 'USD', loading: false });
  const [monoQuote, setMonoQuote] = useState<QuoteSet>({ vendors: [], craftcloudPriceId: '', currency: 'USD', loading: false });
  const [slsQuote, setSlsQuote] = useState<QuoteSet>({ vendors: [], craftcloudPriceId: '', currency: 'USD', loading: false });
  const [selectedColorVendor, setSelectedColorVendor] = useState(0);
  const [selectedMonoVendor, setSelectedMonoVendor] = useState(0);
  const [selectedSlsVendor, setSelectedSlsVendor] = useState(0);

  // Vendor modal
  const [vendorModal, setVendorModal] = useState<'color' | 'mono' | 'sls' | 'custom' | null>(null);
  const [pendingVendorIdx, setPendingVendorIdx] = useState(0);

  // Order state
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [dimensions, setDimensions] = useState<ModelDimensions3D | null>(null);

  // Custom quote state
  const [customOpen, setCustomOpen] = useState(false);
  const [customMaterialId, setCustomMaterialId] = useState('');
  const [customColorId, setCustomColorId] = useState('');
  const [customFinishId, setCustomFinishId] = useState('');
  const [customQuote, setCustomQuote] = useState<QuoteSet>({ vendors: [], craftcloudPriceId: '', currency: 'USD', loading: false });
  const [selectedCustomVendor, setSelectedCustomVendor] = useState(0);

  // Shipping form
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [shippingForm, setShippingForm] = useState<ShippingFormData>({
    firstName: '', lastName: '', email: '', phone: '',
    address1: '', address2: '', city: '', state: '', postalCode: '',
  });
  const [shippingError, setShippingError] = useState<string | null>(null);

  // Load model from DB
  useEffect(() => {
    if (!id) return;
    const fetchModel = async () => {
      setLoading(true);
      const { data, error: dbError } = await supabase
        .from('generated_models')
        .select('*')
        .eq('id', id)
        .single();

      if (dbError || !data) {
        setError('Model not found.');
        setLoading(false);
        return;
      }

      setModel(data as ModelData);

      // Log all model file URLs from DB
      const originalFromNotes = data.notes?.match(/Original:\s*(https?:\/\/\S+\.glb)/)?.[1] || null;
      console.log('📂 Model loaded from DB — file URLs:', {
        glb_url: data.glb_url || '(empty)',
        model_url: data.model_url || '(empty)',
        stl_url: data.stl_url || '(empty)',
        original_from_notes: originalFromNotes || '(none)',
      });
      const viewerUrl = originalFromNotes || data.glb_url || data.model_url;
      const quoteUrl = data.glb_url || data.model_url;
      console.log('🖥️ ModelViewer will display:', viewerUrl, '— source:', originalFromNotes ? 'notes (original colored)' : data.glb_url ? 'glb_url' : 'model_url');
      console.log('💰 Quotes will use:', quoteUrl, '— column:', data.glb_url ? 'glb_url' : 'model_url');

      if (data.shipping_info) {
        setShippingForm({
          firstName: data.shipping_info.firstName || '',
          lastName: data.shipping_info.lastName || '',
          email: data.shipping_info.email || '',
          phone: data.shipping_info.phone || '',
          address1: data.shipping_info.address1 || '',
          address2: data.shipping_info.address2 || '',
          city: data.shipping_info.city || '',
          state: data.shipping_info.state || '',
          postalCode: data.shipping_info.postalCode || '',
        });
      } else if (user) {
        setShippingForm(prev => ({ ...prev, email: user.email }));
      }

      if (data.color_quotes?.vendors?.length > 0) {
        setColorQuote({ vendors: data.color_quotes.vendors, craftcloudPriceId: data.color_quotes.craftcloudPriceId, currency: data.color_quotes.currency || 'USD', loading: false });
      }
      if (data.mono_quotes?.vendors?.length > 0) {
        setMonoQuote({ vendors: data.mono_quotes.vendors, craftcloudPriceId: data.mono_quotes.craftcloudPriceId, currency: data.mono_quotes.currency || 'USD', loading: false });
      }
      if (data.sls_quotes?.vendors?.length > 0) {
        setSlsQuote({ vendors: data.sls_quotes.vendors, craftcloudPriceId: data.sls_quotes.craftcloudPriceId, currency: data.sls_quotes.currency || 'USD', loading: false });
      }

      setLoading(false);
    };
    fetchModel();
  }, [id, user]);

  // Poll if still generating
  useEffect(() => {
    if (!model || model.status === 'completed' || model.status === 'failed') return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('generated_models')
        .select('status, progress, glb_url, model_url, stl_url, shipping_info, color_quotes, mono_quotes, sls_quotes')
        .eq('id', id)
        .single();
      if (data) {
        setModel(prev => prev ? { ...prev, ...data } : prev);
        if (data.shipping_info && !shippingForm.firstName) {
          setShippingForm({
            firstName: data.shipping_info.firstName || '', lastName: data.shipping_info.lastName || '',
            email: data.shipping_info.email || '', phone: data.shipping_info.phone || '',
            address1: data.shipping_info.address1 || '', address2: data.shipping_info.address2 || '',
            city: data.shipping_info.city || '', state: data.shipping_info.state || '',
            postalCode: data.shipping_info.postalCode || '',
          });
        }
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
          if (data.color_quotes?.vendors?.length > 0) {
            setColorQuote({ vendors: data.color_quotes.vendors, craftcloudPriceId: data.color_quotes.craftcloudPriceId, currency: data.color_quotes.currency || 'USD', loading: false });
          }
          if (data.mono_quotes?.vendors?.length > 0) {
            setMonoQuote({ vendors: data.mono_quotes.vendors, craftcloudPriceId: data.mono_quotes.craftcloudPriceId, currency: data.mono_quotes.currency || 'USD', loading: false });
          }
          if (data.sls_quotes?.vendors?.length > 0) {
            setSlsQuote({ vendors: data.sls_quotes.vendors, craftcloudPriceId: data.sls_quotes.craftcloudPriceId, currency: data.sls_quotes.currency || 'USD', loading: false });
          }
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [model?.status, id, shippingForm.firstName]);

  const getShippingAddress = useCallback(() => {
    const src = model?.shipping_info || shippingForm;
    if (!src.firstName || !src.lastName || !src.address1 || !src.city || !src.state || !src.postalCode || !src.phone) return null;
    return {
      firstName: src.firstName, lastName: src.lastName,
      email: src.email || user?.email || 'user@example.com',
      address1: src.address1, city: src.city, state: src.state,
      zipCode: src.postalCode, country: 'US', phone: src.phone,
    };
  }, [model?.shipping_info, shippingForm, user?.email]);

  const fetchQuotes = useCallback(async () => {
    if (!model) return;
    const modelUrl = model.glb_url || model.model_url;
    if (!modelUrl) return;
    const addr = getShippingAddress();
    if (!addr) { setShowShippingForm(true); return; }

    console.log('💰 fetchQuotes — file being sent for quotes:', modelUrl);
    console.log('💰 fetchQuotes — source column:', model.glb_url ? 'glb_url' : 'model_url');

    // Always refetch all
    setColorQuote(prev => ({ ...prev, loading: true, error: undefined, vendors: [] }));
    setMonoQuote(prev => ({ ...prev, loading: true, error: undefined, vendors: [] }));
    setSlsQuote(prev => ({ ...prev, loading: true, error: undefined, vendors: [] }));
    setSelectedColorVendor(0);
    setSelectedMonoVendor(0);
    setSelectedSlsVendor(0);

    const [colorResult, monoResult, slsResult] = await Promise.allSettled([
      getCraftcloudQuote({ modelUrl, materialConfigId: COLOR_CONFIG_ID, quantity: 1, shippingAddress: addr }),
      getCraftcloudQuote({ modelUrl, materialConfigId: MONO_CONFIG_ID, quantity: 1, shippingAddress: addr }),
      getCraftcloudQuote({ modelUrl, materialConfigId: SLS_CONFIG_ID, quantity: 1, shippingAddress: addr }),
    ]);

    const quoteUpdate: Record<string, any> = {};

    if (colorResult.status === 'fulfilled' && colorResult.value.vendorOptions?.length > 0) {
      const q = { vendors: colorResult.value.vendorOptions, craftcloudPriceId: colorResult.value.craftcloudPriceId, currency: colorResult.value.currency || 'USD', loading: false };
      setColorQuote(q);
      quoteUpdate.color_quotes = q;
    } else {
      setColorQuote(prev => ({ ...prev, loading: false, error: colorResult.status === 'rejected' ? colorResult.reason?.message : 'No color vendors available' }));
    }

    if (monoResult.status === 'fulfilled' && monoResult.value.vendorOptions?.length > 0) {
      const q = { vendors: monoResult.value.vendorOptions, craftcloudPriceId: monoResult.value.craftcloudPriceId, currency: monoResult.value.currency || 'USD', loading: false };
      setMonoQuote(q);
      quoteUpdate.mono_quotes = q;
    } else {
      setMonoQuote(prev => ({ ...prev, loading: false, error: monoResult.status === 'rejected' ? monoResult.reason?.message : 'No mono vendors available' }));
    }

    if (slsResult.status === 'fulfilled' && slsResult.value.vendorOptions?.length > 0) {
      const q = { vendors: slsResult.value.vendorOptions, craftcloudPriceId: slsResult.value.craftcloudPriceId, currency: slsResult.value.currency || 'USD', loading: false };
      setSlsQuote(q);
      quoteUpdate.sls_quotes = q;
    } else {
      setSlsQuote(prev => ({ ...prev, loading: false, error: slsResult.status === 'rejected' ? slsResult.reason?.message : 'No SLS vendors available' }));
    }

    if (Object.keys(quoteUpdate).length > 0) {
      supabase.from('generated_models').update(quoteUpdate).eq('id', model.id)
        .then(({ error }) => { if (error) console.warn('Failed to cache quotes:', error); });
    }
  }, [model, getShippingAddress]);

  const fetchCustomQuote = useCallback(async () => {
    if (!model) return;
    const modelUrl = model.glb_url || model.model_url;
    if (!modelUrl) return;

    console.log('🎨 fetchCustomQuote — file being sent:', modelUrl);
    console.log('🎨 fetchCustomQuote — source column:', model.glb_url ? 'glb_url' : 'model_url');
    const addr = getShippingAddress();
    if (!addr) { setShowShippingForm(true); return; }

    const configId = getCraftcloudMaterialConfigId(customMaterialId, customColorId, customFinishId);
    if (!configId) { setCustomQuote(prev => ({ ...prev, error: 'Invalid material combination', loading: false })); return; }

    setCustomQuote({ vendors: [], craftcloudPriceId: '', currency: 'USD', loading: true, error: undefined });
    setSelectedCustomVendor(0);

    try {
      const result = await getCraftcloudQuote({ modelUrl, materialConfigId: configId, quantity: 1, shippingAddress: addr });
      if (result.vendorOptions?.length > 0) {
        setCustomQuote({ vendors: result.vendorOptions, craftcloudPriceId: result.craftcloudPriceId, currency: result.currency || 'USD', loading: false });
      } else {
        setCustomQuote({ vendors: [], craftcloudPriceId: '', currency: 'USD', loading: false, error: 'No vendors available for this combination' });
      }
    } catch (e: any) {
      setCustomQuote({ vendors: [], craftcloudPriceId: '', currency: 'USD', loading: false, error: e.message || 'Quote request failed' });
    }
  }, [model, getShippingAddress, customMaterialId, customColorId, customFinishId]);

  // Auto-fetch if completed with shipping but no quotes
  useEffect(() => {
    if (model?.status === 'completed' && colorQuote.vendors.length === 0 && monoQuote.vendors.length === 0 && slsQuote.vendors.length === 0 && !colorQuote.loading && !monoQuote.loading && !slsQuote.loading && !colorQuote.error && !monoQuote.error && !slsQuote.error) {
      const addr = getShippingAddress();
      if (addr) fetchQuotes();
    }
  }, [model?.status, colorQuote.vendors.length, monoQuote.vendors.length, slsQuote.vendors.length, colorQuote.loading, monoQuote.loading, slsQuote.loading, colorQuote.error, monoQuote.error, slsQuote.error, getShippingAddress, fetchQuotes]);

  const handleShippingSubmit = async () => {
    setShippingError(null);
    const addr = getShippingAddress();
    if (!addr) { setShippingError('Please fill in all required fields.'); return; }
    if (model) {
      const { error: updateError } = await supabase.from('generated_models').update({ shipping_info: shippingForm }).eq('id', model.id);
      if (!updateError) setModel(prev => prev ? { ...prev, shipping_info: shippingForm } : prev);
    }
    setShowShippingForm(false);
    fetchQuotes();
  };

  const handleOrder = async (type: 'color' | 'mono' | 'sls' | 'custom') => {
    const addr = getShippingAddress();
    if (!addr) { setShowShippingForm(true); return; }
    const quote = type === 'color' ? colorQuote : type === 'sls' ? slsQuote : type === 'custom' ? customQuote : monoQuote;
    const selectedIdx = type === 'color' ? selectedColorVendor : type === 'sls' ? selectedSlsVendor : type === 'custom' ? selectedCustomVendor : selectedMonoVendor;
    const vendor = quote.vendors[selectedIdx];
    if (!vendor || !model) return;

    setOrderLoading(true);
    setOrderError(null);
    try {
      const modelUrl = model.glb_url || model.model_url;
      const resp = await createCraftcloudOrder({
        craftcloudQuoteId: vendor.craftcloudQuoteId,
        craftcloudShippingId: vendor.craftcloudShippingId,
        craftcloudPriceId: quote.craftcloudPriceId,
        quantity: 1, shippingAddress: addr,
        successUrl: `${window.location.origin}/order-success?vendor=craftcloud`,
        cancelUrl: `${window.location.origin}/model/${model.id}?payment=cancelled`,
        priorQuote: { itemTotal: vendor.itemPrice, shippingTotal: vendor.shippingPrice, total: vendor.totalPrice },
        quoteId: quote.craftcloudPriceId, modelUrl,
      });
      window.location.href = resp.stripeCheckoutUrl;
    } catch (e: any) {
      setOrderError(e.message || 'Order failed');
      setOrderLoading(false);
    }
  };

  const inputClasses = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 text-sm";
  const selectClasses = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 text-sm [&>option]:bg-brand-dark [&>option]:text-white";

  if (loading) {
    return (
      <div className="pt-16 min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-brand-accent animate-spin mx-auto mb-4" />
          <p className="text-white/50">Loading your model...</p>
        </div>
      </div>
    );
  }

  if (error || !model) {
    return (
      <div className="pt-16 min-h-screen bg-brand-dark flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center">
          <Package className="h-10 w-10 text-white/30 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Model Not Found</h2>
          <p className="text-white/40 mb-6">{error || 'This model does not exist.'}</p>
          <Button onClick={() => navigate('/generate')} className="w-full">Create a New Model</Button>
        </Card>
      </div>
    );
  }

  if (model.status !== 'completed' && model.status !== 'failed') {
    return (
      <div className="pt-16 min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          {model.selected_2d_preview && (
            <img src={model.selected_2d_preview} alt="Preview" className="w-48 h-48 object-cover rounded-2xl mx-auto mb-6 shadow-lg" />
          )}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
              <circle cx="40" cy="40" r="36" fill="none" stroke="#EDAE49" strokeWidth="4"
                strokeDasharray={`${(model.progress || 0) * 2.26} 226`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{model.progress || 0}%</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Generating Your Model</h2>
          <p className="text-white/40 mb-4">This usually takes 2-3 minutes.</p>
        </div>
      </div>
    );
  }

  if (model.status === 'failed') {
    return (
      <div className="pt-16 min-h-screen bg-brand-dark flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-white mb-2">Generation Failed</h2>
          <p className="text-white/40 mb-6">Something went wrong. Please try again.</p>
          <Button onClick={() => navigate('/generate')} className="w-full">Try Again</Button>
        </Card>
      </div>
    );
  }

  // ── Helpers ──
  const hasShippingInfo = !!(model.shipping_info || (shippingForm.firstName && shippingForm.address1));
  const shippingSrc = model.shipping_info || shippingForm;
  const colorVendor = colorQuote.vendors[selectedColorVendor];
  const monoVendor = monoQuote.vendors[selectedMonoVendor];
  const slsVendor = slsQuote.vendors[selectedSlsVendor];
  const quotesLoading = colorQuote.loading || monoQuote.loading || slsQuote.loading;

  // Render a quote card (used for both Color and Mono)
  const renderQuoteCard = (
    type: 'color' | 'mono' | 'sls',
    label: string,
    quote: QuoteSet,
    vendor: CraftcloudVendorOption | undefined,
    icon: React.ReactNode,
    subtitle?: string,
  ) => (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <span className="text-sm font-semibold text-white">{label}</span>
            {subtitle && <p className="text-xs text-white/30">{subtitle}</p>}
          </div>
        </div>
        {quote.loading && <Loader2 className="h-4 w-4 text-brand-accent animate-spin" />}
      </div>

      {quote.error && (
        <p className="text-xs text-red-400 mb-2">{quote.error}</p>
      )}

      {vendor && !quote.loading && (
        <button
          onClick={() => { setVendorModal(type); setPendingVendorIdx(type === 'color' ? selectedColorVendor : type === 'sls' ? selectedSlsVendor : selectedMonoVendor); }}
          className="w-full text-left group"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-white">${vendor.totalPrice.toFixed(2)}</span>
              <div className="text-xs text-white/30 mt-0.5">
                ${vendor.itemPrice.toFixed(2)} print + ${vendor.shippingPrice.toFixed(2)} shipping
              </div>
              <div className="text-xs text-white/40 mt-1">
                via {vendor.vendorId} · {vendor.productionTimeFast}-{vendor.productionTimeSlow} day production
              </div>
            </div>
            <div className="flex items-center gap-1 text-white/30 group-hover:text-brand-accent transition-colors">
              <span className="text-xs">{quote.vendors.length - 1} more</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </button>
      )}

      {!vendor && !quote.loading && !quote.error && (
        <p className="text-xs text-white/30">No quotes available</p>
      )}

      {vendor && !quote.loading && (
        <button
          onClick={() => handleOrder(type)}
          disabled={orderLoading}
          className="mt-4 w-full py-3 bg-gradient-to-r from-brand-accent to-brand-accent-dark text-brand-dark text-sm font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(237,174,73,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {orderLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Order {label} Print
        </button>
      )}
    </div>
  );

  return (
    <div className="pt-16 min-h-screen bg-brand-dark">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row">
          {/* Left — Model viewer */}
          <FadeIn x={-20} duration={0.7} className="lg:w-[60%] bg-brand-dark-lighter lg:min-h-[calc(100vh-4rem)] flex flex-col items-center justify-start p-4 lg:p-8">
            <div className="w-full aspect-square max-w-[700px]">
              <ModelViewer
                modelUrl={getOriginalGlbUrl(model) || model.glb_url || model.model_url}
                className="h-full w-full rounded-2xl"
                onDimensions={setDimensions}
              />
            </div>
          </FadeIn>

          {/* Right — Sidebar */}
          <div className="lg:w-[40%] lg:h-[calc(100vh-4rem)] lg:overflow-y-auto border-l border-white/5 lg:sticky lg:top-16">
            <div className="p-6 lg:p-10 max-w-lg mx-auto">
              {/* Title */}
              <FadeIn delay={0.2} y={12}>
                <h1 className="text-2xl font-bold text-white mb-1">
                  {model.prompt || 'Your Custom Design'}
                </h1>
                <p className="text-sm text-white/30 mb-6">AI-generated 3D model</p>
              </FadeIn>

              {/* Shipping summary */}
              {hasShippingInfo && !showShippingForm && (
                <FadeInUp delay={0.25}>
                  <div className="mb-6 p-4 bg-white/5 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-white/30" />
                        <p className="text-xs font-semibold uppercase tracking-wider text-white/30">Ship to</p>
                      </div>
                      <button
                        onClick={() => setShowShippingForm(true)}
                        className="text-xs text-brand-accent hover:underline"
                      >
                        Change
                      </button>
                    </div>
                    <p className="text-sm text-white">{shippingSrc.firstName} {shippingSrc.lastName}</p>
                    <p className="text-xs text-white/40">
                      {shippingSrc.address1}, {shippingSrc.city}, {shippingSrc.state} {shippingSrc.postalCode}
                    </p>
                  </div>
                </FadeInUp>
              )}

              {/* Shipping form */}
              {showShippingForm && (
                <div className="mb-6 p-5 bg-white/5 rounded-xl border border-white/10">
                  <h3 className="text-sm font-semibold text-white mb-4">Shipping Address</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="First name" value={shippingForm.firstName}
                        onChange={(e) => setShippingForm(prev => ({ ...prev, firstName: e.target.value }))} className={inputClasses} />
                      <input type="text" placeholder="Last name" value={shippingForm.lastName}
                        onChange={(e) => setShippingForm(prev => ({ ...prev, lastName: e.target.value }))} className={inputClasses} />
                    </div>
                    <input type="email" placeholder="Email" value={shippingForm.email}
                      onChange={(e) => setShippingForm(prev => ({ ...prev, email: e.target.value }))} className={inputClasses} />
                    <input type="tel" placeholder="Phone" value={shippingForm.phone}
                      onChange={(e) => setShippingForm(prev => ({ ...prev, phone: e.target.value }))} className={inputClasses} />
                    <input type="text" placeholder="Street address" value={shippingForm.address1}
                      onChange={(e) => setShippingForm(prev => ({ ...prev, address1: e.target.value }))} className={inputClasses} />
                    <input type="text" placeholder="Apt, suite (optional)" value={shippingForm.address2}
                      onChange={(e) => setShippingForm(prev => ({ ...prev, address2: e.target.value }))} className={inputClasses} />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="City" value={shippingForm.city}
                        onChange={(e) => setShippingForm(prev => ({ ...prev, city: e.target.value }))} className={inputClasses} />
                      <select value={shippingForm.state} onChange={(e) => setShippingForm(prev => ({ ...prev, state: e.target.value }))} className={selectClasses}>
                        <option value="">State</option>
                        {US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                      </select>
                    </div>
                    <input type="text" placeholder="ZIP code" value={shippingForm.postalCode}
                      onChange={(e) => setShippingForm(prev => ({ ...prev, postalCode: e.target.value }))} className={inputClasses} />
                    {shippingError && <p className="text-sm text-red-400">{shippingError}</p>}
                    <div className="flex gap-3 pt-1">
                      <Button onClick={handleShippingSubmit} className="flex-1" size="sm">Save & Get Quotes</Button>
                      <button onClick={() => setShowShippingForm(false)} className="px-4 py-2 text-sm text-white/40 hover:text-white/70">Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {!hasShippingInfo && !showShippingForm && (
                <div className="mb-6 text-center py-4">
                  <p className="text-sm text-white/40 mb-3">Enter your shipping address to see print quotes.</p>
                  <Button onClick={() => setShowShippingForm(true)} size="sm">
                    <MapPin className="h-4 w-4 mr-1" /> Enter Shipping Address
                  </Button>
                </div>
              )}

              {/* Quote cards */}
              {(colorQuote.vendors.length > 0 || monoQuote.vendors.length > 0 || slsQuote.vendors.length > 0 || quotesLoading) && (
                <FadeInUp delay={0.3}>
                  <div className="space-y-4 mb-6">
                    {/* Color quote card */}
                    {renderQuoteCard(
                      'color',
                      'Full Color',
                      colorQuote,
                      colorVendor,
                      <div className="w-4 h-4 rounded-full shrink-0" style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }} />
                    )}

                    {/* Mono (SLA Resin) quote card */}
                    {renderQuoteCard(
                      'mono',
                      'SLA Resin',
                      monoQuote,
                      monoVendor,
                      <div className="w-4 h-4 rounded-full bg-white/80 shrink-0" />,
                      'Smooth surface, high detail'
                    )}

                    {/* SLS Nylon quote card */}
                    {renderQuoteCard(
                      'sls',
                      'SLS Nylon',
                      slsQuote,
                      slsVendor,
                      <div className="w-4 h-4 rounded-full bg-gray-400 shrink-0" />,
                      'Strong & durable, granular finish'
                    )}
                  </div>
                </FadeInUp>
              )}

              {orderError && (
                <div className="p-3 bg-red-900/20 border border-red-500/20 rounded-lg mb-4">
                  <p className="text-sm text-red-400">{orderError}</p>
                </div>
              )}

              {/* Custom Quote Builder */}
              <div className="mb-6">
                <button
                  onClick={() => setCustomOpen(!customOpen)}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-brand-accent" />
                    <span className="text-sm font-semibold text-white">Custom Quote</span>
                    <span className="text-xs text-white/30">Choose material, color & finish</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${customOpen ? 'rotate-180' : ''}`} />
                </button>

                {customOpen && (
                  <div className="mt-3 p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
                    {/* Material */}
                    <div>
                      <label className="block text-xs font-medium text-white/50 mb-1.5">Material</label>
                      <select
                        value={customMaterialId}
                        onChange={(e) => { setCustomMaterialId(e.target.value); setCustomColorId(''); setCustomFinishId(''); setCustomQuote({ vendors: [], craftcloudPriceId: '', currency: 'USD', loading: false }); }}
                        className={selectClasses}
                      >
                        <option value="">Select a material...</option>
                        {CRAFTCLOUD_MATERIALS.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      {customMaterialId && (
                        <p className="text-xs text-white/30 mt-1">
                          {CRAFTCLOUD_MATERIALS.find(m => m.id === customMaterialId)?.description}
                        </p>
                      )}
                    </div>

                    {/* Color */}
                    {customMaterialId && (() => {
                      const mat = CRAFTCLOUD_MATERIALS.find(m => m.id === customMaterialId);
                      if (!mat || mat.colors.length === 0) return null;
                      return (
                        <div>
                          <label className="block text-xs font-medium text-white/50 mb-2">Color</label>
                          <div className="flex flex-wrap gap-2">
                            {mat.colors.map(c => (
                              <button
                                key={c.id}
                                onClick={() => { setCustomColorId(c.id); setCustomQuote({ vendors: [], craftcloudPriceId: '', currency: 'USD', loading: false }); }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-xs ${
                                  customColorId === c.id
                                    ? 'border-brand-accent/50 bg-brand-accent/10'
                                    : 'border-white/10 hover:border-white/20 bg-white/5'
                                }`}
                              >
                                <div
                                  className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                                  style={{ backgroundColor: c.hex || '#888' }}
                                />
                                <span className="text-white/80">{c.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Finish */}
                    {customMaterialId && customColorId && (() => {
                      const mat = CRAFTCLOUD_MATERIALS.find(m => m.id === customMaterialId);
                      if (!mat || mat.finishes.length === 0) return null;
                      // Auto-select if only one finish
                      if (mat.finishes.length === 1 && !customFinishId) {
                        setTimeout(() => setCustomFinishId(mat.finishes[0].id), 0);
                      }
                      return (
                        <div>
                          <label className="block text-xs font-medium text-white/50 mb-2">Finish</label>
                          <div className="space-y-2">
                            {mat.finishes.map(f => (
                              <button
                                key={f.id}
                                onClick={() => { setCustomFinishId(f.id); setCustomQuote({ vendors: [], craftcloudPriceId: '', currency: 'USD', loading: false }); }}
                                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                                  customFinishId === f.id
                                    ? 'border-brand-accent/50 bg-brand-accent/10'
                                    : 'border-white/10 hover:border-white/20 bg-white/5'
                                }`}
                              >
                                <span className="text-sm font-medium text-white">{f.name}</span>
                                {f.description && <p className="text-xs text-white/30 mt-0.5">{f.description}</p>}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Get Quote button */}
                    {customMaterialId && customColorId && customFinishId && (
                      <button
                        onClick={fetchCustomQuote}
                        disabled={customQuote.loading}
                        className="w-full py-3 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {customQuote.loading ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Getting Quote...</>
                        ) : (
                          'Get Custom Quote'
                        )}
                      </button>
                    )}

                    {/* Custom quote error */}
                    {customQuote.error && (
                      <p className="text-xs text-red-400">{customQuote.error}</p>
                    )}

                    {/* Custom quote result */}
                    {customQuote.vendors.length > 0 && !customQuote.loading && (() => {
                      const vendor = customQuote.vendors[selectedCustomVendor];
                      if (!vendor) return null;
                      const mat = CRAFTCLOUD_MATERIALS.find(m => m.id === customMaterialId);
                      const color = mat?.colors.find(c => c.id === customColorId);
                      const finish = mat?.finishes.find(f => f.id === customFinishId);
                      return (
                        <div className="p-4 rounded-xl bg-white/5 border border-brand-accent/20">
                          <div className="flex items-center gap-2 mb-3">
                            {color?.hex && (
                              <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: color.hex }} />
                            )}
                            <span className="text-xs text-white/50">
                              {mat?.name} · {color?.name} · {finish?.name}
                            </span>
                          </div>
                          <button
                            onClick={() => { setVendorModal('custom' as any); setPendingVendorIdx(selectedCustomVendor); }}
                            className="w-full text-left group"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-2xl font-bold text-white">${vendor.totalPrice.toFixed(2)}</span>
                                <div className="text-xs text-white/30 mt-0.5">
                                  ${vendor.itemPrice.toFixed(2)} print + ${vendor.shippingPrice.toFixed(2)} shipping
                                </div>
                                <div className="text-xs text-white/40 mt-1">
                                  via {vendor.vendorId} · {vendor.productionTimeFast}-{vendor.productionTimeSlow} day production
                                </div>
                              </div>
                              {customQuote.vendors.length > 1 && (
                                <div className="flex items-center gap-1 text-white/30 group-hover:text-brand-accent transition-colors">
                                  <span className="text-xs">{customQuote.vendors.length - 1} more</span>
                                  <ChevronRight className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                          </button>
                          <button
                            onClick={() => handleOrder('custom' as any)}
                            disabled={orderLoading}
                            className="mt-4 w-full py-3 bg-gradient-to-r from-brand-accent to-brand-accent-dark text-brand-dark text-sm font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(237,174,73,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {orderLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Order This Print
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Copy link + Generate another */}
              <div className="border-t border-white/5 pt-6 mt-6 flex items-center justify-between">
                <button onClick={() => navigate('/generate')} className="text-sm text-brand-accent hover:underline font-medium">
                  Generate another design
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  {copied ? (<><Check className="h-3.5 w-3.5 text-green-400" /><span className="text-green-400">Copied!</span></>) : (<><Link2 className="h-3.5 w-3.5" /><span>Copy link</span></>)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Vendor selection modal ── */}
      {vendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setVendorModal(null)}>
          <div className="bg-brand-dark-card border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 pb-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {vendorModal === 'color' ? 'Full Color' : vendorModal === 'sls' ? 'SLS Nylon' : vendorModal === 'custom' ? 'Custom Quote' : 'SLA Resin'} Vendors
                </h3>
                <p className="text-sm text-white/40 mt-0.5">
                  {(vendorModal === 'color' ? colorQuote : vendorModal === 'sls' ? slsQuote : vendorModal === 'custom' ? customQuote : monoQuote).vendors.length} options · sorted by price
                </p>
              </div>
              <button onClick={() => setVendorModal(null)} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Vendor list */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {(vendorModal === 'color' ? colorQuote : vendorModal === 'sls' ? slsQuote : vendorModal === 'custom' ? customQuote : monoQuote).vendors.map((vendor, idx) => (
                <button
                  key={vendor.craftcloudQuoteId}
                  onClick={() => setPendingVendorIdx(idx)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    pendingVendorIdx === idx
                      ? 'border-brand-accent/50 bg-brand-accent/10'
                      : 'border-white/10 hover:border-white/20 bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">{vendor.vendorId}</span>
                        {idx === 0 && (
                          <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full font-medium">Best Price</span>
                        )}
                      </div>
                      <div className="text-xs text-white/30 mt-1">
                        {vendor.productionTimeFast}-{vendor.productionTimeSlow} day production
                        {vendor.shippingName && ` · ${vendor.shippingName}`}
                        {vendor.shippingDeliveryTime && ` (${vendor.shippingDeliveryTime}d delivery)`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">${vendor.totalPrice.toFixed(2)}</div>
                      <div className="text-[10px] text-white/30">
                        ${vendor.itemPrice.toFixed(2)} + ${vendor.shippingPrice.toFixed(2)} ship
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 pt-3 border-t border-white/5">
              <button
                onClick={() => {
                  if (vendorModal === 'color') setSelectedColorVendor(pendingVendorIdx);
                  else if (vendorModal === 'sls') setSelectedSlsVendor(pendingVendorIdx);
                  else if (vendorModal === 'custom') setSelectedCustomVendor(pendingVendorIdx);
                  else setSelectedMonoVendor(pendingVendorIdx);
                  setVendorModal(null);
                }}
                className="w-full py-3 bg-gradient-to-r from-brand-accent to-brand-accent-dark text-brand-dark font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(237,174,73,0.3)] transition-all"
              >
                Select This Vendor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
