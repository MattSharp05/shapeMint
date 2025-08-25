import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ModelViewer } from '../components/3D/ModelViewer';
import { VendorSelection } from '../components/Order/VendorSelection';
import { MaterialSelection } from '../components/Order/MaterialSelection';
import { ShippingForm } from '../components/Order/ShippingForm';
import { VENDORS, SHAPEWAYS_MATERIALS } from '../data/vendors';
import { OrderWizardState, ShippingInfo } from '../types/order';
import { getQuote } from '../services/shapeways';
import { createOrder } from '../services/shapewaysOrder';

export function Order() {
  const location = useLocation();
  const navigate = useNavigate();
  const { modelData, modelUrl, stlUrl } = location.state || {};

  // Wizard state - step 0: vendor, step 1: material+color, step 2: shipping
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardState, setWizardState] = useState<OrderWizardState>({
    modelData,
    modelUrl,
    stlUrl,
  });

  // Debug logging
  console.log('📦 Order page loaded with state:', { modelData, modelUrl, stlUrl });

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
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const [quoteState, setQuoteState] = useState<{ loading: boolean; error?: string; data?: { quoteId: string; priceTotal: number; currency: string; reused?: boolean; expiresAt?: string; itemTotal?: number; surcharge?: number } }>({ loading: false });
  const [orderState, setOrderState] = useState<{ loading: boolean; error?: string; data?: { orderId: string; orderNumber: string; status: string; totalPrice: number } }>({ loading: false });

  const handleGetQuote = async () => {
    if (!wizardState.vendorId || wizardState.vendorId !== 'shapeways') return;
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
      const data = await getQuote({
        modelUrl: wizardState.modelUrl!,
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
    if (!wizardState.vendorId || wizardState.vendorId !== 'shapeways') return;
    const { shippingInfo } = wizardState;
    if (!shippingInfo) return;
    setOrderState({ loading: true });
    try {
      const quantity = shippingInfo.quantity && shippingInfo.quantity > 0 ? Math.min(100, Math.floor(shippingInfo.quantity)) : 1;
      const resp = await createOrder({
        modelUrl: wizardState.modelUrl!,
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
      // Navigate to success page (direct order flow)
      navigate('/order-success', { state: { isDirectOrder: true, orderData: { orderId: resp.orderNumber, customerName: `${shippingInfo.firstName} ${shippingInfo.lastName}`, customerEmail: shippingInfo.email || 'user@example.com', filename: wizardState.modelUrl?.split('/').pop() || 'model', quantity: quantity.toString(), color: wizardState.colorId || '', material: wizardState.materialId || '', shippingAddress: { name: `${shippingInfo.firstName} ${shippingInfo.lastName}`, street: shippingInfo.address1!, city: shippingInfo.city!, state: shippingInfo.state!, zip: shippingInfo.postalCode! }, message: 'Order submitted successfully.' } } });
    } catch (e:any) {
      if (e.message === 'price_changed') {
        setOrderState({ loading: false, error: 'Price changed since quote. Please Get Quote again to confirm updated price.' });
      } else {
        setOrderState({ loading: false, error: e.message || 'Order failed' });
      }
    }
  };

  // Get data for current vendor
  const availableMaterials = wizardState.vendorId === 'shapeways' ? SHAPEWAYS_MATERIALS : [];

  // Step titles and progress
  const stepTitles = ['Choose Vendor', 'Select Material & Color', 'Shipping Information'];
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
          <p className="text-gray-600">Step {currentStep + 1} of {stepTitles.length}: {stepTitles[currentStep]}</p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {stepTitles.map((_, index) => (
              <div key={index} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= index 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                {index < stepTitles.length - 1 && (
                  <div className={`w-12 h-1 mx-2 ${
                    currentStep > index ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left side - Model preview */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Preview</h3>
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
                {modelUrl ? (
                  <ModelViewer 
                    modelUrl={modelUrl}
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
          <div className="lg:col-span-2">
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
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
