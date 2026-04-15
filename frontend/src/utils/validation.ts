// Shared input validation + length caps for forms.
//
// These are *UX* validators — they reject malformed data before it reaches
// Supabase or CraftCloud, they don't defend against SQL injection (supabase-js
// parameterises everything and RLS enforces access control). See notes in the
// cart-checkout build session for threat model.

export const MAX = {
  EMAIL: 254,        // RFC 5321
  NAME: 100,
  PHONE: 20,
  ADDRESS: 200,
  CITY: 100,
  POSTAL: 20,
  LABEL: 50,
  STATE: 2,          // US state code
  COUNTRY: 2,        // ISO alpha-2
} as const;

/** Strip anything that isn't a digit or an allowed formatting character. */
export function sanitizePhoneInput(raw: string): string {
  return raw.replace(/[^0-9+\-\s()]/g, '').slice(0, MAX.PHONE);
}

/** Must contain at least 7 digits to count as a real phone number. */
export function validatePhoneOptional(raw: string | null | undefined): string | null {
  const value = (raw || '').trim();
  if (value === '') return null; // optional
  if (value.length > MAX.PHONE) return `Phone must be ${MAX.PHONE} characters or fewer.`;
  if (!/^[0-9+\-\s()]+$/.test(value)) return 'Phone can only contain numbers, spaces, and ( ) + -.';
  const digits = value.replace(/\D/g, '');
  if (digits.length < 7) return 'Phone number looks too short.';
  if (digits.length > 15) return 'Phone number looks too long.';
  return null;
}

/** Accepts basic "x@y.z" form. Parent should also check length. */
export function validateEmail(raw: string | null | undefined): string | null {
  const value = (raw || '').trim();
  if (value === '') return 'Email is required.';
  if (value.length > MAX.EMAIL) return 'Email is too long.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email.';
  return null;
}

/** US-centric postal check — 5 digits or 5+4. Anything else passes through. */
export function validatePostalCode(raw: string, country: string): string | null {
  const value = (raw || '').trim();
  if (!value) return 'ZIP is required.';
  if (value.length > MAX.POSTAL) return 'ZIP is too long.';
  if (country === 'US' && !/^\d{5}(-\d{4})?$/.test(value)) {
    return 'Enter a 5-digit ZIP (e.g. 94103).';
  }
  return null;
}

export function validateRequired(raw: string | null | undefined, label: string, max = 200): string | null {
  const value = (raw || '').trim();
  if (!value) return `${label} is required.`;
  if (value.length > max) return `${label} is too long (max ${max}).`;
  return null;
}
