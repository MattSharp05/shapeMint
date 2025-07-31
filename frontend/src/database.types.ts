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
      generated_models: {
        Row: {
          id: string
          user_id: string | null
          name: string
          prompt: string | null
          style: string
          obj_url: string | null
          stl_url: string | null
          glb_url: string | null
          status: string
          created_at: string
          updated_at: string
          thumbnail_url: string | null
          thumbnail_angles: Json
          thumbnail_selected: number
          thumbnail_custom: boolean
          thumbnail_status: string
          thumbnail_error: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          prompt?: string | null
          style?: string
          obj_url?: string | null
          stl_url?: string | null
          glb_url?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          thumbnail_url?: string | null
          thumbnail_angles?: Json
          thumbnail_selected?: number
          thumbnail_custom?: boolean
          thumbnail_status?: string
          thumbnail_error?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          prompt?: string | null
          style?: string
          obj_url?: string | null
          stl_url?: string | null
          glb_url?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          thumbnail_url?: string | null
          thumbnail_angles?: Json
          thumbnail_selected?: number
          thumbnail_custom?: boolean
          thumbnail_status?: string
          thumbnail_error?: string | null
        }
      }
      thumbnail_processing_queue: {
        Row: {
          id: string
          model_id: string
          status: string
          priority: number
          attempts: number
          max_attempts: number
          created_at: string
          updated_at: string
          error_message: string | null
          processing_started_at: string | null
        }
        Insert: {
          id?: string
          model_id: string
          status?: string
          priority?: number
          attempts?: number
          max_attempts?: number
          created_at?: string
          updated_at?: string
          error_message?: string | null
          processing_started_at?: string | null
        }
        Update: {
          id?: string
          model_id?: string
          status?: string
          priority?: number
          attempts?: number
          max_attempts?: number
          created_at?: string
          updated_at?: string
          error_message?: string | null
          processing_started_at?: string | null
        }
      }
    }
  }
}
