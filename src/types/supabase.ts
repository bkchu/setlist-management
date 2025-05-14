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
      songs: {
        Row: {
          id: string
          title: string
          artist: string
          notes: string
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          title: string
          artist: string
          notes?: string
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          title?: string
          artist?: string
          notes?: string
          created_at?: string
          updated_at?: string
          user_id?: string
        }
      }
      setlists: {
        Row: {
          id: string
          name: string
          date: string
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          date: string
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          name?: string
          date?: string
          created_at?: string
          updated_at?: string
          user_id?: string
        }
      }
      setlist_songs: {
        Row: {
          id: string
          setlist_id: string
          song_id: string
          order: number
          key: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          setlist_id: string
          song_id: string
          order: number
          key?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          setlist_id?: string
          song_id?: string
          order?: number
          key?: string | null
          notes?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}