import { useEffect, useState } from 'react';
import { Check, Plus, Star } from 'lucide-react';
import { AddressForm } from './AddressForm';
import { addressService, type AddressInput, type UserAddress } from '../../services/addressService';
import { useAuth } from '../../hooks/useAuth';

interface AddressPickerProps {
  /** Called whenever the selected address changes (either picked from saved or edited in the new-address form). */
  onChange: (selected: AddressInput, saved: UserAddress | null) => void;
  /** Called when the user toggles the "save to my account" checkbox. Only relevant when a new address is entered. */
  onSaveToggle?: (save: boolean) => void;
  initialSaveToAccount?: boolean;
  /** If true, forces the "new address" form open (e.g. when user has no saved addresses). */
  forceNewForm?: boolean;
}

/**
 * Account-aware address picker. For signed-in non-anon users with saved
 * addresses, shows a radio list + a "new address" option. For anon users or
 * users with no addresses, shows only the form.
 *
 * "Save to my account" is a pure hint for the parent — AddressPicker does not
 * write to the DB itself. Parent should call `addressService.saveFromCheckout`
 * after a successful checkout (silent-dedupes matches).
 */
export function AddressPicker({
  onChange,
  onSaveToggle,
  initialSaveToAccount,
  forceNewForm,
}: AddressPickerProps) {
  const { user } = useAuth();
  const isRealUser = !!user && !user.isAnonymous;

  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newAddr, setNewAddr] = useState<AddressInput | null>(null);
  const [saveToAccount, setSaveToAccount] = useState<boolean>(initialSaveToAccount ?? true);
  const [loading, setLoading] = useState(false);

  // Load saved addresses for real users.
  useEffect(() => {
    if (!isRealUser) { setAddresses([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await addressService.list(user!.id);
        if (cancelled) return;
        setAddresses(rows);
        // Auto-select default if nothing picked yet.
        if (!forceNewForm && rows.length > 0 && !selectedId) {
          const pick = rows.find(r => r.is_default) || rows[0];
          setSelectedId(pick.id);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, isRealUser]);

  // Notify parent of selection changes.
  useEffect(() => {
    if (selectedId) {
      const picked = addresses.find(a => a.id === selectedId);
      if (picked) {
        const asInput: AddressInput = {
          label: picked.label,
          first_name: picked.first_name,
          last_name: picked.last_name,
          phone: picked.phone || '',
          address1: picked.address1,
          address2: picked.address2 || '',
          city: picked.city,
          state: picked.state,
          postal_code: picked.postal_code,
          country: picked.country,
        };
        onChange(asInput, picked);
      }
    } else if (newAddr) {
      onChange(newAddr, null);
    }
  }, [selectedId, newAddr, addresses]);

  const showOnlyForm = !isRealUser || forceNewForm || addresses.length === 0;

  if (showOnlyForm) {
    return (
      <div className="space-y-3">
        <div className="bg-white rounded-lg p-4">
          <AddressForm hideSubmit showLabelField={false} onChange={setNewAddr} />
        </div>
        {isRealUser && (
          <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
            <input
              type="checkbox"
              checked={saveToAccount}
              onChange={(e) => { setSaveToAccount(e.target.checked); onSaveToggle?.(e.target.checked); }}
              className="accent-brand-accent"
            />
            Save this address to my account
          </label>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {loading && <p className="text-xs text-white/50">Loading addresses…</p>}

      <div className="space-y-2">
        {addresses.map(a => (
          <button
            key={a.id}
            type="button"
            onClick={() => { setSelectedId(a.id); setNewAddr(null); }}
            className={`w-full text-left rounded-lg border p-3 transition-colors ${
              selectedId === a.id
                ? 'border-brand-accent bg-brand-accent/5'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-white">{a.label}</span>
                  {a.is_default && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-brand-accent bg-brand-accent/10 px-1.5 py-0.5 rounded">
                      <Star className="h-2.5 w-2.5" /> Default
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/60 leading-relaxed">
                  <div>{a.first_name} {a.last_name}</div>
                  <div>{a.address1}{a.address2 ? `, ${a.address2}` : ''}</div>
                  <div>{a.city}, {a.state} {a.postal_code}</div>
                </div>
              </div>
              {selectedId === a.id && <Check className="h-4 w-4 text-brand-accent flex-shrink-0" />}
            </div>
          </button>
        ))}

        <button
          type="button"
          onClick={() => { setSelectedId(null); }}
          className={`w-full text-left rounded-lg border p-3 transition-colors ${
            !selectedId
              ? 'border-brand-accent bg-brand-accent/5'
              : 'border-white/10 bg-white/5 hover:bg-white/10'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Plus className="h-4 w-4 text-brand-accent" />
            Ship to a different address
          </div>
        </button>
      </div>

      {!selectedId && (
        <div className="bg-white rounded-lg p-4 space-y-3">
          <AddressForm hideSubmit showLabelField={false} onChange={setNewAddr} />
          <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={saveToAccount}
              onChange={(e) => { setSaveToAccount(e.target.checked); onSaveToggle?.(e.target.checked); }}
              className="accent-brand-accent"
            />
            Save this address to my account
          </label>
        </div>
      )}
    </div>
  );
}
