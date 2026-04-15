import { useEffect, useState } from 'react';
import { Button } from '../UI/Button';
import { US_STATES } from '../../types/order';
import type { AddressInput } from '../../services/addressService';
import {
  MAX,
  sanitizePhoneInput,
  validatePhoneOptional,
  validatePostalCode,
  validateRequired,
} from '../../utils/validation';

interface AddressFormProps {
  initial?: Partial<AddressInput>;
  submitLabel?: string;
  showLabelField?: boolean;
  /** When provided, the submit button is hidden and parent listens to onChange. */
  hideSubmit?: boolean;
  onSubmit?: (value: AddressInput) => Promise<void> | void;
  onChange?: (value: AddressInput) => void;
  onCancel?: () => void;
  loading?: boolean;
  error?: string | null;
}

const EMPTY: AddressInput = {
  label: 'Home',
  first_name: '',
  last_name: '',
  phone: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'US',
};

export function AddressForm({
  initial,
  submitLabel = 'Save',
  showLabelField = true,
  hideSubmit,
  onSubmit,
  onChange,
  onCancel,
  loading,
  error,
}: AddressFormProps) {
  const [form, setForm] = useState<AddressInput>({ ...EMPTY, ...initial });
  const [localError, setLocalError] = useState<string | null>(null);
  // Live error for phone only — surfaces inline so users correct it as they type.
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const set = <K extends keyof AddressInput>(k: K, v: AddressInput[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handlePhoneChange = (raw: string) => {
    const cleaned = sanitizePhoneInput(raw);
    set('phone', cleaned);
    // Only show validation error when the field has been touched AND has a value;
    // empty phone is allowed (optional).
    setPhoneError(cleaned ? validatePhoneOptional(cleaned) : null);
  };

  // Fire onChange whenever form mutates.
  useEffect(() => { onChange?.(form); }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const checks: (string | null)[] = [
      validateRequired(form.first_name, 'First name', MAX.NAME),
      validateRequired(form.last_name, 'Last name', MAX.NAME),
      validateRequired(form.address1, 'Street address', MAX.ADDRESS),
      validateRequired(form.city, 'City', MAX.CITY),
      validateRequired(form.state, 'State'),
      validatePostalCode(form.postal_code, form.country || 'US'),
      validatePhoneOptional(form.phone),
      // address2 is optional but capped.
      form.address2 && form.address2.length > MAX.ADDRESS
        ? `Address line 2 is too long (max ${MAX.ADDRESS}).`
        : null,
      form.label && form.label.length > MAX.LABEL
        ? `Label is too long (max ${MAX.LABEL}).`
        : null,
    ];
    const first = checks.find(Boolean);
    if (first) { setLocalError(first); return; }

    await onSubmit?.(form);
  };

  const baseInput = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm';

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      {showLabelField && (
        <input
          className={baseInput}
          placeholder="Label (e.g. Home, Office)"
          maxLength={MAX.LABEL}
          value={form.label}
          onChange={e => set('label', e.target.value)}
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <input
          className={baseInput}
          placeholder="First name *"
          maxLength={MAX.NAME}
          value={form.first_name}
          onChange={e => set('first_name', e.target.value)}
          autoComplete="given-name"
        />
        <input
          className={baseInput}
          placeholder="Last name *"
          maxLength={MAX.NAME}
          value={form.last_name}
          onChange={e => set('last_name', e.target.value)}
          autoComplete="family-name"
        />
      </div>

      <div>
        <input
          className={baseInput}
          type="tel"
          inputMode="tel"
          placeholder="Phone (optional)"
          maxLength={MAX.PHONE}
          value={form.phone || ''}
          onChange={e => handlePhoneChange(e.target.value)}
          autoComplete="tel"
        />
        {phoneError && <p className="mt-1 text-xs text-red-500">{phoneError}</p>}
      </div>

      <input
        className={baseInput}
        placeholder="Street address *"
        maxLength={MAX.ADDRESS}
        value={form.address1}
        onChange={e => set('address1', e.target.value)}
        autoComplete="address-line1"
      />
      <input
        className={baseInput}
        placeholder="Apt, suite (optional)"
        maxLength={MAX.ADDRESS}
        value={form.address2 || ''}
        onChange={e => set('address2', e.target.value)}
        autoComplete="address-line2"
      />

      <div className="grid grid-cols-3 gap-3">
        <input
          className={baseInput}
          placeholder="City *"
          maxLength={MAX.CITY}
          value={form.city}
          onChange={e => set('city', e.target.value)}
          autoComplete="address-level2"
        />
        <select
          className={baseInput}
          value={form.state}
          onChange={e => set('state', e.target.value)}
          autoComplete="address-level1"
        >
          <option value="">State *</option>
          {US_STATES.map((s: { code: string; name: string }) => (
            <option key={s.code} value={s.code}>{s.code}</option>
          ))}
        </select>
        <input
          className={baseInput}
          placeholder="ZIP *"
          maxLength={MAX.POSTAL}
          value={form.postal_code}
          onChange={e => set('postal_code', e.target.value)}
          autoComplete="postal-code"
          inputMode="numeric"
        />
      </div>

      {(error || localError) && <div className="text-sm text-red-500">{error || localError}</div>}

      {!hideSubmit && (
        <div className="flex gap-2 pt-1">
          <Button type="submit" loading={loading}>{submitLabel}</Button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-white/60 hover:text-white">
              Cancel
            </button>
          )}
        </div>
      )}
    </form>
  );
}
