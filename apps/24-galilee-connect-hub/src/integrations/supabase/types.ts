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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_slides: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
        }
        Relationships: []
      }
      ad_banners: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link: string | null
          position: string
          size: string
          start_date: string | null
          title: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link?: string | null
          position?: string
          size?: string
          start_date?: string | null
          title: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link?: string | null
          position?: string
          size?: string
          start_date?: string | null
          title?: string
        }
        Relationships: []
      }
      azkarot_requests: {
        Row: {
          created_at: string
          date_requested: string | null
          deceased_name: string
          id: string
          is_read: boolean | null
          name: string
          notes: string | null
          phone: string
          request_type: string
        }
        Insert: {
          created_at?: string
          date_requested?: string | null
          deceased_name: string
          id?: string
          is_read?: boolean | null
          name: string
          notes?: string | null
          phone: string
          request_type?: string
        }
        Update: {
          created_at?: string
          date_requested?: string | null
          deceased_name?: string
          id?: string
          is_read?: boolean | null
          name?: string
          notes?: string | null
          phone?: string
          request_type?: string
        }
        Relationships: []
      }
      community_leads: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_read: boolean | null
          lead_type: string
          message: string
          name: string
          phone: string | null
          synagogue_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_read?: boolean | null
          lead_type: string
          message: string
          name: string
          phone?: string | null
          synagogue_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_read?: boolean | null
          lead_type?: string
          message?: string
          name?: string
          phone?: string | null
          synagogue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_leads_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: false
            referencedRelation: "synagogues"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_halacha: {
        Row: {
          category: string
          content: string
          created_at: string
          display_date: string | null
          hebrew_date: string | null
          id: string
          is_active: boolean | null
          is_seasonal: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          display_date?: string | null
          hebrew_date?: string | null
          id?: string
          is_active?: boolean | null
          is_seasonal?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          display_date?: string | null
          hebrew_date?: string | null
          id?: string
          is_active?: boolean | null
          is_seasonal?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gabai_accounts: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_active: boolean | null
          is_admin: boolean | null
          password_hash: string
          synagogue_id: string | null
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean | null
          is_admin?: boolean | null
          password_hash: string
          synagogue_id?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_admin?: boolean | null
          password_hash?: string
          synagogue_id?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "gabai_accounts_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: false
            referencedRelation: "synagogues"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_images: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
        }
        Relationships: []
      }
      kashrut_establishments: {
        Row: {
          address: string
          category: string
          certifying_body: string | null
          created_at: string
          id: string
          is_active: boolean | null
          kashrut_level: string
          mashgiach_name: string | null
          mashgiach_phone: string | null
          name: string
          notes: string | null
          opening_hours: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address: string
          category: string
          certifying_body?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          kashrut_level: string
          mashgiach_name?: string | null
          mashgiach_phone?: string | null
          name: string
          notes?: string | null
          opening_hours?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          category?: string
          certifying_body?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          kashrut_level?: string
          mashgiach_name?: string | null
          mashgiach_phone?: string | null
          name?: string
          notes?: string | null
          opening_hours?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          address: string | null
          category: string
          contact_name: string | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          phone: string | null
          subcategory: string | null
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          category: string
          contact_name?: string | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          phone?: string | null
          subcategory?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: string
          contact_name?: string | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          phone?: string | null
          subcategory?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mikvaot: {
        Row: {
          address: string
          bride_groom_counselor_name: string | null
          bride_groom_counselor_phone: string | null
          created_at: string
          id: string
          is_active: boolean | null
          manager_name: string | null
          manager_phone: string | null
          name: string
          notes: string | null
          opening_hours: string | null
          phone: string | null
          rabbi_tahara_name: string | null
          rabbi_tahara_phone: string | null
          type: string
          updated_at: string
        }
        Insert: {
          address: string
          bride_groom_counselor_name?: string | null
          bride_groom_counselor_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          manager_name?: string | null
          manager_phone?: string | null
          name: string
          notes?: string | null
          opening_hours?: string | null
          phone?: string | null
          rabbi_tahara_name?: string | null
          rabbi_tahara_phone?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          address?: string
          bride_groom_counselor_name?: string | null
          bride_groom_counselor_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          manager_name?: string | null
          manager_phone?: string | null
          name?: string
          notes?: string | null
          opening_hours?: string | null
          phone?: string | null
          rabbi_tahara_name?: string | null
          rabbi_tahara_phone?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      newsletters: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          issue_date: string
          pdf_url: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          issue_date?: string
          pdf_url: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          issue_date?: string
          pdf_url?: string
          title?: string
        }
        Relationships: []
      }
      rabbi_questions: {
        Row: {
          contact_method: string
          contact_value: string
          created_at: string
          destination: string
          id: string
          is_read: boolean | null
          name: string
          question: string
          urgent: boolean | null
        }
        Insert: {
          contact_method?: string
          contact_value: string
          created_at?: string
          destination?: string
          id?: string
          is_read?: boolean | null
          name: string
          question: string
          urgent?: boolean | null
        }
        Update: {
          contact_method?: string
          contact_value?: string
          created_at?: string
          destination?: string
          id?: string
          is_read?: boolean | null
          name?: string
          question?: string
          urgent?: boolean | null
        }
        Relationships: []
      }
      synagogue_announcements: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          synagogue_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          synagogue_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          synagogue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "synagogue_announcements_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: false
            referencedRelation: "synagogues"
            referencedColumns: ["id"]
          },
        ]
      }
      synagogue_gabbaim: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string
          synagogue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone: string
          synagogue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string
          synagogue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "synagogue_gabbaim_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: false
            referencedRelation: "synagogues"
            referencedColumns: ["id"]
          },
        ]
      }
      synagogue_lessons: {
        Row: {
          audience: string | null
          created_at: string
          day: string
          id: string
          location: string | null
          subject: string
          synagogue_id: string
          teacher: string
          time: string
        }
        Insert: {
          audience?: string | null
          created_at?: string
          day: string
          id?: string
          location?: string | null
          subject: string
          synagogue_id: string
          teacher: string
          time: string
        }
        Update: {
          audience?: string | null
          created_at?: string
          day?: string
          id?: string
          location?: string | null
          subject?: string
          synagogue_id?: string
          teacher?: string
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "synagogue_lessons_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: false
            referencedRelation: "synagogues"
            referencedColumns: ["id"]
          },
        ]
      }
      synagogue_prayer_times: {
        Row: {
          created_at: string
          day: string
          id: string
          name: string
          no_minyan: boolean | null
          synagogue_id: string
          time: string
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          name: string
          no_minyan?: boolean | null
          synagogue_id: string
          time: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          name?: string
          no_minyan?: boolean | null
          synagogue_id?: string
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "synagogue_prayer_times_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: false
            referencedRelation: "synagogues"
            referencedColumns: ["id"]
          },
        ]
      }
      synagogues: {
        Row: {
          address: string
          background_preset: number | null
          created_at: string
          donation_link: string | null
          id: string
          logo_url: string | null
          name: string
          neighborhood: string
          nusach: string
          rabbi: string | null
          updated_at: string
        }
        Insert: {
          address: string
          background_preset?: number | null
          created_at?: string
          donation_link?: string | null
          id?: string
          logo_url?: string | null
          name: string
          neighborhood: string
          nusach: string
          rabbi?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          background_preset?: number | null
          created_at?: string
          donation_link?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          neighborhood?: string
          nusach?: string
          rabbi?: string | null
          updated_at?: string
        }
        Relationships: []
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
    Enums: {},
  },
} as const
