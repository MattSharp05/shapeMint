import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { ModelViewer } from '../components/3D/ModelViewer';
import { ensureStableModelUrl } from '../services/modelUrlService';
import { VendorSelection } from '../components/Order/VendorSelection';
import { MaterialSelection } from '../components/Order/MaterialSelection';
import { ShippingForm } from '../components/Order/ShippingForm';
import { VENDORS, SHAPEWAYS_MATERIALS, SLANT3D_MATERIALS, getMaterialsForVendor } from '../data/vendors';
import { OrderWizardState, ShippingInfo, Material } from '../types/order';
import { getQuote as getShapewaysQuote } from '../services/shapeways';
import { createOrder as createShapewaysOrder } from '../services/shapewaysOrder';
import { getQuote as getSlant3DQuote, getAvailableFilaments } from '../services/slant3d';
import { createOrder as createSlant3DOrder } from '../services/slant3dOrder';
import { getQuote as getTreatstockQuote, TreatstockQuoteResponse } from '../services/treatstock';
import { createOrder as createTreatstockOrder } from '../services/treatstockOrder';
import { getQuote as getCraftcloudQuote, CraftcloudVendorOption } from '../services/craftcloud';
import { createOrder as createCraftcloudOrder } from '../services/craftcloudOrder';
import { getCraftcloudMaterialConfigId } from '../data/craftcloudMaterials';

export function Order() {
  const location = useLocation();
  const navigate = useNavigate();
  const { modelData, modelUrl, stlUrl } = location.state || {};

  // Wizard state - step 0: vendor, step 1: material+color, step 2: shipping
  // Default to CraftCloud and skip vendor selection (step 0)
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardState, setWizardState] = useState<OrderWizardState>({
    modelData,
    modelUrl,
    stlUrl,
    vendorId: 'craftcloud',
  });

  // Stable model URL for the viewer (migrates expired Meshy CDN URLs to Supabase storage)
  const [stableModelUrl, setStableModelUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!modelUrl) return;
    const modelId = modelData?.id || modelData?.designId;
    if (modelId) {
      ensureStableModelUrl(modelId, modelUrl, modelData?.type || 'text-to-3d')
        .then((url) => { if (url) setStableModelUrl(url); });
    }
  }, [modelUrl, modelData?.id, modelData?.designId, modelData?.type]);

  // Slant3D filaments state - fetched from API
  const [slant3DFilaments, setSlant3DFilaments] = useState<Material[]>([]);
  const [slant3DFilamentMap, setSlant3DFilamentMap] = useState<Record<string, string>>({}); // Maps our material ID to Slant3D publicId
  const [loadingFilaments, setLoadingFilaments] = useState(false);

  // Fetch Slant3D filaments when vendor is selected
  useEffect(() => {
    if (wizardState.vendorId === 'slant3d' && slant3DFilaments.length === 0 && !loadingFilaments) {
      setLoadingFilaments(true);
      console.log('🔄 Fetching Slant3D filaments...');
      getAvailableFilaments()
        .then(filaments => {
          console.log('✅ Received Slant3D filaments:', filaments);
          // Convert Slant3D filaments to Material format
          const materials: Material[] = filaments
            .filter(f => f.available && f.public)
            .map(filament => ({
              id: `slant3d-${filament.publicId}`, // Use publicId as part of our ID
              name: filament.name,
              description: `${filament.profile} - ${filament.color}`,
              swatchUrl: filament.hexValue ? `https://via.placeholder.com/100x100/${filament.hexValue.replace('#', '')}/FFFFFF?text=${encodeURIComponent(filament.name)}` : undefined,
              colors: [{
                id: filament.color.toLowerCase().replace(/\s+/g, '-'),
                name: filament.color,
                hex: filament.hexValue || '#000000'
              }],
              finishes: []
            }));

          // Create mapping from our material ID to Slant3D publicId
          const mapping: Record<string, string> = {};
          materials.forEach(material => {
            const publicId = material.id.replace('slant3d-', '');
            mapping[material.id] = publicId;
          });

          // Also create reverse mapping for hardcoded IDs (fallback)
          // Map hardcoded IDs like "petg-white" to actual publicIds if we can match them
          SLANT3D_MATERIALS.forEach(hardcoded => {
            const match = materials.find(m => {
              const nameMatch = m.name.toLowerCase().replace(/\s+/g, '-') === hardcoded.id;
              if (nameMatch) return true;
              // Try profile + color match
              const parts = hardcoded.id.split('-');
              if (parts.length >= 2) {
                const profile = parts[0].toUpperCase();
                const color = parts.slice(1).join(' ');
                return m.description.toUpperCase().includes(profile) && 
                       m.description.toLowerCase().includes(color);
              }
              return false;
            });
            if (match) {
              mapping[hardcoded.id] = match.id.replace('slant3d-', '');
            }
          });

          console.log('📋 Filament mapping created:', mapping);
          setSlant3DFilaments(materials);
          setSlant3DFilamentMap(mapping);
          setLoadingFilaments(false);
        })
        .catch(error => {
          console.error('❌ Error fetching Slant3D filaments:', error);
          // Fallback to hardcoded materials if API fails
          console.log('⚠️ Using fallback hardcoded materials');
          setSlant3DFilaments(SLANT3D_MATERIALS);
          setLoadingFilaments(false);
        });
    }
  }, [wizardState.vendorId, slant3DFilaments.length, loadingFilaments]);

  // STL readiness — use STL if passed from Marketplace, otherwise use GLB directly
  const [confirmedStlUrl, setConfirmedStlUrl] = useState<string | null>(null);
  const [stlChecking, setStlChecking] = useState(true);

  useEffect(() => {
    // If a confirmed STL URL was passed (e.g. from Marketplace), use it immediately
    if (stlUrl) {
      console.log('✅ Using STL URL from navigation state:', stlUrl);
      setConfirmedStlUrl(stlUrl);
    } else {
      console.log('ℹ️ No STL URL passed — will use GLB for quoting');
    }
    setStlChecking(false);
  }, [stlUrl]);

  // Returns the model URL to send to manufacturers (STL preferred)
  const getModelUrlForPrinting = useCallback(async (): Promise<string> => {
    console.log('🖨️ getModelUrlForPrinting called:', {
      confirmedStlUrl,
      stlUrl,
      modelId: modelData?.id,
      modelUrl,
    });

    // 1. If we already confirmed the STL from DB polling, use it
    if (confirmedStlUrl) {
      console.log('🖨️ Using confirmed STL:', confirmedStlUrl);
      return confirmedStlUrl;
    }

    // 2. Try one final DB check
    const modelId = modelData?.id;
    if (modelId) {
      try {
        const { data: record, error: queryError } = await supabase
          .from('generated_models')
          .select('stl_url')
          .eq('id', modelId)
          .single();

        if (queryError) {
          console.error('❌ DB query error in getModelUrlForPrinting:', queryError.message, queryError.code);
        }

        if (record?.stl_url) {
          console.log('🖨️ STL found on final DB check:', record.stl_url);
          setConfirmedStlUrl(record.stl_url);
          return record.stl_url;
        }
      } catch (e: any) {
        console.error('❌ getModelUrlForPrinting exception:', e?.message);
      }
    } else {
      console.warn('⚠️ No modelData.id for DB lookup');
    }

    // 3. Use stlUrl from navigation state (set by Generate page)
    if (stlUrl) {
      console.log('🖨️ Using STL URL from navigation state:', stlUrl);
      return stlUrl;
    }

    // 4. Last resort: fall back to GLB
    console.warn('⚠️ No STL available — falling back to GLB:', modelUrl);
    return modelUrl;
  }, [confirmedStlUrl, stlUrl, modelData?.id, modelUrl]);

  // Handle no model data
  if (!modelData) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center bg-white rounded-lg p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Model Selected</h2>
            <p className="text-gray-600 mb-6">Please select a model to order first.</p>
            <button 
              onClick={() => navigate('/generate')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Generate
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Wizard step handlers
  const handleVendorSelect = (vendorId: string) => {
    setWizardState(prev => ({ ...prev, vendorId }));
  };

  const handleMaterialSelect = (materialId: string) => {
    setWizardState(prev => ({ ...prev, materialId, colorId: undefined, finishId: undefined }));
  };

  const handleColorSelect = (colorId: string) => {
    setWizardState(prev => ({ ...prev, colorId }));
  };

  const handleFinishSelect = (finishId: string) => {
    setWizardState(prev => ({ ...prev, finishId }));
  };

  const handleShippingInfoChange = (shippingInfo: Partial<ShippingInfo>) => {
    setWizardState(prev => ({ 
      ...prev, 
      shippingInfo: { ...prev.shippingInfo, ...shippingInfo, country: 'US' }
    }));
  };

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) { // Don't go back to vendor selection (step 0)
      setCurrentStep(prev => prev - 1);
    }
  };

  const [quoteState, setQuoteState] = useState<{ loading: boolean; error?: string; data?: { quoteId: string; priceTotal: number; currency: string; reused?: boolean; expiresAt?: string; itemTotal?: number; surcharge?: number; shippingTotal?: number; publicFileServiceId?: string; treatstockRaw?: TreatstockQuoteResponse; craftcloudPriceId?: string; craftcloudQuoteId?: string; craftcloudShippingId?: string; vendorName?: string; productionTime?: string } }>({ loading: false });
  const [orderState, setOrderState] = useState<{ loading: boolean; error?: string; data?: { orderId: string; orderNumber: string; status: string; totalPrice: number } }>({ loading: false });

  // Craftcloud: multiple vendor quotes for user to pick from
  const [craftcloudVendorOptions, setCraftcloudVendorOptions] = useState<CraftcloudVendorOption[]>([]);
  const [selectedCraftcloudVendor, setSelectedCraftcloudVendor] = useState<number>(-1);
  const [showVendorModal, setShowVendorModal] = useState(false);

  const handleGetQuote = async () => {
    if (!wizardState.vendorId) return;
    if (!wizardState.materialId) {
      setQuoteState({ loading: false, error: 'Select a material first' });
      return;
    }
    const { shippingInfo } = wizardState;
    if (!shippingInfo?.firstName || !shippingInfo.lastName || !shippingInfo.address1 || !shippingInfo.city || !shippingInfo.state || !shippingInfo.postalCode || !shippingInfo.phone) {
      setQuoteState({ loading: false, error: 'Complete shipping form' });
      return;
    }
    setQuoteState({ loading: true });
    try {
      const quantity = shippingInfo.quantity && shippingInfo.quantity > 0 ? Math.min(100, Math.floor(shippingInfo.quantity)) : 1;

      // Resolve the STL URL for printing (preferred over GLB for manufacturers)
      const printModelUrl = await getModelUrlForPrinting();
      console.log('🖨️ Using model URL for quote:', printModelUrl);

      if (wizardState.vendorId === 'shapeways') {
        const data = await getShapewaysQuote({
          modelUrl: printModelUrl,
          selections: { baseMaterialId: wizardState.materialId, colorId: wizardState.colorId, finishId: wizardState.finishId },
          quantity,
          shippingAddress: {
            firstName: shippingInfo.firstName!,
            lastName: shippingInfo.lastName!,
            email: shippingInfo.email || 'user@example.com',
            address1: shippingInfo.address1!,
            city: shippingInfo.city!,
            state: shippingInfo.state!,
            zipCode: shippingInfo.postalCode!,
            country: 'US',
            phone: shippingInfo.phone!
          }
        });
        setQuoteState({ loading: false, data });
      } else if (wizardState.vendorId === 'slant3d') {
        // For Slant3D, get the actual filament publicId from our mapping
        const filamentPublicId = slant3DFilamentMap[wizardState.materialId] || wizardState.materialId;
        const data = await getSlant3DQuote({
          modelUrl: printModelUrl,
          filamentId: filamentPublicId,
          quantity,
          shippingAddress: {
            firstName: shippingInfo.firstName!,
            lastName: shippingInfo.lastName!,
            email: shippingInfo.email || 'user@example.com',
            address1: shippingInfo.address1!,
            address2: shippingInfo.address2,
            city: shippingInfo.city!,
            state: shippingInfo.state!,
            zipCode: shippingInfo.postalCode!,
            country: 'US',
            phone: shippingInfo.phone!
          }
        });
        setQuoteState({ loading: false, data });
      } else if (wizardState.vendorId === 'treatstock') {
        const data = await getTreatstockQuote({
          modelUrl: printModelUrl,
          quantity,
          shippingAddress: {
            firstName: shippingInfo.firstName!,
            lastName: shippingInfo.lastName!,
            email: shippingInfo.email || 'user@example.com',
            address1: shippingInfo.address1!,
            address2: shippingInfo.address2,
            city: shippingInfo.city!,
            state: shippingInfo.state!,
            zipCode: shippingInfo.postalCode!,
            country: 'US',
            phone: shippingInfo.phone!
          }
        });
        setQuoteState({ loading: false, data });
      } else if (wizardState.vendorId === 'craftcloud') {
        // Resolve materialConfigId from selections
        const materialConfigId = getCraftcloudMaterialConfigId(
          wizardState.materialId!,
          wizardState.colorId,
          wizardState.finishId
        );
        if (!materialConfigId) {
          setQuoteState({ loading: false, error: 'This material/color/finish combination is not available. Please select a different option.' });
          return;
        }
        const data = await getCraftcloudQuote({
          modelUrl: printModelUrl,
          materialConfigId,
          quantity,
          shippingAddress: {
            firstName: shippingInfo.firstName!,
            lastName: shippingInfo.lastName!,
            email: shippingInfo.email || 'user@example.com',
            address1: shippingInfo.address1!,
            city: shippingInfo.city!,
            state: shippingInfo.state!,
            zipCode: shippingInfo.postalCode!,
            country: 'US',
            phone: shippingInfo.phone!
          }
        });
        if (!data.vendorOptions || data.vendorOptions.length === 0) {
          setQuoteState({ loading: false, error: 'No print vendors returned quotes for this material and model.' });
          return;
        }
        // Store all vendor options for selection UI and show modal
        setCraftcloudVendorOptions(data.vendorOptions);
        setSelectedCraftcloudVendor(0); // Default to cheapest
        setShowVendorModal(true);
        // Set quote state with cheapest option as default
        const cheapest = data.vendorOptions[0];
        setQuoteState({
          loading: false,
          data: {
            quoteId: data.craftcloudPriceId,
            priceTotal: cheapest.totalPrice,
            currency: data.currency,
            itemTotal: cheapest.itemPrice,
            shippingTotal: cheapest.shippingPrice,
            craftcloudPriceId: data.craftcloudPriceId,
            craftcloudQuoteId: cheapest.craftcloudQuoteId,
            craftcloudShippingId: cheapest.craftcloudShippingId,
            vendorName: cheapest.vendorId,
            productionTime: `${cheapest.productionTimeFast}-${cheapest.productionTimeSlow} business days`,
          }
        });
      } else {
        setQuoteState({ loading: false, error: 'Unsupported vendor' });
      }
    } catch (e:any) {
      if (e?.code === 'material_not_printable') {
        setQuoteState({ loading: false, error: 'Full Color Nylon (MJF) is not available for this model (no texture/color data). Please choose a different material.' });
      } else {
        setQuoteState({ loading: false, error: e.message || 'Quote failed' });
      }
    }
  };

  const handlePlaceOrder = async () => {
    if (!quoteState.data) return;
    if (!wizardState.vendorId || (wizardState.vendorId !== 'shapeways' && wizardState.vendorId !== 'slant3d' && wizardState.vendorId !== 'treatstock' && wizardState.vendorId !== 'craftcloud')) return;
    const { shippingInfo } = wizardState;
    if (!shippingInfo) return;
    setOrderState({ loading: true });
    try {
      const quantity = shippingInfo.quantity && shippingInfo.quantity > 0 ? Math.min(100, Math.floor(shippingInfo.quantity)) : 1;

      // Use the STL URL for manufacturing (preferred over GLB)
      const printModelUrl = await getModelUrlForPrinting();
      console.log('🖨️ Using model URL for order:', printModelUrl);

      if (wizardState.vendorId === 'shapeways') {
        const resp = await createShapewaysOrder({
          modelUrl: printModelUrl,
          selections: { baseMaterialId: wizardState.materialId!, colorId: wizardState.colorId, finishId: wizardState.finishId },
          quantity,
          shippingAddress: {
            firstName: shippingInfo.firstName!,
            lastName: shippingInfo.lastName!,
            email: shippingInfo.email || 'user@example.com',
            address1: shippingInfo.address1!,
            city: shippingInfo.city!,
            state: shippingInfo.state!,
            zipCode: shippingInfo.postalCode!,
            country: 'US',
            phone: shippingInfo.phone!
          },
          priorQuote: quoteState.data.itemTotal != null && quoteState.data.surcharge != null ? {
            itemTotal: quoteState.data.itemTotal,
            surcharge: quoteState.data.surcharge,
            total: quoteState.data.priceTotal
          } : undefined,
          quoteId: quoteState.data.quoteId
        });
        setOrderState({ loading: false, data: { orderId: resp.orderId, orderNumber: resp.orderNumber, status: resp.status, totalPrice: resp.totalPrice } });
        navigate('/order-success', { state: { isDirectOrder: true, orderData: { orderId: resp.orderNumber, customerName: `${shippingInfo.firstName} ${shippingInfo.lastName}`, customerEmail: shippingInfo.email || 'user@example.com', filename: wizardState.modelUrl?.split('/').pop() || 'model', quantity: quantity.toString(), color: wizardState.colorId || '', material: wizardState.materialId || '', shippingAddress: { name: `${shippingInfo.firstName} ${shippingInfo.lastName}`, street: shippingInfo.address1!, city: shippingInfo.city!, state: shippingInfo.state!, zip: shippingInfo.postalCode! }, message: 'Order submitted successfully.' } } });
      } else if (wizardState.vendorId === 'slant3d') {
        // For Slant3D, get the actual filament publicId from our mapping
        const filamentPublicId = slant3DFilamentMap[wizardState.materialId!] || wizardState.materialId!;
        const resp = await createSlant3DOrder({
          modelUrl: printModelUrl,
          filamentId: filamentPublicId,
          quantity,
          shippingAddress: {
            firstName: shippingInfo.firstName!,
            lastName: shippingInfo.lastName!,
            email: shippingInfo.email || 'user@example.com',
            address1: shippingInfo.address1!,
            address2: shippingInfo.address2,
            city: shippingInfo.city!,
            state: shippingInfo.state!,
            zipCode: shippingInfo.postalCode!,
            country: 'US',
            phone: shippingInfo.phone!
          },
          priorQuote: quoteState.data.itemTotal != null && quoteState.data.shippingTotal != null ? {
            itemTotal: quoteState.data.itemTotal,
            shippingTotal: quoteState.data.shippingTotal,
            total: quoteState.data.priceTotal
          } : undefined,
          quoteId: quoteState.data.quoteId,
          publicFileServiceId: quoteState.data.publicFileServiceId
        });
        setOrderState({ loading: false, data: { orderId: resp.orderId, orderNumber: resp.orderNumber, status: resp.status, totalPrice: resp.totalPrice } });
        navigate('/order-success', { state: { isDirectOrder: true, orderData: { orderId: resp.orderNumber, customerName: `${shippingInfo.firstName} ${shippingInfo.lastName}`, customerEmail: shippingInfo.email || 'user@example.com', filename: wizardState.modelUrl?.split('/').pop() || 'model', quantity: quantity.toString(), material: wizardState.materialId || '', shippingAddress: { name: `${shippingInfo.firstName} ${shippingInfo.lastName}`, street: shippingInfo.address1!, city: shippingInfo.city!, state: shippingInfo.state!, zip: shippingInfo.postalCode! }, message: 'Order submitted successfully.' } } });
      } else if (wizardState.vendorId === 'treatstock') {
        const resp = await createTreatstockOrder({
          modelUrl: printModelUrl,
          quantity,
          shippingAddress: {
            firstName: shippingInfo.firstName!,
            lastName: shippingInfo.lastName!,
            email: shippingInfo.email || 'user@example.com',
            address1: shippingInfo.address1!,
            address2: shippingInfo.address2,
            city: shippingInfo.city!,
            state: shippingInfo.state!,
            zipCode: shippingInfo.postalCode!,
            country: 'US',
            phone: shippingInfo.phone!
          },
          priorQuote: {
            itemTotal: quoteState.data.itemTotal ?? quoteState.data.priceTotal,
            shippingTotal: quoteState.data.shippingTotal ?? 0,
            total: quoteState.data.priceTotal
          },
          quoteId: quoteState.data.quoteId,
          quoteRaw: quoteState.data.treatstockRaw!
        });
        setOrderState({ loading: false, data: { orderId: resp.orderId, orderNumber: resp.orderNumber, status: resp.status, totalPrice: resp.totalPrice } });
        navigate('/order-success', { state: { isDirectOrder: true, orderData: { orderId: resp.orderNumber, customerName: `${shippingInfo.firstName} ${shippingInfo.lastName}`, customerEmail: shippingInfo.email || 'user@example.com', filename: wizardState.modelUrl?.split('/').pop() || 'model', quantity: quantity.toString(), material: wizardState.materialId || '', shippingAddress: { name: `${shippingInfo.firstName} ${shippingInfo.lastName}`, street: shippingInfo.address1!, city: shippingInfo.city!, state: shippingInfo.state!, zip: shippingInfo.postalCode! }, message: 'Order submitted successfully.' } } });
      } else if (wizardState.vendorId === 'craftcloud') {
        const resp = await createCraftcloudOrder({
          craftcloudQuoteId: quoteState.data.craftcloudQuoteId!,
          craftcloudShippingId: quoteState.data.craftcloudShippingId!,
          craftcloudPriceId: quoteState.data.craftcloudPriceId!,
          quantity,
          shippingAddress: {
            firstName: shippingInfo.firstName!,
            lastName: shippingInfo.lastName!,
            email: shippingInfo.email || 'user@example.com',
            address1: shippingInfo.address1!,
            city: shippingInfo.city!,
            state: shippingInfo.state!,
            zipCode: shippingInfo.postalCode!,
            country: 'US',
            phone: shippingInfo.phone!
          },
          successUrl: `${window.location.origin}/order-success?vendor=craftcloud`,
          cancelUrl: `${window.location.origin}/order?payment=cancelled`,
          priorQuote: quoteState.data.itemTotal != null && quoteState.data.shippingTotal != null ? {
            itemTotal: quoteState.data.itemTotal,
            shippingTotal: quoteState.data.shippingTotal,
            total: quoteState.data.priceTotal
          } : undefined,
          quoteId: quoteState.data.quoteId,
          modelUrl: printModelUrl,
        });
        setOrderState({ loading: false, data: { orderId: resp.orderId, orderNumber: resp.orderNumber, status: resp.status, totalPrice: resp.totalPrice } });
        // Redirect to Stripe checkout for payment
        window.location.href = resp.stripeCheckoutUrl;
      }
    } catch (e:any) {
      if (e.message === 'price_changed') {
        setOrderState({ loading: false, error: 'Price changed since quote. Please Get Quote again to confirm updated price.' });
      } else {
        setOrderState({ loading: false, error: e.message || 'Order failed' });
      }
    }
  };

  // Get data for current vendor
  // For Slant3D, use fetched filaments if available, otherwise fallback to hardcoded
  const availableMaterials = wizardState.vendorId === 'slant3d' 
    ? (slant3DFilaments.length > 0 ? slant3DFilaments : SLANT3D_MATERIALS)
    : getMaterialsForVendor(wizardState.vendorId || '');

  // Step titles and progress — vendor step (0) is skipped, so only show steps 1 & 2
  const allStepTitles = ['Choose Vendor', 'Select Material & Color', 'Shipping Information'];
  const visibleSteps = [allStepTitles[1], allStepTitles[2]]; // Skip vendor selection
  const visibleStepIndex = currentStep - 1; // Map internal step (1,2) to display index (0,1)
  const isMarketplaceItem = modelData?.isMarketplaceItem;

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back button */}
        <button
          onClick={() => navigate(isMarketplaceItem ? '/marketplace' : '/generate')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to {isMarketplaceItem ? 'Marketplace' : 'Generate'}</span>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Your 3D Print</h1>
          <p className="text-gray-600">Step {visibleStepIndex + 1} of {visibleSteps.length}: {visibleSteps[visibleStepIndex]}</p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {visibleSteps.map((_, index) => (
              <div key={index} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  visibleStepIndex >= index
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                {index < visibleSteps.length - 1 && (
                  <div className={`w-12 h-1 mx-2 ${
                    visibleStepIndex > index ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left side - Model preview */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Preview</h3>
              <div className="aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden mb-4">
                {(stableModelUrl || modelUrl) ? (
                  <ModelViewer
                    modelUrl={stableModelUrl || modelUrl}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    No preview available
                  </div>
                )}
              </div>
              {modelData?.prompt && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Prompt</h4>
                  <p className="text-sm text-gray-600">{modelData.prompt}</p>
                </div>
              )}
              
              {/* Current selections summary */}
              {(wizardState.vendorId || wizardState.materialId || wizardState.colorId) && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium text-gray-900 mb-3">Current Selection</h4>
                  <div className="space-y-2 text-sm">
                    {wizardState.vendorId && (
                      <div>
                        <span className="text-gray-600">Vendor:</span>{' '}
                        <span className="font-medium">
                          {VENDORS.find(v => v.id === wizardState.vendorId)?.name}
                        </span>
                      </div>
                    )}
                    {wizardState.materialId && (
                      <div>
                        <span className="text-gray-600">Material:</span>{' '}
                        <span className="font-medium">
                          {SHAPEWAYS_MATERIALS.find(m => m.id === wizardState.materialId)?.name}
                        </span>
                      </div>
                    )}
                    {wizardState.colorId && (
                      <div>
                        <span className="text-gray-600">Color:</span>{' '}
                        <span className="font-medium">
                          {availableMaterials
                            .find(m => m.id === wizardState.materialId)
                            ?.colors.find(c => c.id === wizardState.colorId)?.name}
                        </span>
                      </div>
                    )}
                    {wizardState.finishId && (
                      <div>
                        <span className="text-gray-600">Finish:</span>{' '}
                        <span className="font-medium">
                          {availableMaterials
                            .find(m => m.id === wizardState.materialId)
                            ?.finishes.find(f => f.id === wizardState.finishId)?.name}
                        </span>
                      </div>
                    )}
                    {/* STL readiness indicator */}
                    <div className="mt-2">
                      <span className="text-gray-600">Print file:</span>{' '}
                      {confirmedStlUrl ? (
                        <span className="font-medium text-green-600">STL ready</span>
                      ) : stlChecking ? (
                        <span className="font-medium text-yellow-600">Preparing...</span>
                      ) : (
                        <span className="font-medium text-orange-600">GLB (fallback)</span>
                      )}
                    </div>
                    {currentStep === 2 && (
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={wizardState.shippingInfo?.quantity || 1}
                          onChange={(e) => handleShippingInfoChange({ quantity: parseInt(e.target.value) || 1 })}
                          className="w-20 px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Wizard steps */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {currentStep === 0 && (
                <VendorSelection
                  vendors={VENDORS}
                  selectedVendorId={wizardState.vendorId}
                  onVendorSelect={handleVendorSelect}
                  onNext={handleNext}
                />
              )}

              {currentStep === 1 && (
                <div>
                  {wizardState.vendorId === 'slant3d' && loadingFilaments && (
                    <div className="text-center py-4">
                      <p className="text-gray-600">Loading available materials...</p>
                    </div>
                  )}
                  <MaterialSelection
                    materials={availableMaterials}
                    selectedMaterialId={wizardState.materialId}
                    selectedColorId={wizardState.colorId}
                    selectedFinishId={wizardState.finishId}
                    onMaterialSelect={handleMaterialSelect}
                    onColorSelect={handleColorSelect}
                    onFinishSelect={handleFinishSelect}
                    onNext={handleNext}
                    onBack={handleBack}
                  />
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <ShippingForm
                    shippingInfo={wizardState.shippingInfo || {}}
                    onShippingInfoChange={handleShippingInfoChange}
                    onBack={handleBack}
                    onGetQuote={handleGetQuote}
                    isQuoteLoading={quoteState.loading}
                    quoteError={quoteState.error}
                    quoteData={quoteState.data}
                    onPlaceOrder={handlePlaceOrder}
                    isOrderLoading={orderState.loading}
                    orderError={orderState.error}
                  />

                  {/* Craftcloud vendor selection modal */}
                  {showVendorModal && craftcloudVendorOptions.length > 0 && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">Select a Print Vendor</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          {craftcloudVendorOptions.length} vendor{craftcloudVendorOptions.length !== 1 ? 's' : ''} quoted — sorted by lowest price
                        </p>
                        <div className="space-y-3 max-h-80 overflow-y-auto mb-6">
                          {craftcloudVendorOptions.map((option, idx) => (
                            <button
                              key={option.craftcloudQuoteId}
                              onClick={() => {
                                setSelectedCraftcloudVendor(idx);
                                setQuoteState(prev => ({
                                  ...prev,
                                  data: prev.data ? {
                                    ...prev.data,
                                    priceTotal: option.totalPrice,
                                    itemTotal: option.itemPrice,
                                    shippingTotal: option.shippingPrice,
                                    craftcloudQuoteId: option.craftcloudQuoteId,
                                    craftcloudShippingId: option.craftcloudShippingId,
                                    vendorName: option.vendorId,
                                    productionTime: `${option.productionTimeFast}-${option.productionTimeSlow} business days`,
                                  } : prev.data,
                                }));
                              }}
                              className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                                selectedCraftcloudVendor === idx
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-900">{option.vendorId}</span>
                                    {idx === 0 && (
                                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                        Best Price
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500 mt-1">
                                    Production: {option.productionTimeFast}-{option.productionTimeSlow} days
                                    {option.shippingName && ` · ${option.shippingName}`}
                                    {option.shippingDeliveryTime && ` (${option.shippingDeliveryTime} days delivery)`}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-gray-900">
                                    ${option.totalPrice.toFixed(2)}
                                  </div>
                                  <div className="text-xs text-gray-500 space-y-0.5">
                                    <div>${option.itemPrice.toFixed(2)} item</div>
                                    <div>${option.shippingPrice.toFixed(2)} shipping</div>
                                    {option.minimumFee != null && option.minimumFee > 0 && (
                                      <div className="text-amber-600">+${option.minimumFee.toFixed(2)} order minimum</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setShowVendorModal(false)}
                          disabled={selectedCraftcloudVendor < 0}
                          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          Confirm Selection
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
