import { Card } from '../UI/Card';

interface ColorSwatchProps {
  color: {
    id: string;
    name: string;
    swatchUrl?: string;
    hex?: string;
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
      <div className="flex flex-col items-center justify-center">
        <div
          className="w-12 h-12 rounded-full border-2 border-gray-200 mb-2"
          style={{ backgroundColor: color.hex || '#cccccc' }}
        />
        <div className="text-sm font-medium text-gray-900 truncate w-full text-center" title={color.name}>
          {color.name}
        </div>
      </div>
    </Card>
  );
}
