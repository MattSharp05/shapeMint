import { useEffect, useState } from 'react';
import { MapPin, Plus, Star, Trash2, Edit2 } from 'lucide-react';
import { Modal } from '../UI/Modal';
import { AddressForm } from './AddressForm';
import { addressService, type UserAddress, type AddressInput } from '../../services/addressService';
import { useAuth } from '../../hooks/useAuth';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Editing =
  | { mode: 'list' }
  | { mode: 'add' }
  | { mode: 'edit'; id: string };

export function AccountModal({ isOpen, onClose }: AccountModalProps) {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Editing>({ mode: 'list' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reload = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const rows = await addressService.list(user.id);
      setAddresses(rows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user && !user.isAnonymous) reload();
    if (!isOpen) setEditing({ mode: 'list' });
  }, [isOpen, user?.id]);

  if (!user || user.isAnonymous) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="My Account">
        <p className="text-sm text-white/70">
          Create an account to save shipping addresses and view your orders.
        </p>
      </Modal>
    );
  }

  const handleCreate = async (input: AddressInput) => {
    setSaving(true);
    setFormError(null);
    try {
      await addressService.create(user.id, input);
      setEditing({ mode: 'list' });
      await reload();
    } catch (e: any) {
      setFormError(e?.message || 'Could not save address.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, input: AddressInput) => {
    setSaving(true);
    setFormError(null);
    try {
      await addressService.update(id, input);
      setEditing({ mode: 'list' });
      await reload();
    } catch (e: any) {
      setFormError(e?.message || 'Could not save address.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    await addressService.setDefault(user.id, id);
    await reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this address?')) return;
    await addressService.remove(user.id, id);
    await reload();
  };

  const editingAddress = editing.mode === 'edit' ? addresses.find(a => a.id === editing.id) : undefined;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="My Account">
      <div className="space-y-4">
        <div className="text-sm text-white/60">
          <div className="font-medium text-white">{user.name || user.email}</div>
          <div className="text-xs">{user.email}</div>
        </div>

        <div className="border-t border-white/10 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-accent" />
              <h3 className="text-sm font-semibold text-white">Shipping Addresses</h3>
            </div>
            {editing.mode === 'list' && (
              <button
                onClick={() => { setFormError(null); setEditing({ mode: 'add' }); }}
                className="flex items-center gap-1 text-xs text-brand-accent hover:text-brand-accent-dark"
              >
                <Plus className="h-3.5 w-3.5" /> Add address
              </button>
            )}
          </div>

          {editing.mode === 'add' && (
            <div className="bg-white rounded-lg p-4">
              <AddressForm
                submitLabel="Save address"
                onSubmit={handleCreate}
                onCancel={() => setEditing({ mode: 'list' })}
                loading={saving}
                error={formError}
              />
            </div>
          )}

          {editing.mode === 'edit' && editingAddress && (
            <div className="bg-white rounded-lg p-4">
              <AddressForm
                submitLabel="Save changes"
                initial={{
                  label: editingAddress.label,
                  first_name: editingAddress.first_name,
                  last_name: editingAddress.last_name,
                  phone: editingAddress.phone || '',
                  address1: editingAddress.address1,
                  address2: editingAddress.address2 || '',
                  city: editingAddress.city,
                  state: editingAddress.state,
                  postal_code: editingAddress.postal_code,
                  country: editingAddress.country,
                }}
                onSubmit={(v) => handleUpdate(editingAddress.id, v)}
                onCancel={() => setEditing({ mode: 'list' })}
                loading={saving}
                error={formError}
              />
            </div>
          )}

          {editing.mode === 'list' && (
            <>
              {loading ? (
                <p className="text-xs text-white/50">Loading…</p>
              ) : addresses.length === 0 ? (
                <p className="text-xs text-white/50">No addresses saved yet.</p>
              ) : (
                <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {addresses.map(a => (
                    <li key={a.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-white">{a.label}</span>
                            {a.is_default && (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-brand-accent bg-brand-accent/10 px-1.5 py-0.5 rounded">
                                <Star className="h-2.5 w-2.5" /> Default
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-white/70 leading-relaxed">
                            <div>{a.first_name} {a.last_name}</div>
                            <div>{a.address1}{a.address2 ? `, ${a.address2}` : ''}</div>
                            <div>{a.city}, {a.state} {a.postal_code}</div>
                            {a.phone && <div className="text-white/40 mt-0.5">{a.phone}</div>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {!a.is_default && (
                            <button
                              onClick={() => handleSetDefault(a.id)}
                              className="text-[10px] text-white/50 hover:text-white"
                              title="Set as default"
                            >
                              Set default
                            </button>
                          )}
                          <button
                            onClick={() => { setFormError(null); setEditing({ mode: 'edit', id: a.id }); }}
                            className="text-white/40 hover:text-white"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(a.id)}
                            className="text-white/40 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
