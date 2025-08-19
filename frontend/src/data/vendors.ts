// Vendor data with Shapeways materials and colors for Phase 1
// Data revised per user specifications with Colors and Materials/Finishes separation

import { Vendor, Material, Color, Finish, MaterialCombination } from '../types/order';

export const VENDORS: Vendor[] = [
  {
    id: 'shapeways',
    name: 'Shapeways',
    description: 'Professional 3D printing with premium materials',
    enabled: true,
  },
  {
    id: 'slant3d',
    name: 'Slant3D',
    description: 'Coming soon - Fast and affordable 3D printing',
    enabled: false, // Disabled for Phase 1
  },
];

// Colors - shared across multiple materials with correct Shapeways swatch URLs
export const SHAPEWAYS_COLORS: Color[] = [
  { id: 'white', name: 'White', swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg' },
  { id: 'black', name: 'Black', swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg' },
  { id: 'pink', name: 'Pink', swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/swatch-pink-20140702.png' },
  { id: 'red', name: 'Red', swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/swatch-coral-red.jpg' },
  { id: 'orange', name: 'Orange', swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/swatch-orange.png' },
  { id: 'blue', name: 'Blue', swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/swatch-royal-blue.jpg' },
  { id: 'green', name: 'Green', swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/swatch-green.png' },
  { id: 'yellow', name: 'Yellow', swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/VP-Smooth-Swatch-Yellow.jpg' },
  { id: 'purple', name: 'Purple', swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/swatch-violet-purple.jpg' },
  { id: 'grey', name: 'Grey', swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/swatch-bsf-gray.png' },
  { id: 'gold-yellow', name: 'Yellow Gold', swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/swatch-14k-gold-20140702.png' },
  { id: 'gold-white', name: 'White Gold', swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/swatch-white-gold-20150206.png' },
  { id: 'gold-rose', name: 'Rose Gold', swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/swatch-rose-gold-20150206.png' },
  { id: '14k-yellow-gold', name: '14K Yellow Gold', swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/swatch-plated-brass-14k.png' },
  { id: '18k-yellow-gold', name: '18K Yellow Gold', swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/swatch-plated-brass-18k.png' },
  { id: '14k-rose-gold', name: '14K Rose Gold', swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/swatch-plated-brass-14k-rose.png' },
];

// Finishes - shared across multiple materials with correct swatch URLs
export const SHAPEWAYS_FINISHES: Finish[] = [
  { 
    id: 'default', 
    name: 'Default', 
    description: 'This finish has a slightly textured surface and a matte finish.',
    swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg'
  },
  { 
    id: 'vapor-smoothing', 
    name: 'Vapor Smoothing', 
    description: 'This finish has a smooth surface and slight shine, created using a physio-chemical process to vapor smooth the surface.',
    swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/VP-Smooth-Swatch-Blue.jpg'
  },
  { 
    id: 'natural', 
    name: 'Natural', 
    description: 'Unpolished natural finish',
    swatchUrl: 'https://www.shapeways.com/files/cms/materials/swatches/Natural.jpg'
  },
  { 
    id: 'polished', 
    name: 'Polished', 
    description: 'High-shine polished finish',
    swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/swatch-polished-brass-20140116.png'
  },
  { 
    id: 'vermell', 
    name: 'Vermell', 
    description: 'Gold-plated silver finish',
    swatchUrl: 'https://www.shapeways.com/files/cms/materials/swatches/Natural.jpg'
  },
  { 
    id: '14k', 
    name: '14K', 
    description: '14 karat gold',
    swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/swatch-14k-gold-20140702.png'
  },
  { 
    id: '18k', 
    name: '18K', 
    description: '18 karat gold',
    swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/swatch-14k-gold-20140702.png'
  },
];

// Materials with their available colors and finishes - updated swatch URLs
export const SHAPEWAYS_MATERIALS: Material[] = [
  // ⭐ FEATURED: Multi-Color Option
  {
    id: 'full-color-nylon-12-mjf',
    name: '🌈 Full Color Nylon 12 (MJF)',
    description: '✨ MULTI-COLOR PRINTING ✨ - Perfect for models with vibrant colors, textures, and detailed designs. Choose this option if you want your model printed in full color instead of a single color.',
    swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/sandstone_full_color.jpg',
    colors: [], // Full color has no specific color selection
    finishes: [
      SHAPEWAYS_FINISHES.find(f => f.id === 'default')!,
      SHAPEWAYS_FINISHES.find(f => f.id === 'vapor-smoothing')!,
    ],
  },
  
  // Standard Single-Color Options
  {
    id: 'nylon-pa12-sls',
    name: 'Nylon PA12 (SLS)',
    description: 'Strong, flexible nylon printed using Selective Laser Sintering',
    swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg',
    colors: [
      SHAPEWAYS_COLORS.find(c => c.id === 'white')!,
      SHAPEWAYS_COLORS.find(c => c.id === 'black')!,
      SHAPEWAYS_COLORS.find(c => c.id === 'pink')!,
      SHAPEWAYS_COLORS.find(c => c.id === 'red')!,
      SHAPEWAYS_COLORS.find(c => c.id === 'orange')!,
      SHAPEWAYS_COLORS.find(c => c.id === 'blue')!,
      SHAPEWAYS_COLORS.find(c => c.id === 'green')!,
      SHAPEWAYS_COLORS.find(c => c.id === 'yellow')!,
      SHAPEWAYS_COLORS.find(c => c.id === 'purple')!,
    ],
    finishes: [
      SHAPEWAYS_FINISHES.find(f => f.id === 'default')!,
      SHAPEWAYS_FINISHES.find(f => f.id === 'vapor-smoothing')!,
    ],
  },
  {
    id: 'nylon-pa12-mjf',
    name: 'Nylon PA12 (MJF)',
    description: 'Multi Jet Fusion nylon - high strength and detail',
    swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/swatch-bsf-gray.png',
    colors: [
      SHAPEWAYS_COLORS.find(c => c.id === 'grey')!,
      SHAPEWAYS_COLORS.find(c => c.id === 'black')!,
    ],
    finishes: [
      SHAPEWAYS_FINISHES.find(f => f.id === 'default')!,
    ],
  },
  {
    id: 'brass-casting',
    name: 'Brass (Casting)',
    description: 'Investment cast brass with excellent detail',
    swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/swatch-raw-brass-20140116.png',
    colors: [],
    finishes: [
      SHAPEWAYS_FINISHES.find(f => f.id === 'natural')!,
      SHAPEWAYS_FINISHES.find(f => f.id === 'polished')!,
    ],
  },
  {
    id: 'bronze-casting',
    name: 'Bronze (Casting)',
    description: 'Investment cast bronze with rich appearance',
    swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/swatch-raw-bronze-20140116.png',
    colors: [],
    finishes: [
      SHAPEWAYS_FINISHES.find(f => f.id === 'natural')!,
      SHAPEWAYS_FINISHES.find(f => f.id === 'polished')!,
    ],
  },
  {
    id: 'silver-casting',
    name: 'Silver (Casting)',
    description: 'Investment cast sterling silver',
    swatchUrl: 'https://www.shapeways.com/files/cms/materials/swatches/Natural.jpg',
    colors: [],
    finishes: [
      SHAPEWAYS_FINISHES.find(f => f.id === 'natural')!,
      SHAPEWAYS_FINISHES.find(f => f.id === 'polished')!,
      SHAPEWAYS_FINISHES.find(f => f.id === 'vermell')!,
    ],
  },
  {
    id: 'gold-casting',
    name: 'Gold (Casting)',
    description: 'Investment cast solid gold',
    swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/swatch-14k-gold-20140702.png',
    colors: [
      SHAPEWAYS_COLORS.find(c => c.id === 'gold-yellow')!,
      SHAPEWAYS_COLORS.find(c => c.id === 'gold-white')!,
      SHAPEWAYS_COLORS.find(c => c.id === 'gold-rose')!,
    ],
    finishes: [
      SHAPEWAYS_FINISHES.find(f => f.id === '14k')!,
      SHAPEWAYS_FINISHES.find(f => f.id === '18k')!,
    ],
  },
  {
    id: 'gold-plated-brass-casting',
    name: 'Gold Plated Brass (Casting)',
    description: 'Brass base with gold plating',
    swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/swatch-plated-brass-14k.png',
    colors: [
      SHAPEWAYS_COLORS.find(c => c.id === '14k-yellow-gold')!,
      SHAPEWAYS_COLORS.find(c => c.id === '18k-yellow-gold')!,
      SHAPEWAYS_COLORS.find(c => c.id === '14k-rose-gold')!,
    ],
    finishes: [
      SHAPEWAYS_FINISHES.find(f => f.id === 'default')!,
    ],
  },
  {
    id: 'copper-casting',
    name: 'Copper (Casting)',
    description: 'Investment cast copper with distinctive color',
    swatchUrl: 'https://www.shapeways.com/files/cms/materials/swatches/swatch-copper.jpg',
    colors: [],
    finishes: [
      SHAPEWAYS_FINISHES.find(f => f.id === 'natural')!,
      SHAPEWAYS_FINISHES.find(f => f.id === 'polished')!,
    ],
  },
];

// Material combinations that map to specific Shapeways materialIds
// This is the lookup table for the internal logic mapping
export const MATERIAL_COMBINATIONS: MaterialCombination[] = [
  // Nylon PA12 (SLS) combinations
  { materialId: '6', baseMaterialId: 'nylon-pa12-sls', colorId: 'white', finishId: 'default' },
  { materialId: '25', baseMaterialId: 'nylon-pa12-sls', colorId: 'black', finishId: 'default' },
  { materialId: '236', baseMaterialId: 'nylon-pa12-sls', colorId: 'blue', finishId: 'vapor-smoothing' },
  { materialId: '75', baseMaterialId: 'nylon-pa12-sls', colorId: 'purple', finishId: 'default' },
  { materialId: '76', baseMaterialId: 'nylon-pa12-sls', colorId: 'red', finishId: 'default' },
  { materialId: '77', baseMaterialId: 'nylon-pa12-sls', colorId: 'orange', finishId: 'default' },
  { materialId: '78', baseMaterialId: 'nylon-pa12-sls', colorId: 'yellow', finishId: 'default' },
  { materialId: '79', baseMaterialId: 'nylon-pa12-sls', colorId: 'green', finishId: 'default' },
  { materialId: '80', baseMaterialId: 'nylon-pa12-sls', colorId: 'blue', finishId: 'default' },
  
  // MJF Nylon PA12 combinations
  { materialId: '320', baseMaterialId: 'nylon-pa12-mjf', colorId: 'black', finishId: 'default' },
  { materialId: '326', baseMaterialId: 'nylon-pa12-mjf', colorId: 'grey', finishId: 'vapor-smoothing' },
  
  // Silver combinations
  { materialId: '53', baseMaterialId: 'silver-casting', finishId: 'natural' },
  { materialId: '54', baseMaterialId: 'silver-casting', finishId: 'polished' },
  
  // Add more combinations as needed based on the API documentation
];

// Helper functions
export function getMaterialById(materialId: string): Material | undefined {
  return SHAPEWAYS_MATERIALS.find(material => material.id === materialId);
}

export function getColorById(colorId: string): Color | undefined {
  return SHAPEWAYS_COLORS.find(color => color.id === colorId);
}

export function getFinishById(finishId: string): Finish | undefined {
  return SHAPEWAYS_FINISHES.find(finish => finish.id === finishId);
}

export function getVendorById(vendorId: string): Vendor | undefined {
  return VENDORS.find(vendor => vendor.id === vendorId);
}

// Get the Shapeways materialId for a given combination
export function getShapewaysMaterialId(baseMaterialId: string, colorId?: string, finishId?: string): string | undefined {
  const combination = MATERIAL_COMBINATIONS.find(combo => 
    combo.baseMaterialId === baseMaterialId &&
    combo.colorId === colorId &&
    combo.finishId === finishId
  );
  return combination?.materialId;
}
