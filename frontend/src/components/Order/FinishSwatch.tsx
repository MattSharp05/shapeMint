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
          ? 'ring-2 ring-brand-accent/50 border-brand-accent/50'
          : 'hover:border-white/20'
      }`}
      onClick={onSelect}
    >
      <div className="text-left h-full flex flex-col items-start gap-2">
        <div className="text-sm font-medium text-white" title={finish.name}>
          {finish.name}
        </div>
        {finish.description && (
          <div className="text-xs text-white/40 leading-relaxed" title={finish.description}>
            {finish.description}
          </div>
        )}
      </div>
    </Card>
  );
}
