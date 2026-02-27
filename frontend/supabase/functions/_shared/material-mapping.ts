// Shared Shapeways material mapping for server-side canonical lookup
// Mirrors frontend src/data/vendors.ts MATERIAL_COMBINATIONS logic

export interface MaterialCombination {
  materialId: string;
  baseMaterialId: string;
  colorId?: string;
  finishId?: string;
}

export const MATERIAL_COMBINATIONS: MaterialCombination[] = [
  // Full Color Nylon PA12 (MJF) (Standard / Smooth)
  { materialId: '231', baseMaterialId: 'full-color-nylon-12-mjf', finishId: 'default-nylonpa12-sls+fullcolor' }, // Standard (multi-color, no colorId)
  { materialId: '232', baseMaterialId: 'full-color-nylon-12-mjf', finishId: 'vapor-smoothing' }, // Smooth (maps to vapor smoothing finish id)

  // Nylon PA12 (SLS) default finish (dyed colors)
  { materialId: '6', baseMaterialId: 'nylon-pa12-sls', colorId: 'white', finishId: 'default-nylonpa12-sls+fullcolor' },
  { materialId: '25', baseMaterialId: 'nylon-pa12-sls', colorId: 'black', finishId: 'default-nylonpa12-sls+fullcolor' },
  { materialId: '78', baseMaterialId: 'nylon-pa12-sls', colorId: 'blue', finishId: 'default-nylonpa12-sls+fullcolor' },
  { materialId: '75', baseMaterialId: 'nylon-pa12-sls', colorId: 'purple', finishId: 'default-nylonpa12-sls+fullcolor' },
  { materialId: '76', baseMaterialId: 'nylon-pa12-sls', colorId: 'red', finishId: 'default-nylonpa12-sls+fullcolor' },
  { materialId: '95', baseMaterialId: 'nylon-pa12-sls', colorId: 'orange', finishId: 'default-nylonpa12-sls+fullcolor' },
  { materialId: '93', baseMaterialId: 'nylon-pa12-sls', colorId: 'yellow', finishId: 'default-nylonpa12-sls+fullcolor' },
  { materialId: '94', baseMaterialId: 'nylon-pa12-sls', colorId: 'green', finishId: 'default-nylonpa12-sls+fullcolor' },
  { materialId: '77', baseMaterialId: 'nylon-pa12-sls', colorId: 'pink', finishId: 'default-nylonpa12-sls+fullcolor' },

  // Nylon PA12 (SLS) vapor smoothing variants (one materialId per color)
  { materialId: '207', baseMaterialId: 'nylon-pa12-sls', colorId: 'white', finishId: 'vapor-smoothing' },
  { materialId: '208', baseMaterialId: 'nylon-pa12-sls', colorId: 'black', finishId: 'vapor-smoothing' },
  { materialId: '236', baseMaterialId: 'nylon-pa12-sls', colorId: 'blue', finishId: 'vapor-smoothing' },
  { materialId: '237', baseMaterialId: 'nylon-pa12-sls', colorId: 'red', finishId: 'vapor-smoothing' },
  { materialId: '238', baseMaterialId: 'nylon-pa12-sls', colorId: 'yellow', finishId: 'vapor-smoothing' },
  { materialId: '239', baseMaterialId: 'nylon-pa12-sls', colorId: 'orange', finishId: 'vapor-smoothing' },
  { materialId: '240', baseMaterialId: 'nylon-pa12-sls', colorId: 'green', finishId: 'vapor-smoothing' },
  { materialId: '241', baseMaterialId: 'nylon-pa12-sls', colorId: 'purple', finishId: 'vapor-smoothing' },
  { materialId: '242', baseMaterialId: 'nylon-pa12-sls', colorId: 'pink', finishId: 'vapor-smoothing' },
  { materialId: '131', baseMaterialId: 'nylon-pa12-mjf', colorId: 'black', finishId: 'default-nylonpa12-mjf' },
  { materialId: '130', baseMaterialId: 'nylon-pa12-mjf', colorId: 'grey', finishId: 'default-nylonpa12-mjf' },
  { materialId: '53', baseMaterialId: 'silver-casting', finishId: 'natural' },
  { materialId: '54', baseMaterialId: 'silver-casting', finishId: 'polished' },
  { materialId: '249', baseMaterialId: 'silver-casting', finishId: 'vermell' },

  // Brass (Casting)
  { materialId: '84', baseMaterialId: 'brass-casting', finishId: 'natural' },
  { materialId: '85', baseMaterialId: 'brass-casting', finishId: 'polished' },

  // Bronze (Casting)
  { materialId: '86', baseMaterialId: 'bronze-casting', finishId: 'natural' },
  { materialId: '87', baseMaterialId: 'bronze-casting', finishId: 'polished' },

  // Copper (Casting)
  { materialId: '156', baseMaterialId: 'copper-casting', finishId: 'natural' },
  { materialId: '157', baseMaterialId: 'copper-casting', finishId: 'polished' },

  // Gold (Casting) - map color (gold-yellow/gold-rose/gold-white) + finish (14k/18k)
  { materialId: '91', baseMaterialId: 'gold-casting', colorId: 'gold-yellow', finishId: '14k' },
  { materialId: '96', baseMaterialId: 'gold-casting', colorId: 'gold-rose', finishId: '14k' },
  { materialId: '97', baseMaterialId: 'gold-casting', colorId: 'gold-white', finishId: '14k' },
  { materialId: '98', baseMaterialId: 'gold-casting', colorId: 'gold-yellow', finishId: '18k' },

  // Gold Plated Brass (Casting) - map plated options
  { materialId: '110', baseMaterialId: 'gold-plated-brass-casting', colorId: '14k-yellow-gold', finishId: 'goldplated-brass-layer-thickness' },
  { materialId: '111', baseMaterialId: 'gold-plated-brass-casting', colorId: '14k-rose-gold', finishId: 'goldplated-brass-layer-thickness' },
  { materialId: '112', baseMaterialId: 'gold-plated-brass-casting', colorId: '18k-yellow-gold', finishId: 'goldplated-brass-layer-thickness' },
  { materialId: '113', baseMaterialId: 'gold-plated-brass-casting', finishId: 'goldplated-brass-layer-thickness' },

  // SLA Watershed combinations
  { materialId: '328', baseMaterialId: 'sla-watershed', colorId: 'clear', finishId: 'default-sla' },
  { materialId: '329', baseMaterialId: 'sla-watershed', colorId: 'black', finishId: 'default-sla' },
];

export function getShapewaysMaterialId(baseMaterialId: string, colorId?: string, finishId?: string): string | undefined {
  return MATERIAL_COMBINATIONS.find(c => c.baseMaterialId === baseMaterialId && c.colorId === colorId && c.finishId === finishId)?.materialId;
}
