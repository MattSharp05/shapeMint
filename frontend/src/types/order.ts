// Order-related type definitions for Phase 1 wizard

export interface Vendor {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  logo?: string;
}

export interface Material {
  id: string;
  name: string;
  description?: string;
  swatchUrl?: string;
  colors: Color[];
  finishes: Finish[];
}

export interface Color {
  id: string;
  name: string;
  swatchUrl?: string;
  hex?: string;
}

export interface Finish {
  id: string;
  name: string;
  description?: string;
  swatchUrl?: string;
}

// Material combination that maps to a specific Shapeways materialId
export interface MaterialCombination {
  materialId: string; // Shapeways API materialId
  baseMaterialId: string; // Our internal material ID
  colorId?: string; // Our internal color ID (if applicable)
  finishId?: string; // Our internal finish ID (if applicable)
}

export interface ShippingInfo {
  firstName: string;
  lastName: string;
  middleName?: string;
  address1: string;
  address2?: string;
  address3?: string;
  company?: string;
  city: string;
  state: string; // 2-letter US state code
  postalCode: string;
  country: string; // 'US'
  phone: string;
  email?: string; // Added for quote requirement
  quantity?: number; // Number of items to order
}

export interface OrderWizardState {
  modelData?: any;
  modelUrl?: string;
  stlUrl?: string;
  vendorId?: string;
  materialId?: string;
  colorId?: string;
  finishId?: string;
  shippingInfo?: Partial<ShippingInfo>;
}

// US States mapping for dropdown
export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' }
] as const;
