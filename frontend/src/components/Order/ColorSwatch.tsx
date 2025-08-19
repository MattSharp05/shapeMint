import { Card } from '../UI/Card';

interface ColorSwatchProps {
  color: {
    id: string;
    name: string;
    swatchUrl?: string;
  };
  isSelected: boolean;
  onSelect: () => void;
}

export function ColorSwatch({ color, isSelected, onSelect }: ColorSwatchProps) {
  return (
    <Card
      className={`cursor-pointer transition-all duration-200 p-4 ${
        isSelected
          ? 'ring-2 ring-blue-500 border-blue-500'
          : 'hover:border-gray-300 hover:shadow-sm'
      }`}
      onClick={onSelect}
    >
      <div className="text-center">
        <div className="mb-3">
          {color.swatchUrl ? (
            <img
              src={color.swatchUrl}
              alt={`${color.name} swatch`}
              className="w-20 h-20 rounded-lg mx-auto object-cover border"
              style={{ aspectRatio: '1/1' }}
              onError={(e) => {
                // Fallback for broken images
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`w-20 h-20 rounded-lg mx-auto bg-gray-200 flex items-center justify-center text-xs text-gray-500 border ${color.swatchUrl ? 'hidden' : ''}`}>
            No Image
          </div>
        </div>
        <div className="text-sm font-medium text-gray-900 truncate" title={color.name}>
          {color.name}
        </div>
      </div>
    </Card>
  );
}
