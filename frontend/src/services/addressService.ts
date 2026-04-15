import { supabase } from '../supabaseClient';

export interface UserAddress {
  id: string;
  user_id: string;
  label: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type AddressInput = Omit<
  UserAddress,
  'id' | 'user_id' | 'is_default' | 'created_at' | 'updated_at'
>;

const TABLE = 'user_addresses';

// Fields used to detect duplicate addresses when the "save to account"
// checkbox at checkout would otherwise create a copy of an existing one.
const DUPE_KEYS: (keyof AddressInput)[] = [
  'first_name', 'last_name', 'address1', 'address2',
  'city', 'state', 'postal_code', 'country',
];

function normalize(v: string | null | undefined): string {
  return (v || '').trim().toLowerCase();
}

function isDuplicate(a: UserAddress, b: AddressInput): boolean {
  return DUPE_KEYS.every(k => normalize((a as any)[k]) === normalize((b as any)[k]));
}

export const addressService = {
  async list(userId: string): Promise<UserAddress[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  /**
   * Create an address. If it's the user's first, it becomes default automatically.
   * If `setDefault` is true, clears the existing default first.
   */
  async create(userId: string, input: AddressInput, opts?: { setDefault?: boolean }): Promise<UserAddress> {
    const existing = await addressService.list(userId);
    const shouldBeDefault = existing.length === 0 || !!opts?.setDefault;

    if (shouldBeDefault && existing.length > 0) {
      await supabase.from(TABLE).update({ is_default: false }).eq('user_id', userId).eq('is_default', true);
    }

    const { data, error } = await supabase
      .from(TABLE)
      .insert({ user_id: userId, ...input, is_default: shouldBeDefault })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Save an address from checkout. Silently skips if a matching address already exists.
   * Returns the existing or newly created row.
   */
  async saveFromCheckout(userId: string, input: AddressInput): Promise<UserAddress> {
    const existing = await addressService.list(userId);
    const match = existing.find(a => isDuplicate(a, input));
    if (match) return match;
    return addressService.create(userId, input);
  },

  async update(id: string, input: Partial<AddressInput>): Promise<UserAddress> {
    const { data, error } = await supabase
      .from(TABLE)
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async setDefault(userId: string, id: string): Promise<void> {
    await supabase.from(TABLE).update({ is_default: false }).eq('user_id', userId).eq('is_default', true);
    const { error } = await supabase.from(TABLE).update({ is_default: true }).eq('id', id);
    if (error) throw error;
  },

  /**
   * Delete an address. If it was the default, auto-promote the most recently created
   * remaining address to default.
   */
  async remove(userId: string, id: string): Promise<void> {
    const { data: row } = await supabase.from(TABLE).select('is_default').eq('id', id).maybeSingle();
    const wasDefault = !!row?.is_default;

    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;

    if (wasDefault) {
      const { data: next } = await supabase
        .from(TABLE)
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (next?.id) {
        await supabase.from(TABLE).update({ is_default: true }).eq('id', next.id);
      }
    }
  },

  async getDefault(userId: string): Promise<UserAddress | null> {
    const { data } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .maybeSingle();
    return data || null;
  },
};
