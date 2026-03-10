import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { ColorSwatch } from './ColorSwatch';
import { FinishSwatch } from './FinishSwatch';
import { Material } from '../../types/order';

interface MaterialSelectionProps {
  materials: Material[];
  selectedMaterialId?: string;
  selectedColorId?: string;
  selectedFinishId?: string;
  onMaterialSelect: (materialId: string) => void;
  onColorSelect: (colorId: string) => void;
  onFinishSelect: (finishId: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function MaterialSelection({
  materials,
  selectedMaterialId,
  selectedColorId,
  selectedFinishId,
  onMaterialSelect,
  onColorSelect,
  onFinishSelect,
  onNext,
  onBack,
}: MaterialSelectionProps) {
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(selectedMaterialId || null);

  const handleMaterialClick = (materialId: string) => {
    onMaterialSelect(materialId);
    setExpandedMaterialId(expandedMaterialId === materialId ? null : materialId);
  };

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);
  const hasColors = selectedMaterial?.colors && selectedMaterial.colors.length > 0;
  const hasFinishes = selectedMaterial?.finishes && selectedMaterial.finishes.length > 0;

  // Check if we can proceed - need material, and if applicable, color and/or finish
  const canProceed = selectedMaterialId &&
    (!hasColors || selectedColorId) &&
    (!hasFinishes || selectedFinishId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Select Material, Color & Finish</h2>
        <p className="text-sm text-white/40">Choose your material and available options</p>
      </div>

      <div className="space-y-3">
        {materials.map((material) => {
          const isExpanded = expandedMaterialId === material.id;
          const isSelected = selectedMaterialId === material.id;
          const isFullColor = material.id === 'full-color-nylon-12-mjf';

          return (
            <Card
              key={material.id}
              className={`overflow-hidden ${
                isFullColor
                  ? 'ring-2 ring-brand-accent/50'
                  : ''
              }`}
            >
              {isFullColor && (
                <div className="bg-brand-accent/20 text-brand-accent px-4 py-2 text-center">
                  <span className="font-bold text-xs uppercase tracking-wider">Recommended for Multi-Color Models</span>
                </div>
              )}
              <div
                className={`cursor-pointer transition-all duration-200 p-4 ${
                  isSelected
                    ? 'bg-brand-accent/10 border-brand-accent/30'
                    : 'hover:bg-white/5'
                }`}
                onClick={() => handleMaterialClick(material.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {material.swatchUrl && (
                      <img
                        src={material.swatchUrl}
                        alt={`${material.name} preview`}
                        className="w-16 h-16 rounded-lg object-cover border border-white/10"
                        style={{ aspectRatio: '1/1' }}
                      />
                    )}
                    <div>
                      <h3 className="font-semibold text-white">{material.name}</h3>
                      {material.description && (
                        <p className="text-sm text-white/40">{material.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-white/30 mt-1">
                        {material.colors.length > 0 && (
                          <span>{material.colors.length} color{material.colors.length !== 1 ? 's' : ''}</span>
                        )}
                        {material.finishes.length > 0 && (
                          <span>{material.finishes.length} finish{material.finishes.length !== 1 ? 'es' : ''}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSelected && <div className="w-2 h-2 bg-brand-accent rounded-full" />}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-white/30" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-white/30" />
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-white/5 bg-white/5 p-4 space-y-6">
                  {/* Colors Section */}
                  {material.colors.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-white/70 mb-3">Available Colors:</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {material.colors.map((color) => (
                          <ColorSwatch
                            key={color.id}
                            color={color}
                            isSelected={selectedColorId === color.id}
                            onSelect={() => onColorSelect(color.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Finishes Section */}
                  {material.finishes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-white/70 mb-3">Materials/Finishes:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(
                          material.finishes
                            .filter((finish) => {
                              if (finish.id !== '18k') return true;
                              if (material.id !== 'gold-casting') return true;
                              return selectedColorId === 'gold-yellow';
                            })
                            .map((finish) => (
                              <FinishSwatch
                                key={finish.id}
                                finish={finish}
                                isSelected={selectedFinishId === finish.id}
                                onSelect={() => onFinishSelect(finish.id)}
                              />
                            ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Selection Summary */}
                  {isSelected && (selectedColorId || selectedFinishId) && (
                    <div className="bg-brand-accent/10 border border-brand-accent/20 rounded-lg p-3">
                      <h5 className="text-sm font-medium text-brand-accent mb-2">Current Selection:</h5>
                      <div className="text-sm text-white/60 space-y-1">
                        <div>Material: {material.name}</div>
                        {selectedColorId && (
                          <div>Color: {material.colors.find(c => c.id === selectedColorId)?.name}</div>
                        )}
                        {selectedFinishId && (
                          <div>Finish: {material.finishes.find(f => f.id === selectedFinishId)?.name}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="px-6 py-2"
        >
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="px-6 py-2"
        >
          Next: Shipping Info
        </Button>
      </div>

      {selectedMaterialId && !canProceed && (
        <div className="text-center">
          <p className="text-sm text-white/40 italic">
            {!selectedColorId && hasColors && "Please select a color"}
            {!selectedColorId && hasColors && !selectedFinishId && hasFinishes && " and "}
            {!selectedFinishId && hasFinishes && "Please select a finish"}
          </p>
        </div>
      )}
    </div>
  );
}
