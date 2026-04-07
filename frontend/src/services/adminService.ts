import { supabase } from '../supabaseClient';

export interface AdminModel {
  id: string;
  user_id: string;
  prompt: string;
  name: string;
  type?: string;
  mode?: string;
  status: string;
  progress?: number;
  print_ready?: boolean;
  glb_url: string;
  stl_url: string;
  obj_url: string;
  thumbnail_url?: string;
  repair_report?: {
    volume_cm3?: number;
    bounding_box_mm?: { x: number; y: number; z: number };
    is_watertight?: boolean;
    is_manifold?: boolean;
    print_ready?: boolean;
  };
  created_at: string;
  updated_at: string;
  // Joined
  user_email?: string;
  user_full_name?: string;
}

export interface AdminOrder {
  id: string;
  user_id: string;
  vendor: string;
  order_number: string;
  vendor_order_id?: string;
  material_id?: string;
  quantity: number;
  status: string;
  item_subtotal?: number;
  shipping_price?: number;
  total_price?: number;
  currency?: string;
  shipping_address?: any;
  last_vendor_status?: any;
  vendor_order_raw?: any;
  model_url?: string;
  created_at: string;
  submitted_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  // Joined
  user_email?: string;
  user_full_name?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
  model_count: number;
  order_count: number;
}

interface PaginatedResult<T> {
  data: T[];
  count: number;
}

const PAGE_SIZE = 25;

class AdminService {
  // Cache of user_id -> email
  private userEmailCache: Record<string, string> = {};
  private emailCacheLoaded = false;

  // Load user emails via the database function (requires admin_get_user_emails to exist)
  async loadUserEmails(): Promise<void> {
    if (this.emailCacheLoaded) return;
    try {
      const { data, error } = await supabase.rpc('admin_get_user_emails');
      if (error) {
        console.warn('Could not load user emails (run the admin SQL migration):', error.message);
        return;
      }
      (data || []).forEach((row: { id: string; email: string }) => {
        this.userEmailCache[row.id] = row.email;
      });
      this.emailCacheLoaded = true;
    } catch (err) {
      console.warn('Failed to load user emails:', err);
    }
  }

  private resolveEmail(userId: string): string {
    return this.userEmailCache[userId] || userId.slice(0, 8) + '...';
  }

  private applyUserEmails<T extends { user_id: string; user_email?: string }>(rows: T[]): T[] {
    return rows.map((row) => ({
      ...row,
      user_email: this.resolveEmail(row.user_id),
    }));
  }

  async fetchModels(page: number, filters?: { status?: string; search?: string }): Promise<PaginatedResult<AdminModel>> {
    await this.loadUserEmails();

    let query = supabase
      .from('generated_models')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.search) {
      query = query.ilike('prompt', `%${filters.search}%`);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error('Failed to fetch models:', error);
      throw error;
    }

    const models = (data || []) as AdminModel[];
    return { data: this.applyUserEmails(models), count: count || 0 };
  }

  async fetchOrders(page: number, filters?: { status?: string; vendor?: string; search?: string }): Promise<PaginatedResult<AdminOrder>> {
    await this.loadUserEmails();

    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.vendor && filters.vendor !== 'all') {
      query = query.eq('vendor', filters.vendor);
    }
    if (filters?.search) {
      query = query.ilike('order_number', `%${filters.search}%`);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error('Failed to fetch orders:', error);
      throw error;
    }

    const orders = (data || []) as AdminOrder[];
    return { data: this.applyUserEmails(orders), count: count || 0 };
  }

  async fetchUsers(page: number, search?: string): Promise<PaginatedResult<AdminUser>> {
    await this.loadUserEmails();

    // Derive users from generated_models and orders user_ids
    const { data: allModels, error: modelsErr } = await supabase
      .from('generated_models')
      .select('user_id');

    if (modelsErr) console.error('Failed to fetch model user_ids:', modelsErr);

    const { data: allOrders, error: ordersErr } = await supabase
      .from('orders')
      .select('user_id');

    if (ordersErr) console.error('Failed to fetch order user_ids:', ordersErr);

    // Build unique user map with counts
    const userMap: Record<string, { model_count: number; order_count: number }> = {};

    (allModels || []).forEach((m: any) => {
      if (!userMap[m.user_id]) userMap[m.user_id] = { model_count: 0, order_count: 0 };
      userMap[m.user_id].model_count++;
    });
    (allOrders || []).forEach((o: any) => {
      if (!userMap[o.user_id]) userMap[o.user_id] = { model_count: 0, order_count: 0 };
      userMap[o.user_id].order_count++;
    });

    let userEntries = Object.entries(userMap).map(([id, counts]) => ({
      id,
      email: this.resolveEmail(id),
      full_name: undefined as string | undefined,
      created_at: '',
      ...counts,
    }));

    if (search) {
      const s = search.toLowerCase();
      userEntries = userEntries.filter(
        (u) => u.email.toLowerCase().includes(s) || u.id.toLowerCase().includes(s)
      );
    }

    // Sort by model count descending
    userEntries.sort((a, b) => b.model_count - a.model_count);

    const total = userEntries.length;
    const paged = userEntries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return { data: paged, count: total };
  }
}

export const adminService = new AdminService();
export { PAGE_SIZE };
