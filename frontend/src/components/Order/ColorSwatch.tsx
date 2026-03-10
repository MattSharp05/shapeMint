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
          ? 'ring-2 ring-brand-accent/50 border-brand-accent/50'
          : 'hover:border-white/20'
      }`}
      onClick={onSelect}
    >
      <div className="flex flex-col items-center justify-center">
        <div
          className="w-12 h-12 rounded-full border-2 border-white/10 mb-2"
          style={
            color.name === 'Multicolor'
              ? { background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }
              : { backgroundColor: color.hex || '#cccccc' }
          }
        />
        <div className="text-sm font-medium text-white truncate w-full text-center" title={color.name}>
          {color.name}
        </div>
      </div>
    </Card>
  );
}
