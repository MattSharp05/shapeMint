import { Card } from '../UI/Card';

interface FinishSwatchProps {
  finish: {
    id: string;
    name: string;
    description?: string;
    swatchUrl?: string;
  };
  isSelected: boolean;
  onSelect: () => void;
}

export function FinishSwatch({ finish, isSelected, onSelect }: FinishSwatchProps) {
  return (
    <Card
      className={`cursor-pointer transition-all duration-200 p-4 min-h-[120px] ${
        isSelected
          ? 'ring-2 ring-blue-500 border-blue-500'
          : 'hover:border-gray-300 hover:shadow-sm'
      }`}
      onClick={onSelect}
    >
      <div className="text-left h-full flex flex-col items-start gap-2">
        <div className="text-sm font-medium text-gray-900" title={finish.name}>
          {finish.name}
        </div>
        {finish.description && (
          <div className="text-xs text-gray-500 leading-relaxed" title={finish.description}>
            {finish.description}
          </div>
        )}
      </div>
    </Card>
  );
}
