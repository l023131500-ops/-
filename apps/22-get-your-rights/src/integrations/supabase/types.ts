export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          admin_notes: string | null
          age_exact: string | null
          category: string | null
          children: string | null
          children_ages: string | null
          children_count: number | null
          children_health_details: string | null
          closed_at: string | null
          created_at: string
          date_of_birth: string | null
          description: string | null
          details: string | null
          disability_percentage: string | null
          document_urls: string[] | null
          economic_status: string | null
          eligibility_score: string | null
          employment_status: string | null
          gender: string | null
          handled_description: string | null
          health_status: string | null
          housing_status: string | null
          id: string
          id_number: string | null
          marital_status: string | null
          name: string | null
          phone: string | null
          selected_right: string | null
          service_type: string | null
          source: string
          spouse_employment: string | null
          spouse_health: string | null
          spouse_id_number: string | null
          spouse_name: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          age_exact?: string | null
          category?: string | null
          children?: string | null
          children_ages?: string | null
          children_count?: number | null
          children_health_details?: string | null
          closed_at?: string | null
          created_at?: string
          date_of_birth?: string | null
          description?: string | null
          details?: string | null
          disability_percentage?: string | null
          document_urls?: string[] | null
          economic_status?: string | null
          eligibility_score?: string | null
          employment_status?: string | null
          gender?: string | null
          handled_description?: string | null
          health_status?: string | null
          housing_status?: string | null
          id?: string
          id_number?: string | null
          marital_status?: string | null
          name?: string | null
          phone?: string | null
          selected_right?: string | null
          service_type?: string | null
          source: string
          spouse_employment?: string | null
          spouse_health?: string | null
          spouse_id_number?: string | null
          spouse_name?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          age_exact?: string | null
          category?: string | null
          children?: string | null
          children_ages?: string | null
          children_count?: number | null
          children_health_details?: string | null
          closed_at?: string | null
          created_at?: string
          date_of_birth?: string | null
          description?: string | null
          details?: string | null
          disability_percentage?: string | null
          document_urls?: string[] | null
          economic_status?: string | null
          eligibility_score?: string | null
          employment_status?: string | null
          gender?: string | null
          handled_description?: string | null
          health_status?: string | null
          housing_status?: string | null
          id?: string
          id_number?: string | null
          marital_status?: string | null
          name?: string | null
          phone?: string | null
          selected_right?: string | null
          service_type?: string | null
          source?: string
          spouse_employment?: string | null
          spouse_health?: string | null
          spouse_id_number?: string | null
          spouse_name?: string | null
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rights_reference: {
        Row: {
          accompanying_benefit: string | null
          bureaucratic_pitfalls: string | null
          category: string
          created_at: string | null
          economic_necessity: number | null
          eligibility_criteria: string | null
          financial_potential: string | null
          handling_body: string | null
          how_to_apply: string | null
          id: string
          media_type: string | null
          media_url: string | null
          plain_description: string | null
          podcast_text: string | null
          questionnaire: Json | null
          required_documents: string | null
          service_link: string | null
          target_audience: string | null
          topic_name: string
          topic_number: number
          updated_at: string | null
        }
        Insert: {
          accompanying_benefit?: string | null
          bureaucratic_pitfalls?: string | null
          category: string
          created_at?: string | null
          economic_necessity?: number | null
          eligibility_criteria?: string | null
          financial_potential?: string | null
          handling_body?: string | null
          how_to_apply?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          plain_description?: string | null
          podcast_text?: string | null
          questionnaire?: Json | null
          required_documents?: string | null
          service_link?: string | null
          target_audience?: string | null
          topic_name: string
          topic_number: number
          updated_at?: string | null
        }
        Update: {
          accompanying_benefit?: string | null
          bureaucratic_pitfalls?: string | null
          category?: string
          created_at?: string | null
          economic_necessity?: number | null
          eligibility_criteria?: string | null
          financial_potential?: string | null
          handling_body?: string | null
          how_to_apply?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          plain_description?: string | null
          podcast_text?: string | null
          questionnaire?: Json | null
          required_documents?: string | null
          service_link?: string | null
          target_audience?: string | null
          topic_name?: string
          topic_number?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
