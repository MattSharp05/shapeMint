// Craftcloud materials data — curated subset of Nylons, Resins, and Plastics
// materialConfigId UUIDs extracted from docs/API_information/craftCloud_materials.md

import { Material, Color, Finish } from '../types/order';

// --- Finish definitions ---

const CC_FINISHES: Record<string, Finish> = {
  'cc-sls-standard': {
    id: 'cc-sls-standard',
    name: 'Standard',
    description: 'Raw or dyed SLS Nylon PA12 featuring a coarse, granular surface.',
  },
  'cc-sls-vapor-smoothed': {
    id: 'cc-sls-vapor-smoothed',
    name: 'Vapor Smoothed',
    description: 'Chemical vapor process for an injection-mold-like smooth finish.',
  },
  'cc-sls-polished': {
    id: 'cc-sls-polished',
    name: 'Polished',
    description: 'Mechanically tumbled for a smooth, polished surface.',
  },
  'cc-mjf-standard': {
    id: 'cc-mjf-standard',
    name: 'Standard',
    description: 'Standard HP Multi Jet Fusion finish.',
  },
  'cc-resin-standard': {
    id: 'cc-resin-standard',
    name: 'Standard',
    description: 'Standard SLA resin finish with smooth surface.',
  },
  'cc-pla-standard': {
    id: 'cc-pla-standard',
    name: 'Standard',
    description: 'Standard FDM PLA finish with visible layer lines.',
  },
  'cc-petg-standard': {
    id: 'cc-petg-standard',
    name: 'Standard',
    description: 'Standard FDM PETG finish with visible layer lines.',
  },
  'cc-multicolor-pla-standard': {
    id: 'cc-multicolor-pla-standard',
    name: 'Standard',
    description: 'Standard FDM multicolor PLA finish.',
  },
  'cc-full-color-standard': {
    id: 'cc-full-color-standard',
    name: 'Standard',
    description: 'High definition full color PolyJet finish.',
  },
  'cc-mjf-multicolor-standard': {
    id: 'cc-mjf-multicolor-standard',
    name: 'Standard',
    description: 'HP Multi Jet Fusion multicolor finish.',
  },
};

// --- Color definitions ---

const CC_COLORS: Record<string, Color> = {
  'cc-white': { id: 'cc-white', name: 'White', hex: '#fcf9f9' },
  'cc-black': { id: 'cc-black', name: 'Black', hex: '#000000' },
  'cc-blue': { id: 'cc-blue', name: 'Blue', hex: '#243C94' },
  'cc-red': { id: 'cc-red', name: 'Red', hex: '#A8262A' },
  'cc-green': { id: 'cc-green', name: 'Green', hex: '#3A8733' },
  'cc-orange': { id: 'cc-orange', name: 'Orange', hex: '#E5601E' },
  'cc-purple': { id: 'cc-purple', name: 'Purple', hex: '#6258CC' },
  'cc-gray': { id: 'cc-gray', name: 'Gray', hex: '#A1A1A1' },
  'cc-yellow': { id: 'cc-yellow', name: 'Yellow', hex: '#f2d70e' },
  'cc-pink': { id: 'cc-pink', name: 'Pink', hex: '#ffbaec' },
  // Multicolor
  'cc-multicolor': { id: 'cc-multicolor', name: 'Multicolor', hex: '#ff0000' },
  // Resin-specific colors
  'cc-resin-white': { id: 'cc-resin-white', name: 'White', hex: '#FEFFEB' },
  'cc-resin-black': { id: 'cc-resin-black', name: 'Black', hex: '#393937' },
  'cc-resin-gray': { id: 'cc-resin-gray', name: 'Gray', hex: '#a6a8a5' },
  'cc-resin-blue': { id: 'cc-resin-blue', name: 'Blue', hex: '#1f80e0' },
  // PLA/PETG specific hex overrides
  'cc-pla-white': { id: 'cc-pla-white', name: 'White', hex: '#FFFFFF' },
  'cc-pla-black': { id: 'cc-pla-black', name: 'Black', hex: '#000000' },
  'cc-pla-red': { id: 'cc-pla-red', name: 'Red', hex: '#FF0000' },
  'cc-pla-blue': { id: 'cc-pla-blue', name: 'Blue', hex: '#0000FF' },
  'cc-pla-green': { id: 'cc-pla-green', name: 'Green', hex: '#008000' },
  'cc-pla-yellow': { id: 'cc-pla-yellow', name: 'Yellow', hex: '#f2d70e' },
};

// --- Materials ---

export const CRAFTCLOUD_MATERIALS: Material[] = [
  {
    id: 'cc-sls-nylon-pa12',
    name: 'SLS Nylon PA12',
    description: 'Strong, flexible nylon via Selective Laser Sintering. Great for functional parts.',
    colors: [
      CC_COLORS['cc-white'],
      CC_COLORS['cc-black'],
      CC_COLORS['cc-blue'],
      CC_COLORS['cc-red'],
      CC_COLORS['cc-green'],
      CC_COLORS['cc-orange'],
      CC_COLORS['cc-purple'],
    ],
    finishes: [
      CC_FINISHES['cc-sls-standard'],
      CC_FINISHES['cc-sls-vapor-smoothed'],
      CC_FINISHES['cc-sls-polished'],
    ],
  },
  {
    id: 'cc-mjf-nylon-pa12',
    name: 'MJF Nylon PA12',
    description: 'HP Multi Jet Fusion nylon — high strength and fine detail.',
    colors: [
      CC_COLORS['cc-gray'],
      CC_COLORS['cc-black'],
    ],
    finishes: [
      CC_FINISHES['cc-mjf-standard'],
    ],
  },
  {
    id: 'cc-standard-resin',
    name: 'Standard Resin',
    description: 'SLA resin with smooth surface and fine detail. Good for prototypes.',
    colors: [
      CC_COLORS['cc-resin-white'],
      CC_COLORS['cc-resin-black'],
      CC_COLORS['cc-resin-gray'],
      CC_COLORS['cc-resin-blue'],
    ],
    finishes: [
      CC_FINISHES['cc-resin-standard'],
    ],
  },
  {
    id: 'cc-pla',
    name: 'PLA',
    description: 'Affordable FDM plastic, great for prototypes and display models.',
    colors: [
      CC_COLORS['cc-pla-white'],
      CC_COLORS['cc-pla-black'],
      CC_COLORS['cc-pla-red'],
      CC_COLORS['cc-pla-blue'],
      CC_COLORS['cc-pla-green'],
      CC_COLORS['cc-pla-yellow'],
    ],
    finishes: [
      CC_FINISHES['cc-pla-standard'],
    ],
  },
  {
    id: 'cc-petg',
    name: 'PETG',
    description: 'Stronger and more durable than PLA with better chemical resistance.',
    colors: [
      { id: 'cc-petg-white', name: 'White', hex: '#FFFFFF' },
      { id: 'cc-petg-black', name: 'Black', hex: '#000000' },
    ],
    finishes: [
      CC_FINISHES['cc-petg-standard'],
    ],
  },
  {
    id: 'cc-multicolor-pla',
    name: 'Multicolor PLA',
    description: 'Multicolor FDM prints using two or more PLA filaments. Vibrant, visually striking results with precise color transitions.',
    colors: [
      CC_COLORS['cc-multicolor'],
    ],
    finishes: [
      CC_FINISHES['cc-multicolor-pla-standard'],
    ],
  },
  {
    id: 'cc-full-color',
    name: 'High Definition Full Color',
    description: 'High quality full color printing for detailed, vibrant multicolor models.',
    colors: [
      CC_COLORS['cc-multicolor'],
    ],
    finishes: [
      CC_FINISHES['cc-full-color-standard'],
    ],
  },
  {
    id: 'cc-mjf-multicolor',
    name: 'HP MJF Multicolor',
    description: 'HP Multi Jet Fusion with full color. Industrial-grade multicolor printing with strong, functional parts.',
    colors: [
      CC_COLORS['cc-multicolor'],
    ],
    finishes: [
      CC_FINISHES['cc-mjf-multicolor-standard'],
    ],
  },
];

// --- materialConfigId mapping ---
// Maps (baseMaterialId, finishId, colorId) → Craftcloud materialConfigId (UUID)

interface ConfigMapEntry {
  baseMaterialId: string;
  finishId: string;
  colorId: string;
  materialConfigId: string;
}

const CRAFTCLOUD_CONFIG_MAP: ConfigMapEntry[] = [
  // ── SLS Nylon PA12 — Standard ──
  { baseMaterialId: 'cc-sls-nylon-pa12', finishId: 'cc-sls-standard', colorId: 'cc-white',  materialConfigId: '6c633df0-aca1-5b95-aaab-5c19b4e0d24f' },
  { baseMaterialId: 'cc-sls-nylon-pa12', finishId: 'cc-sls-standard', colorId: 'cc-black',  materialConfigId: '85a89241-3e02-553e-b35a-0643d313b7f7' },
  { baseMaterialId: 'cc-sls-nylon-pa12', finishId: 'cc-sls-standard', colorId: 'cc-blue',   materialConfigId: '039a2293-c1ee-5eae-bba9-6a5a2525b1b1' },
  { baseMaterialId: 'cc-sls-nylon-pa12', finishId: 'cc-sls-standard', colorId: 'cc-red',    materialConfigId: 'eaca1f60-1dc8-596d-8be5-e8149f19e339' },
  { baseMaterialId: 'cc-sls-nylon-pa12', finishId: 'cc-sls-standard', colorId: 'cc-green',  materialConfigId: 'bf023866-330f-5cb4-8765-cb6a59af8a35' },
  { baseMaterialId: 'cc-sls-nylon-pa12', finishId: 'cc-sls-standard', colorId: 'cc-orange', materialConfigId: '036b85dd-9ceb-5350-ad18-c91b52fbf7f0' },
  { baseMaterialId: 'cc-sls-nylon-pa12', finishId: 'cc-sls-standard', colorId: 'cc-purple', materialConfigId: '290b607e-1997-5721-9e0e-da1daef0f170' },

  // ── SLS Nylon PA12 — Vapor Smoothed ──
  { baseMaterialId: 'cc-sls-nylon-pa12', finishId: 'cc-sls-vapor-smoothed', colorId: 'cc-white', materialConfigId: '63f83eba-76b0-4014-8076-0e4f1e5b3b0a' },
  { baseMaterialId: 'cc-sls-nylon-pa12', finishId: 'cc-sls-vapor-smoothed', colorId: 'cc-black', materialConfigId: '3451a4f5-0f58-440f-b748-4f53651eeb9c' },
  { baseMaterialId: 'cc-sls-nylon-pa12', finishId: 'cc-sls-vapor-smoothed', colorId: 'cc-blue',  materialConfigId: '6f2facf8-bf25-4272-83c0-aeddbf86969f' },
  { baseMaterialId: 'cc-sls-nylon-pa12', finishId: 'cc-sls-vapor-smoothed', colorId: 'cc-red',   materialConfigId: 'd4836f66-c8dd-4bd1-a305-a80e97e88955' },
  { baseMaterialId: 'cc-sls-nylon-pa12', finishId: 'cc-sls-vapor-smoothed', colorId: 'cc-green', materialConfigId: 'a2dc3386-8e32-4768-8c2b-064d959a570f' },

  // ── SLS Nylon PA12 — Polished ──
  { baseMaterialId: 'cc-sls-nylon-pa12', finishId: 'cc-sls-polished', colorId: 'cc-white', materialConfigId: '717f93b1-443e-584e-8e68-553a36a9d96b' },
  { baseMaterialId: 'cc-sls-nylon-pa12', finishId: 'cc-sls-polished', colorId: 'cc-black', materialConfigId: '6b5faed7-2728-536c-96b4-a129bd62033f' },

  // ── MJF Nylon PA12 — Standard ──
  { baseMaterialId: 'cc-mjf-nylon-pa12', finishId: 'cc-mjf-standard', colorId: 'cc-gray',  materialConfigId: 'd24989d1-3bb4-58ac-a285-07bd8bc7c86a' },
  { baseMaterialId: 'cc-mjf-nylon-pa12', finishId: 'cc-mjf-standard', colorId: 'cc-black', materialConfigId: '086d6fc1-174c-511a-bbf5-fc2d7cc76458' },

  // ── Standard Resin — Standard ──
  { baseMaterialId: 'cc-standard-resin', finishId: 'cc-resin-standard', colorId: 'cc-resin-white', materialConfigId: '6250ed03-5e96-5de8-bf06-44a13b952058' },
  { baseMaterialId: 'cc-standard-resin', finishId: 'cc-resin-standard', colorId: 'cc-resin-black', materialConfigId: 'b29d334f-3e16-5dda-be14-077fef510b04' },
  { baseMaterialId: 'cc-standard-resin', finishId: 'cc-resin-standard', colorId: 'cc-resin-gray',  materialConfigId: '8c77dbf9-21a8-5342-87c1-fd685ec5fdd8' },
  { baseMaterialId: 'cc-standard-resin', finishId: 'cc-resin-standard', colorId: 'cc-resin-blue',  materialConfigId: 'b3241984-ab07-56d3-9a39-21a0ef86d679' },

  // ── PLA — Standard ──
  { baseMaterialId: 'cc-pla', finishId: 'cc-pla-standard', colorId: 'cc-pla-white',  materialConfigId: '83f09fe4-6fd1-5bfa-937c-ce1618fa440f' },
  { baseMaterialId: 'cc-pla', finishId: 'cc-pla-standard', colorId: 'cc-pla-black',  materialConfigId: 'dbd0f115-04e7-5704-887a-c6e7aedfd97d' },
  { baseMaterialId: 'cc-pla', finishId: 'cc-pla-standard', colorId: 'cc-pla-red',    materialConfigId: '8735215b-7fb9-5fcd-a8f4-27a81117d3db' },
  { baseMaterialId: 'cc-pla', finishId: 'cc-pla-standard', colorId: 'cc-pla-blue',   materialConfigId: 'ff1dd05d-3d00-57aa-b959-2f39260cca63' },
  { baseMaterialId: 'cc-pla', finishId: 'cc-pla-standard', colorId: 'cc-pla-green',  materialConfigId: 'b91e38e6-01b8-5459-ad78-f1e0f6bd97e6' },
  { baseMaterialId: 'cc-pla', finishId: 'cc-pla-standard', colorId: 'cc-pla-yellow', materialConfigId: 'f6e1ee55-6d15-58a2-ae42-889fc03e6019' },

  // ── PETG — Standard ──
  { baseMaterialId: 'cc-petg', finishId: 'cc-petg-standard', colorId: 'cc-petg-white', materialConfigId: '9f0ebf71-1059-5aac-9e5f-7a696f4fcbdb' },
  { baseMaterialId: 'cc-petg', finishId: 'cc-petg-standard', colorId: 'cc-petg-black', materialConfigId: '26d219f7-8e2b-5a80-894d-a7aaa9acb1ed' },

  // ── Multicolor PLA — Standard ──
  { baseMaterialId: 'cc-multicolor-pla', finishId: 'cc-multicolor-pla-standard', colorId: 'cc-multicolor', materialConfigId: '6935719d-f4c3-4490-8ace-3a974c5f8b75' },

  // ── High Definition Full Color — Standard ──
  { baseMaterialId: 'cc-full-color', finishId: 'cc-full-color-standard', colorId: 'cc-multicolor', materialConfigId: 'a69b05d8-39b9-5f3e-bd47-9df42b4b84c3' },

  // ── HP MJF Multicolor — Standard ──
  { baseMaterialId: 'cc-mjf-multicolor', finishId: 'cc-mjf-multicolor-standard', colorId: 'cc-multicolor', materialConfigId: '2ceb1286-10b8-4ed6-b40a-9c2042979b28' },
];

/**
 * Resolve a Craftcloud materialConfigId from the user's UI selections.
 * Returns undefined if the combination is not mapped.
 */
export function getCraftcloudMaterialConfigId(
  baseMaterialId: string,
  colorId?: string,
  finishId?: string
): string | undefined {
  const entry = CRAFTCLOUD_CONFIG_MAP.find(
    (e) =>
      e.baseMaterialId === baseMaterialId &&
      e.colorId === (colorId ?? '') &&
      e.finishId === (finishId ?? '')
  );
  return entry?.materialConfigId;
}
