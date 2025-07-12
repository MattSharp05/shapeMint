import React, { useState } from 'react';
import { Package, Truck, Clock, DollarSign, MapPin } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';

const mockQuotes = [
  {
    id: '1',
    vendor: 'PrintCraft Pro',
    material: 'PLA Plastic',
    color: 'White',
    quantity: 1,
    price: 24.99,
    deliveryTime: '3-5 business days',
    rating: 4.8,
    location: 'California, USA'
  },
  {
    id: '2',
    vendor: '3D Solutions',
    material: 'ABS Plastic',
    color: 'Black',
    quantity: 1,
    price: 29.50,
    deliveryTime: '2-4 business days',
    rating: 4.6,
    location: 'Texas, USA'
  },
  {
    id: '3',
    vendor: 'Precision Print',
    material: 'PETG',
    color: 'Clear',
    quantity: 1,
    price: 34.75,
    deliveryTime: '4-7 business days',
    rating: 4.9,
    location: 'New York, USA'
  }
];

const materials = [
  { id: 'pla', name: 'PLA Plastic', description: 'Biodegradable, easy to print, good for prototypes' },
  { id: 'abs', name: 'ABS Plastic', description: 'Durable, impact resistant, good for functional parts' },
  { id: 'petg', name: 'PETG', description: 'Chemical resistant, food safe, crystal clear' },
  { id: 'tpu', name: 'TPU (Flexible)', description: 'Flexible, rubber-like, good for phone cases' },
  { id: 'wood', name: 'Wood Fill', description: 'Wood fiber composite, can be stained and sanded' },
  { id: 'metal', name: 'Metal Fill', description: 'Metal particles, can be polished to metal finish' }
];

export function Manufacturing() {
  const [selectedMaterial, setSelectedMaterial] = useState('pla');
  const [quantity, setQuantity] = useState(1);
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Manufacturing & 3D Printing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get instant quotes from verified manufacturing partners and bring your designs to life
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Printing Options
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Material
                  </label>
                  <select
                    value={selectedMaterial}
                    onChange={(e) => setSelectedMaterial(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {materials.map(material => (
                      <option key={material.id} value={material.id}>
                        {material.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {materials.find(m => m.id === selectedMaterial)?.description}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {['white', 'black', 'red', 'blue', 'green', 'yellow'].map(color => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 border-gray-300 bg-${color === 'white' ? 'gray-100' : color}-500`}
                        style={{ backgroundColor: color === 'white' ? '#f3f4f6' : color }}
                      />
                    ))}
                  </div>
                </div>

                <Button className="w-full">
                  Get Updated Quotes
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quality Guidelines
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <span className="text-gray-600">Minimum wall thickness: 0.8mm</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <span className="text-gray-600">Maximum size: 200mm x 200mm x 200mm</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <span className="text-gray-600">Overhangs over 45° may need supports</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <span className="text-gray-600">Avoid gaps smaller than 0.4mm</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Quotes List */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Manufacturing Quotes
              </h3>
              <p className="text-gray-600">
                Compare quotes from verified manufacturing partners
              </p>
            </div>

            <div className="space-y-4">
              {mockQuotes.map((quote) => (
                <Card 
                  key={quote.id} 
                  className={`p-6 transition-all ${
                    selectedQuote === quote.id ? 'ring-2 ring-purple-500 bg-purple-50' : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedQuote(quote.id)}
                  hover
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">
                        {quote.vendor}
                      </h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <MapPin className="h-3 w-3" />
                        <span>{quote.location}</span>
                        <span>•</span>
                        <span>{quote.rating} ⭐</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600">
                        ${quote.price}
                      </div>
                      <div className="text-sm text-gray-500">
                        per unit
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-xs text-gray-500">Material</div>
                        <div className="text-sm font-medium">{quote.material}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-gray-800 rounded-full"></div>
                      <div>
                        <div className="text-xs text-gray-500">Color</div>
                        <div className="text-sm font-medium">{quote.color}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-xs text-gray-500">Delivery</div>
                        <div className="text-sm font-medium">{quote.deliveryTime}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-xs text-gray-500">Total</div>
                        <div className="text-sm font-medium">${(quote.price * quantity).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>

                  {selectedQuote === quote.id && (
                    <div className="border-t border-gray-200 pt-4">
                      <Button className="w-full">
                        Order from {quote.vendor}
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {selectedQuote && (
              <Card className="p-6 mt-6 bg-gradient-to-r from-purple-50 to-blue-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Order Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${(mockQuotes.find(q => q.id === selectedQuote)!.price * quantity).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping:</span>
                    <span>$8.99</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>$2.40</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>${(mockQuotes.find(q => q.id === selectedQuote)!.price * quantity + 8.99 + 2.40).toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}