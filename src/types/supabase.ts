export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      join_codes: {
        Row: {
          code: string;
          created_at: string | null;
          created_by: string;
          expires_at: string;
          id: string;
          organization_id: string;
          used_at: string | null;
          used_by: string | null;
          used_by_name: string | null;
          used_by_email: string | null;
        };
        Insert: {
          code: string;
          created_at?: string | null;
          created_by: string;
          expires_at: string;
          id?: string;
          organization_id: string;
          used_at?: string | null;
          used_by?: string | null;
          used_by_name?: string | null;
          used_by_email?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string | null;
          created_by?: string;
          expires_at?: string;
          id?: string;
          organization_id?: string;
          used_at?: string | null;
          used_by?: string | null;
          used_by_name?: string | null;
          used_by_email?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "join_codes_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "join_codes_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "user_accessible_organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      organizations: {
        Row: {
          created_at: string | null;
          id: string;
          name: string;
          owner_id: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          name: string;
          owner_id: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          name?: string;
          owner_id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      setlist_songs: {
        Row: {
          created_at: string | null;
          id: string;
          key: string | null;
          notes: string | null;
          order: number;
          setlist_id: string;
          song_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          key?: string | null;
          notes?: string | null;
          order: number;
          setlist_id: string;
          song_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          key?: string | null;
          notes?: string | null;
          order?: number;
          setlist_id?: string;
          song_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "setlist_songs_setlist_id_fkey";
            columns: ["setlist_id"];
            isOneToOne: false;
            referencedRelation: "setlists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "setlist_songs_song_id_fkey";
            columns: ["song_id"];
            isOneToOne: false;
            referencedRelation: "songs";
            referencedColumns: ["id"];
          }
        ];
      };
      setlists: {
        Row: {
          created_at: string | null;
          date: string;
          id: string;
          name: string;
          organization_id: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          date: string;
          id?: string;
          name: string;
          organization_id: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          date?: string;
          id?: string;
          name?: string;
          organization_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "setlists_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "setlists_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "user_accessible_organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      song_keys: {
        Row: {
          id: string;
          key: string;
          played_at: string | null;
          setlist_id: string;
          song_id: string;
        };
        Insert: {
          id?: string;
          key: string;
          played_at?: string | null;
          setlist_id: string;
          song_id: string;
        };
        Update: {
          id?: string;
          key?: string;
          played_at?: string | null;
          setlist_id?: string;
          song_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "song_keys_setlist_id_fkey";
            columns: ["setlist_id"];
            isOneToOne: false;
            referencedRelation: "setlists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "song_keys_song_id_fkey";
            columns: ["song_id"];
            isOneToOne: false;
            referencedRelation: "songs";
            referencedColumns: ["id"];
          }
        ];
      };
      songs: {
        Row: {
          artist: string;
          created_at: string | null;
          files: Json[] | null;
          id: string;
          keyed_files: Json | null;
          notes: string | null;
          organization_id: string;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          artist: string;
          created_at?: string | null;
          files?: Json[] | null;
          id?: string;
          keyed_files?: Json | null;
          notes?: string | null;
          organization_id: string;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          artist?: string;
          created_at?: string | null;
          files?: Json[] | null;
          id?: string;
          keyed_files?: Json | null;
          notes?: string | null;
          organization_id?: string;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "songs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "songs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "user_accessible_organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      user_organizations: {
        Row: {
          created_at: string | null;
          id: string;
          organization_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          organization_id: string;
          role?: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          organization_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_organizations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_organizations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "user_accessible_organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      user_settings: {
        Row: {
          created_at: string;
          id: string;
          one_touch_songs: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          one_touch_songs?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          one_touch_songs?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      user_accessible_organizations: {
        Row: {
          created_at: string | null;
          id: string | null;
          name: string | null;
          owner_id: string | null;
          role: string | null;
        };
        Relationships: [];
      };
      user_organizations_with_details: {
        Row: {
          created_at: string | null;
          id: string | null;
          organization_created_at: string | null;
          organization_id: string | null;
          organization_name: string | null;
          organization_owner_id: string | null;
          role: string | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_organizations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_organizations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "user_accessible_organizations";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Functions: {
      can_view_organization: {
        Args: { p_organization_id: string; p_user_id: string };
        Returns: boolean;
      };
      cleanup_expired_join_codes: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      generate_join_code: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      is_member_of_organization: {
        Args: { p_organization_id: string; p_user_id: string };
        Returns: boolean;
      };
      is_organization_owner: {
        Args: { p_organization_id: string; p_user_id: string };
        Returns: boolean;
      };
      user_can_access_organization: {
        Args: { org_id: string; user_id?: string };
        Returns: boolean;
      };
      validate_join_code_info: {
        Args: { join_code_param: string };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
