export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  stripe_customer_id?: string;
  created_at: string;
  updated_at: string;
}
