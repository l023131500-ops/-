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
      bulk_upload_sessions: {
        Row: {
          contact_address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          notes: string | null
          org_name: string | null
          token: string
          updated_at: string
        }
        Insert: {
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          org_name?: string | null
          token?: string
          updated_at?: string
        }
        Update: {
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          org_name?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string
          phone: string | null
          role: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          role?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          role?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      ivr_menu_config: {
        Row: {
          id: string
          menu_tree: Json
          updated_at: string
        }
        Insert: {
          id?: string
          menu_tree?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          menu_tree?: Json
          updated_at?: string
        }
        Relationships: []
      }
      ivr_submissions: {
        Row: {
          caller_phone: string | null
          created_at: string
          id: string
          input_text: string | null
          params: Json | null
          request_type: string | null
          response_text: string | null
          status: string | null
        }
        Insert: {
          caller_phone?: string | null
          created_at?: string
          id?: string
          input_text?: string | null
          params?: Json | null
          request_type?: string | null
          response_text?: string | null
          status?: string | null
        }
        Update: {
          caller_phone?: string | null
          created_at?: string
          id?: string
          input_text?: string | null
          params?: Json | null
          request_type?: string | null
          response_text?: string | null
          status?: string | null
        }
        Relationships: []
      }
      lessons: {
        Row: {
          audience_type: string[] | null
          bulk_session_id: string | null
          city: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          donation_link: string | null
          id: string
          is_approved: boolean | null
          is_live_stream: boolean | null
          is_recorded: boolean | null
          is_recurring: boolean | null
          is_sent: boolean | null
          language: string
          lesson_style: string | null
          logo_url: string | null
          neighborhood: string | null
          org_name: string | null
          rabbi_name: string
          rabbi_phone: string | null
          rabbi_role: string | null
          recording_location: string | null
          schedule_days: Json | null
          schedule_notes: string | null
          specific_date: string | null
          status: string | null
          street: string | null
          street_number: string | null
          subject: string
          submitter_notes: string | null
          synagogue_name: string | null
          synagogue_portal_id: string | null
          target_audience: string[] | null
          updated_at: string
        }
        Insert: {
          audience_type?: string[] | null
          bulk_session_id?: string | null
          city?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          donation_link?: string | null
          id?: string
          is_approved?: boolean | null
          is_live_stream?: boolean | null
          is_recorded?: boolean | null
          is_recurring?: boolean | null
          is_sent?: boolean | null
          language?: string
          lesson_style?: string | null
          logo_url?: string | null
          neighborhood?: string | null
          org_name?: string | null
          rabbi_name?: string
          rabbi_phone?: string | null
          rabbi_role?: string | null
          recording_location?: string | null
          schedule_days?: Json | null
          schedule_notes?: string | null
          specific_date?: string | null
          status?: string | null
          street?: string | null
          street_number?: string | null
          subject?: string
          submitter_notes?: string | null
          synagogue_name?: string | null
          synagogue_portal_id?: string | null
          target_audience?: string[] | null
          updated_at?: string
        }
        Update: {
          audience_type?: string[] | null
          bulk_session_id?: string | null
          city?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          donation_link?: string | null
          id?: string
          is_approved?: boolean | null
          is_live_stream?: boolean | null
          is_recorded?: boolean | null
          is_recurring?: boolean | null
          is_sent?: boolean | null
          language?: string
          lesson_style?: string | null
          logo_url?: string | null
          neighborhood?: string | null
          org_name?: string | null
          rabbi_name?: string
          rabbi_phone?: string | null
          rabbi_role?: string | null
          recording_location?: string | null
          schedule_days?: Json | null
          schedule_notes?: string | null
          specific_date?: string | null
          status?: string | null
          street?: string | null
          street_number?: string | null
          subject?: string
          submitter_notes?: string | null
          synagogue_name?: string | null
          synagogue_portal_id?: string | null
          target_audience?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      nedarim_submissions: {
        Row: {
          city: string | null
          created_at: string
          id: string
          name: string | null
          notes: string | null
          phone: string | null
          raw_data: Json | null
          status: string | null
          subject: string | null
          submission_type: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          raw_data?: Json | null
          status?: string | null
          subject?: string | null
          submission_type?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          raw_data?: Json | null
          status?: string | null
          subject?: string | null
          submission_type?: string | null
        }
        Relationships: []
      }
      org_portals: {
        Row: {
          about_text: string | null
          access_token: string
          background_preset: string | null
          contact_address: string | null
          contact_email: string | null
          contact_fax: string | null
          contact_mailing_address: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          created_at: string
          custom_background_url: string | null
          custom_sections: Json | null
          features_enabled: Json | null
          font_color: string | null
          id: string
          logo_url: string | null
          notes: string | null
          org_name: string
          public_token: string | null
          updated_at: string
        }
        Insert: {
          about_text?: string | null
          access_token?: string
          background_preset?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_fax?: string | null
          contact_mailing_address?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          custom_background_url?: string | null
          custom_sections?: Json | null
          features_enabled?: Json | null
          font_color?: string | null
          id?: string
          logo_url?: string | null
          notes?: string | null
          org_name: string
          public_token?: string | null
          updated_at?: string
        }
        Update: {
          about_text?: string | null
          access_token?: string
          background_preset?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_fax?: string | null
          contact_mailing_address?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          custom_background_url?: string | null
          custom_sections?: Json | null
          features_enabled?: Json | null
          font_color?: string | null
          id?: string
          logo_url?: string | null
          notes?: string | null
          org_name?: string
          public_token?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      org_rabbis: {
        Row: {
          created_at: string
          id: string
          org_id: string
          rabbi_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          rabbi_name: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          rabbi_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_rabbis_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_portals"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_messages: {
        Row: {
          created_at: string
          id: string
          message: string | null
          portal_id: string
          portal_type: string
          sender_email: string | null
          sender_name: string
          sender_phone: string
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          portal_id: string
          portal_type: string
          sender_email?: string | null
          sender_name?: string
          sender_phone?: string
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          portal_id?: string
          portal_type?: string
          sender_email?: string | null
          sender_name?: string
          sender_phone?: string
          status?: string | null
        }
        Relationships: []
      }
      portal_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          portal_id: string
          portal_type: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          portal_id: string
          portal_type: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          portal_id?: string
          portal_type?: string
        }
        Relationships: []
      }
      prayer_times: {
        Row: {
          created_at: string
          custom_category: string | null
          day_of_week: string | null
          id: string
          notes: string | null
          prayer_type: string
          synagogue_id: string
          time: string
        }
        Insert: {
          created_at?: string
          custom_category?: string | null
          day_of_week?: string | null
          id?: string
          notes?: string | null
          prayer_type?: string
          synagogue_id: string
          time?: string
        }
        Update: {
          created_at?: string
          custom_category?: string | null
          day_of_week?: string | null
          id?: string
          notes?: string | null
          prayer_type?: string
          synagogue_id?: string
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_times_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: false
            referencedRelation: "synagogues"
            referencedColumns: ["id"]
          },
        ]
      }
      rabbi_portals: {
        Row: {
          about_text: string | null
          access_token: string
          background_preset: string | null
          contact_address: string | null
          contact_email: string | null
          contact_fax: string | null
          contact_mailing_address: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          created_at: string
          custom_background_url: string | null
          custom_sections: Json | null
          donation_link: string | null
          features_enabled: Json | null
          font_color: string | null
          id: string
          lesson_download_url: string | null
          logo_url: string | null
          notes: string | null
          public_token: string | null
          rabbi_name: string
          rabbi_photo_url: string | null
          updated_at: string
        }
        Insert: {
          about_text?: string | null
          access_token?: string
          background_preset?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_fax?: string | null
          contact_mailing_address?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          custom_background_url?: string | null
          custom_sections?: Json | null
          donation_link?: string | null
          features_enabled?: Json | null
          font_color?: string | null
          id?: string
          lesson_download_url?: string | null
          logo_url?: string | null
          notes?: string | null
          public_token?: string | null
          rabbi_name: string
          rabbi_photo_url?: string | null
          updated_at?: string
        }
        Update: {
          about_text?: string | null
          access_token?: string
          background_preset?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_fax?: string | null
          contact_mailing_address?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          custom_background_url?: string | null
          custom_sections?: Json | null
          donation_link?: string | null
          features_enabled?: Json | null
          font_color?: string | null
          id?: string
          lesson_download_url?: string | null
          logo_url?: string | null
          notes?: string | null
          public_token?: string | null
          rabbi_name?: string
          rabbi_photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seeker_leads: {
        Row: {
          audience_type: string | null
          city: string | null
          contact_name: string
          created_at: string
          email: string | null
          id: string
          lesson_type: string | null
          notes: string | null
          phone: string | null
          preferred_time: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          audience_type?: string | null
          city?: string | null
          contact_name?: string
          created_at?: string
          email?: string | null
          id?: string
          lesson_type?: string | null
          notes?: string | null
          phone?: string | null
          preferred_time?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          audience_type?: string | null
          city?: string | null
          contact_name?: string
          created_at?: string
          email?: string | null
          id?: string
          lesson_type?: string | null
          notes?: string | null
          phone?: string | null
          preferred_time?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      study_day_events: {
        Row: {
          city: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          donation_link: string | null
          event_date: string | null
          id: string
          is_approved: boolean | null
          is_sent: boolean | null
          lessons: Json | null
          logo_url: string | null
          notes: string | null
          schedule_days: Json | null
          schedule_type: string
          session_id: string | null
          status: string | null
          street: string | null
          street_number: string | null
          synagogue_name: string
          target_audience: string[] | null
          updated_at: string
        }
        Insert: {
          city?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          donation_link?: string | null
          event_date?: string | null
          id?: string
          is_approved?: boolean | null
          is_sent?: boolean | null
          lessons?: Json | null
          logo_url?: string | null
          notes?: string | null
          schedule_days?: Json | null
          schedule_type?: string
          session_id?: string | null
          status?: string | null
          street?: string | null
          street_number?: string | null
          synagogue_name?: string
          target_audience?: string[] | null
          updated_at?: string
        }
        Update: {
          city?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          donation_link?: string | null
          event_date?: string | null
          id?: string
          is_approved?: boolean | null
          is_sent?: boolean | null
          lessons?: Json | null
          logo_url?: string | null
          notes?: string | null
          schedule_days?: Json | null
          schedule_type?: string
          session_id?: string | null
          status?: string | null
          street?: string | null
          street_number?: string | null
          synagogue_name?: string
          target_audience?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_day_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_day_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      study_day_sessions: {
        Row: {
          contact_address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          notes: string | null
          org_name: string | null
          token: string
          updated_at: string
        }
        Insert: {
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          org_name?: string | null
          token?: string
          updated_at?: string
        }
        Update: {
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          org_name?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      synagogue_full_access_requests: {
        Row: {
          approved_features: string[]
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          note: string | null
          requested_features: string[]
          status: string
          synagogue_name: string
          synagogue_portal_id: string | null
          updated_at: string
        }
        Insert: {
          approved_features?: string[]
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          note?: string | null
          requested_features?: string[]
          status?: string
          synagogue_name?: string
          synagogue_portal_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_features?: string[]
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          note?: string | null
          requested_features?: string[]
          status?: string
          synagogue_name?: string
          synagogue_portal_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      synagogue_portals: {
        Row: {
          about_text: string | null
          access_token: string
          background_preset: string | null
          city: string | null
          contact_address: string | null
          contact_email: string | null
          contact_fax: string | null
          contact_mailing_address: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          created_at: string
          custom_background_url: string | null
          custom_sections: Json | null
          donation_link: string | null
          features_enabled: Json | null
          font_color: string | null
          id: string
          logo_url: string | null
          neighborhood: string | null
          notes: string | null
          public_token: string | null
          street: string | null
          street_number: string | null
          synagogue_name: string
          target_audience: string[] | null
          updated_at: string
        }
        Insert: {
          about_text?: string | null
          access_token?: string
          background_preset?: string | null
          city?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_fax?: string | null
          contact_mailing_address?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          custom_background_url?: string | null
          custom_sections?: Json | null
          donation_link?: string | null
          features_enabled?: Json | null
          font_color?: string | null
          id?: string
          logo_url?: string | null
          neighborhood?: string | null
          notes?: string | null
          public_token?: string | null
          street?: string | null
          street_number?: string | null
          synagogue_name: string
          target_audience?: string[] | null
          updated_at?: string
        }
        Update: {
          about_text?: string | null
          access_token?: string
          background_preset?: string | null
          city?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_fax?: string | null
          contact_mailing_address?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          custom_background_url?: string | null
          custom_sections?: Json | null
          donation_link?: string | null
          features_enabled?: Json | null
          font_color?: string | null
          id?: string
          logo_url?: string | null
          neighborhood?: string | null
          notes?: string | null
          public_token?: string | null
          street?: string | null
          street_number?: string | null
          synagogue_name?: string
          target_audience?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      synagogues: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          name: string
          neighborhood: string | null
          notes: string | null
          org_id: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name: string
          neighborhood?: string | null
          notes?: string | null
          org_id: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          neighborhood?: string | null
          notes?: string | null
          org_id?: string
          phone?: string | null
        }
        Relationships: []
      }
      teacher_leads: {
        Row: {
          city: string | null
          created_at: string
          email: string | null
          experience: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          status: string | null
          subjects: string[] | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          email?: string | null
          experience?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          subjects?: string[] | null
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string | null
          experience?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          subjects?: string[] | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      app_role: "admin" | "rabbi" | "org_admin" | "synagogue_admin" | "user"
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
      app_role: ["admin", "rabbi", "org_admin", "synagogue_admin", "user"],
    },
  },
} as const
