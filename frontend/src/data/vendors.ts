// Vendor data with Shapeways and Slant3D materials and colors for Phase 1
// Data revised per user specifications with Colors and Materials/Finishes separation

import { Vendor, Material, Color, Finish, MaterialCombination } from '../types/order';
import { CRAFTCLOUD_MATERIALS } from './craftcloudMaterials';

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
    description: 'Fast and affordable 3D printing',
    enabled: true,
  },
  {
    id: 'treatstock',
    name: 'Treatstock',
    description: 'Marketplace with multiple 3D printing providers',
    enabled: true,
  },
  {
    id: 'craftcloud',
    name: 'Craftcloud',
    description: 'Best prices from competing 3D printing vendors worldwide',
    enabled: true,
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
  { id: 'clear', name: 'Clear', swatchUrl: 'https://www.shapeways.com/wp-content/uploads/2025/05/SLA.png' },
];

// Finishes - shared across multiple materials with correct swatch URLs
export const SHAPEWAYS_FINISHES: Finish[] = [
  { 
    id: 'default-nylonpa12-sls+fullcolor', 
    name: 'Default', 
    description: 'This finish has a slightly textured surface and a matte finish.',
    swatchUrl: 'https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg'
  },
  { 
    id: 'default-nylonpa12-mjf', 
    name: 'Default', 
    description: 'Nylon 12 material with a matte finish and slightly grainy feel.',
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
    description: 'Light polishing to achieve a matte, somewhat textured surface.',
    swatchUrl: 'https://www.shapeways.com/files/cms/materials/swatches/Natural.jpg'
  },
  { 
    id: 'polished', 
    name: 'Polished', 
    description: 'Hand-polished to achieve a smooth, shiny surface.',
  },
  { 
    id: 'vermell', 
    name: 'Vermell', 
    description: 'Polished Silver with 2.5 μm 18K Yellow Gold Plating.',
  },
  { 
    id: '14k', 
    name: '14K', 
    description: 'Smooth and shiny for a professional finish.',
  },
  { 
    id: '18k', 
    name: '18K', 
    description: 'Smooth and shiny for a professional finish.',
  },
  { 
    id: 'goldplated-brass-layer-thickness', 
    name: 'Layer Thickness 2.5 μm', 
    description: 'Thickness of plating on Brass',
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
      SHAPEWAYS_FINISHES.find(f => f.id === 'default-nylonpa12-sls+fullcolor')!,
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
      SHAPEWAYS_FINISHES.find(f => f.id === 'default-nylonpa12-sls+fullcolor')!,
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
      SHAPEWAYS_FINISHES.find(f => f.id === 'default-nylonpa12-mjf')!,
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
      SHAPEWAYS_FINISHES.find(f => f.id === 'goldplated-brass-layer-thickness')!,
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
  {
    id: 'sla-watershed',
    name: 'SLA - Somos® Watershed',
    description: 'High-resolution stereolithography (SLA) printing with excellent detail and smooth surface finish. Perfect for prototypes, models, and parts requiring fine detail.',
    swatchUrl: 'https://www.shapeways.com/wp-content/uploads/2025/05/SLA.png',
    colors: [
      SHAPEWAYS_COLORS.find(c => c.id === 'clear')!,
      SHAPEWAYS_COLORS.find(c => c.id === 'black')!,
    ],
    finishes: [
      // SLA materials typically have a default finish (no additional finishes available)
      { 
        id: 'default-sla', 
        name: 'Default', 
        description: 'Standard SLA finish with smooth surface',
        swatchUrl: 'https://www.shapeways.com/wp-content/uploads/2025/05/SLA.png'
      },
    ],
  },
];

// Material combinations that map to specific Shapeways materialIds
// This is the lookup table for the internal logic mapping
export const MATERIAL_COMBINATIONS: MaterialCombination[] = [
  // Nylon PA12 (SLS) combinations
  { materialId: '6', baseMaterialId: 'nylon-pa12-sls', colorId: 'white', finishId: 'default-nylonpa12-sls+fullcolor' },
  { materialId: '25', baseMaterialId: 'nylon-pa12-sls', colorId: 'black', finishId: 'default-nylonpa12-sls+fullcolor' },
  { materialId: '236', baseMaterialId: 'nylon-pa12-sls', colorId: 'blue', finishId: 'vapor-smoothing' },
  { materialId: '75', baseMaterialId: 'nylon-pa12-sls', colorId: 'purple', finishId: 'default-nylonpa12-sls+fullcolor' },
  { materialId: '76', baseMaterialId: 'nylon-pa12-sls', colorId: 'red', finishId: 'default-nylonpa12-sls+fullcolor' },
  { materialId: '95', baseMaterialId: 'nylon-pa12-sls', colorId: 'orange', finishId: 'default-nylonpa12-sls+fullcolor' },
  { materialId: '93', baseMaterialId: 'nylon-pa12-sls', colorId: 'yellow', finishId: 'default-nylonpa12-sls+fullcolor' },
  { materialId: '94', baseMaterialId: 'nylon-pa12-sls', colorId: 'green', finishId: 'default-nylonpa12-sls+fullcolor' },
  { materialId: '78', baseMaterialId: 'nylon-pa12-sls', colorId: 'blue', finishId: 'default-nylonpa12-sls+fullcolor' },
  
  // MJF Nylon PA12 combinations
  { materialId: '131', baseMaterialId: 'nylon-pa12-mjf', colorId: 'black', finishId: 'default-nylonpa12-mjf' },
  { materialId: '130', baseMaterialId: 'nylon-pa12-mjf', colorId: 'grey', finishId: 'default-nylonpa12-mjf' },
  
  // Silver combinations
  { materialId: '53', baseMaterialId: 'silver-casting', finishId: 'natural' },
  { materialId: '54', baseMaterialId: 'silver-casting', finishId: 'polished' },
  
  // SLA Watershed combinations
  { materialId: '328', baseMaterialId: 'sla-watershed', colorId: 'clear', finishId: 'default-sla' },
  { materialId: '329', baseMaterialId: 'sla-watershed', colorId: 'black', finishId: 'default-sla' },
  
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

// Slant3D Materials (Filaments)
// Slant3D uses a simpler model - just filaments (materials) with colors
// Filaments are fetched from the API, but we provide a basic set for UI
export const SLANT3D_MATERIALS: Material[] = [
  {
    id: 'pla-black',
    name: 'PLA Black',
    description: 'Standard PLA filament in black',
    swatchUrl: 'https://via.placeholder.com/100x100/000000/FFFFFF?text=PLA+Black',
    colors: [
      { id: 'black', name: 'Black', hex: '#000000' }
    ],
    finishes: []
  },
  {
    id: 'pla-white',
    name: 'PLA White',
    description: 'Standard PLA filament in white',
    swatchUrl: 'https://via.placeholder.com/100x100/FFFFFF/000000?text=PLA+White',
    colors: [
      { id: 'white', name: 'White', hex: '#FFFFFF' }
    ],
    finishes: []
  },
  {
    id: 'petg-black',
    name: 'PETG Black',
    description: 'PETG filament in black - stronger and more durable than PLA',
    swatchUrl: 'https://via.placeholder.com/100x100/1a1a1a/FFFFFF?text=PETG+Black',
    colors: [
      { id: 'black', name: 'Black', hex: '#1a1a1a' }
    ],
    finishes: []
  },
  {
    id: 'petg-white',
    name: 'PETG White',
    description: 'PETG filament in white - stronger and more durable than PLA',
    swatchUrl: 'https://via.placeholder.com/100x100/FAFAFA/000000?text=PETG+White',
    colors: [
      { id: 'white', name: 'White', hex: '#FAFAFA' }
    ],
    finishes: []
  }
];

// Helper to get all materials for a vendor
export function getMaterialsForVendor(vendorId: string): Material[] {
  if (vendorId === 'shapeways') {
    return SHAPEWAYS_MATERIALS;
  } else if (vendorId === 'slant3d') {
    return SLANT3D_MATERIALS;
  } else if (vendorId === 'treatstock') {
    // For now use a simple generic material for Treatstock.
    // Treatstock pricing is driven by their own material groups,
    // which are selected at quote time from provider options.
    return [
      {
        id: 'treatstock-pla',
        name: 'PLA (Generic)',
        description: 'Standard PLA-like plastic suitable for most prototypes',
        swatchUrl: 'https://via.placeholder.com/100x100/FFFFFF/000000?text=PLA',
        colors: [
          { id: 'white', name: 'White', hex: '#FFFFFF' },
        ],
        finishes: [],
      },
    ];
  } else if (vendorId === 'craftcloud') {
    return CRAFTCLOUD_MATERIALS;
  }
  return [];
}
