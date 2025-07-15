export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string
          avatar_url: string | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          display_name: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          display_name?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
