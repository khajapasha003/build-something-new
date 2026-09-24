export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      apps: {
        Row: {
          built_with: string | null;
          created_at: string;
          id: string;
          origin: string;
          updated_at: string;
          url: string;
          user_id: string;
          verification_status: string;
          verification_token: string;
          verified_at: string | null;
        };
        Insert: {
          built_with?: string | null;
          created_at?: string;
          id?: string;
          origin: string;
          updated_at?: string;
          url: string;
          user_id: string;
          verification_status?: string;
          verification_token?: string;
          verified_at?: string | null;
        };
        Update: {
          built_with?: string | null;
          created_at?: string;
          id?: string;
          origin?: string;
          updated_at?: string;
          url?: string;
          user_id?: string;
          verification_status?: string;
          verification_token?: string;
          verified_at?: string | null;
        };
        Relationships: [];
      };
      findings: {
        Row: {
          app_id: string;
          created_at: string;
          detail: string | null;
          evidence: Json;
          id: string;
          page_url: string | null;
          review_note: string | null;
          review_status: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          rule_id: string;
          scan_id: string;
          severity: string;
          title: string;
          user_id: string;
        };
        Insert: {
          app_id: string;
          created_at?: string;
          detail?: string | null;
          evidence?: Json;
          id?: string;
          page_url?: string | null;
          review_note?: string | null;
          review_status?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          rule_id: string;
          scan_id: string;
          severity: string;
          title: string;
          user_id: string;
        };
        Update: {
          app_id?: string;
          created_at?: string;
          detail?: string | null;
          evidence?: Json;
          id?: string;
          page_url?: string | null;
          review_note?: string | null;
          review_status?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          rule_id?: string;
          scan_id?: string;
          severity?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "findings_app_id_fkey";
            columns: ["app_id"];
            isOneToOne: false;
            referencedRelation: "apps";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "findings_scan_id_fkey";
            columns: ["scan_id"];
            isOneToOne: false;
            referencedRelation: "scans";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      scan_events: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          progress: number | null;
          scan_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          progress?: number | null;
          scan_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          progress?: number | null;
          scan_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scan_events_scan_id_fkey";
            columns: ["scan_id"];
            isOneToOne: false;
            referencedRelation: "scans";
            referencedColumns: ["id"];
          },
        ];
      };
      scans: {
        Row: {
          app_id: string;
          bug_count: number;
          claim_token: string | null;
          claimed_at: string | null;
          created_at: string;
          error: string | null;
          finished_at: string | null;
          id: string;
          needs_review_count: number;
          passed_count: number;
          progress: number;
          progress_message: string | null;
          started_at: string | null;
          status: string;
          target_url: string;
          updated_at: string;
          user_id: string;
          worker_id: string | null;
        };
        Insert: {
          app_id: string;
          bug_count?: number;
          claim_token?: string | null;
          claimed_at?: string | null;
          created_at?: string;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          needs_review_count?: number;
          passed_count?: number;
          progress?: number;
          progress_message?: string | null;
          started_at?: string | null;
          status?: string;
          target_url: string;
          updated_at?: string;
          user_id: string;
          worker_id?: string | null;
        };
        Update: {
          app_id?: string;
          bug_count?: number;
          claim_token?: string | null;
          claimed_at?: string | null;
          created_at?: string;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          needs_review_count?: number;
          passed_count?: number;
          progress?: number;
          progress_message?: string | null;
          started_at?: string | null;
          status?: string;
          target_url?: string;
          updated_at?: string;
          user_id?: string;
          worker_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "scans_app_id_fkey";
            columns: ["app_id"];
            isOneToOne: false;
            referencedRelation: "apps";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      verification_attempts: {
        Row: {
          app_id: string;
          created_at: string;
          id: string;
          method: string;
          reason: string | null;
          result: string;
          user_id: string;
        };
        Insert: {
          app_id: string;
          created_at?: string;
          id?: string;
          method: string;
          reason?: string | null;
          result: string;
          user_id: string;
        };
        Update: {
          app_id?: string;
          created_at?: string;
          id?: string;
          method?: string;
          reason?: string | null;
          result?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "verification_attempts_app_id_fkey";
            columns: ["app_id"];
            isOneToOne: false;
            referencedRelation: "apps";
            referencedColumns: ["id"];
          },
        ];
      };
      waitlist: {
        Row: {
          builder: string | null;
          consent_marketing: boolean;
          created_at: string;
          email: string;
          id: string;
          intent: string;
          ip_hash: string | null;
          website_url: string | null;
        };
        Insert: {
          builder?: string | null;
          consent_marketing?: boolean;
          created_at?: string;
          email: string;
          id?: string;
          intent?: string;
          ip_hash?: string | null;
          website_url?: string | null;
        };
        Update: {
          builder?: string | null;
          consent_marketing?: boolean;
          created_at?: string;
          email?: string;
          id?: string;
          intent?: string;
          ip_hash?: string | null;
          website_url?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "moderator" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const;
