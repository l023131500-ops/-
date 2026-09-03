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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          lesson_id: string
          notes: string | null
          participant_id: string
          was_present: boolean | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          lesson_id: string
          notes?: string | null
          participant_id: string
          was_present?: boolean | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          lesson_id?: string
          notes?: string | null
          participant_id?: string
          was_present?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_categories: {
        Row: {
          allowed_subjects: string[] | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_restricted: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          allowed_subjects?: string[] | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_restricted?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          allowed_subjects?: string[] | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_restricted?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      forum_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_blocked: boolean | null
          post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_blocked?: boolean | null
          post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_blocked?: boolean | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          author_id: string
          category_id: string
          content: string
          created_at: string
          id: string
          is_blocked: boolean | null
          is_pinned: boolean | null
          updated_at: string
        }
        Insert: {
          author_id: string
          category_id: string
          content: string
          created_at?: string
          id?: string
          is_blocked?: boolean | null
          is_pinned?: boolean | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          category_id?: string
          content?: string
          created_at?: string
          id?: string
          is_blocked?: boolean | null
          is_pinned?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          area: string | null
          assigned_teacher_id: string | null
          created_at: string
          full_name: string
          id: string
          kind: string
          notes: string | null
          phone: string
          preferred_subject: string | null
          preferred_times: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          assigned_teacher_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          kind?: string
          notes?: string | null
          phone: string
          preferred_subject?: string | null
          preferred_times?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          assigned_teacher_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          kind?: string
          notes?: string | null
          phone?: string
          preferred_subject?: string | null
          preferred_times?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_teacher_id_fkey"
            columns: ["assigned_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          audience_type: string[] | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          donation_link: string | null
          id: string
          is_active: boolean | null
          is_live_stream: boolean | null
          is_recorded: boolean | null
          is_recurring: boolean | null
          language: string | null
          lesson_style: string | null
          neighborhood: string | null
          rabbi_phone: string | null
          rabbi_role: string | null
          recording_location: string | null
          schedule_days: string[] | null
          schedule_notes: string | null
          schedule_time: string | null
          speaking_style: string | null
          specific_date: string | null
          street: string | null
          street_number: string | null
          subject: string
          synagogue_name: string | null
          target_audience: string[] | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          audience_type?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          donation_link?: string | null
          id?: string
          is_active?: boolean | null
          is_live_stream?: boolean | null
          is_recorded?: boolean | null
          is_recurring?: boolean | null
          language?: string | null
          lesson_style?: string | null
          neighborhood?: string | null
          rabbi_phone?: string | null
          rabbi_role?: string | null
          recording_location?: string | null
          schedule_days?: string[] | null
          schedule_notes?: string | null
          schedule_time?: string | null
          speaking_style?: string | null
          specific_date?: string | null
          street?: string | null
          street_number?: string | null
          subject: string
          synagogue_name?: string | null
          target_audience?: string[] | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          audience_type?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          donation_link?: string | null
          id?: string
          is_active?: boolean | null
          is_live_stream?: boolean | null
          is_recorded?: boolean | null
          is_recurring?: boolean | null
          language?: string | null
          lesson_style?: string | null
          neighborhood?: string | null
          rabbi_phone?: string | null
          rabbi_role?: string | null
          recording_location?: string | null
          schedule_days?: string[] | null
          schedule_notes?: string | null
          schedule_time?: string | null
          speaking_style?: string | null
          specific_date?: string | null
          street?: string | null
          street_number?: string | null
          subject?: string
          synagogue_name?: string | null
          target_audience?: string[] | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          admin_notes: string | null
          category: string
          created_at: string
          description: string | null
          display_forum_category_id: string | null
          display_in_public_profile: boolean
          duration_seconds: number | null
          featured_on_homepage: boolean
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          media_kind: string | null
          status: string
          subcategory: string | null
          title: string
          updated_at: string
          uploader_id: string
        }
        Insert: {
          admin_notes?: string | null
          category: string
          created_at?: string
          description?: string | null
          display_forum_category_id?: string | null
          display_in_public_profile?: boolean
          duration_seconds?: number | null
          featured_on_homepage?: boolean
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          media_kind?: string | null
          status?: string
          subcategory?: string | null
          title: string
          updated_at?: string
          uploader_id: string
        }
        Update: {
          admin_notes?: string | null
          category?: string
          created_at?: string
          description?: string | null
          display_forum_category_id?: string | null
          display_in_public_profile?: boolean
          duration_seconds?: number | null
          featured_on_homepage?: boolean
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          media_kind?: string | null
          status?: string
          subcategory?: string | null
          title?: string
          updated_at?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_display_forum_category_id_fkey"
            columns: ["display_forum_category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_log: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          id: string
          lesson_id: string | null
          message: string
          meta: Json
          participant_id: string | null
          recipient: string
          sent_by: string | null
          status: string
          subject: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          lesson_id?: string | null
          message: string
          meta?: Json
          participant_id?: string | null
          recipient: string
          sent_by?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          lesson_id?: string | null
          message?: string
          meta?: Json
          participant_id?: string | null
          recipient?: string
          sent_by?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_log_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_log_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          lesson_id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          lesson_id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          lesson_id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_messages: {
        Row: {
          created_at: string
          id: string
          message: string | null
          sender_email: string | null
          sender_name: string
          sender_phone: string
          status: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          sender_email?: string | null
          sender_name: string
          sender_phone: string
          status?: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          sender_email?: string | null
          sender_name?: string
          sender_phone?: string
          status?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_messages_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          teacher_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          teacher_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          teacher_id?: string
        }
        Relationships: []
      }
      prayer_times: {
        Row: {
          created_at: string
          custom_category: string | null
          day_of_week: string
          id: string
          notes: string | null
          prayer_type: string
          synagogue_id: string
          time: string
        }
        Insert: {
          created_at?: string
          custom_category?: string | null
          day_of_week?: string
          id?: string
          notes?: string | null
          prayer_type: string
          synagogue_id: string
          time: string
        }
        Update: {
          created_at?: string
          custom_category?: string | null
          day_of_week?: string
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
      profiles: {
        Row: {
          about_text: string | null
          available_days: string[] | null
          available_for_matching: boolean
          available_hours: string[] | null
          avatar_url: string | null
          background: string[] | null
          background_preset: string | null
          bio: string | null
          city: string | null
          contact_fax: string | null
          contact_mailing_address: string | null
          contact_whatsapp: string | null
          created_at: string
          custom_background_url: string | null
          custom_sections: Json | null
          donation_link: string | null
          email: string | null
          experience: string | null
          font_color: string | null
          frequency: string | null
          full_name: string
          gender: string | null
          id: string
          is_approved: boolean | null
          language: string | null
          lesson_download_url: string | null
          lesson_locations: string[] | null
          logo_url: string | null
          neighborhood: string | null
          organization_name: string | null
          payment: string | null
          phone: string | null
          portal_language: string | null
          portal_type: string
          preferred_age_groups: string[] | null
          public_token: string | null
          rabbi_photo_url: string | null
          social_links: Json | null
          speaking_style: string[] | null
          street: string | null
          subjects: string[] | null
          target_audience: string[] | null
          teaching_style: string[] | null
          updated_at: string
          user_id: string
          website_url: string | null
          years_teaching: number | null
        }
        Insert: {
          about_text?: string | null
          available_days?: string[] | null
          available_for_matching?: boolean
          available_hours?: string[] | null
          avatar_url?: string | null
          background?: string[] | null
          background_preset?: string | null
          bio?: string | null
          city?: string | null
          contact_fax?: string | null
          contact_mailing_address?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          custom_background_url?: string | null
          custom_sections?: Json | null
          donation_link?: string | null
          email?: string | null
          experience?: string | null
          font_color?: string | null
          frequency?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_approved?: boolean | null
          language?: string | null
          lesson_download_url?: string | null
          lesson_locations?: string[] | null
          logo_url?: string | null
          neighborhood?: string | null
          organization_name?: string | null
          payment?: string | null
          phone?: string | null
          portal_language?: string | null
          portal_type?: string
          preferred_age_groups?: string[] | null
          public_token?: string | null
          rabbi_photo_url?: string | null
          social_links?: Json | null
          speaking_style?: string[] | null
          street?: string | null
          subjects?: string[] | null
          target_audience?: string[] | null
          teaching_style?: string[] | null
          updated_at?: string
          user_id: string
          website_url?: string | null
          years_teaching?: number | null
        }
        Update: {
          about_text?: string | null
          available_days?: string[] | null
          available_for_matching?: boolean
          available_hours?: string[] | null
          avatar_url?: string | null
          background?: string[] | null
          background_preset?: string | null
          bio?: string | null
          city?: string | null
          contact_fax?: string | null
          contact_mailing_address?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          custom_background_url?: string | null
          custom_sections?: Json | null
          donation_link?: string | null
          email?: string | null
          experience?: string | null
          font_color?: string | null
          frequency?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_approved?: boolean | null
          language?: string | null
          lesson_download_url?: string | null
          lesson_locations?: string[] | null
          logo_url?: string | null
          neighborhood?: string | null
          organization_name?: string | null
          payment?: string | null
          phone?: string | null
          portal_language?: string | null
          portal_type?: string
          preferred_age_groups?: string[] | null
          public_token?: string | null
          rabbi_photo_url?: string | null
          social_links?: Json | null
          speaking_style?: string[] | null
          street?: string | null
          subjects?: string[] | null
          target_audience?: string[] | null
          teaching_style?: string[] | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
          years_teaching?: number | null
        }
        Relationships: []
      }
      study_daily: {
        Row: {
          content: string | null
          created_at: string
          date: string
          id: string
          is_special: boolean | null
          notes: string | null
          schedule_id: string
          special_type: string | null
          tasks: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          date: string
          id?: string
          is_special?: boolean | null
          notes?: string | null
          schedule_id: string
          special_type?: string | null
          tasks?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          date?: string
          id?: string
          is_special?: boolean | null
          notes?: string | null
          schedule_id?: string
          special_type?: string | null
          tasks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_daily_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "study_schedule"
            referencedColumns: ["id"]
          },
        ]
      }
      study_schedule: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          lesson_id: string
          notes: string | null
          pace_amount: number | null
          pace_type: string | null
          start_date: string
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          lesson_id: string
          notes?: string | null
          pace_amount?: number | null
          pace_type?: string | null
          start_date: string
          topic: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          lesson_id?: string
          notes?: string | null
          pace_amount?: number | null
          pace_type?: string | null
          start_date?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_schedule_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
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
          phone: string | null
          teacher_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          teacher_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          teacher_id?: string
        }
        Relationships: []
      }
      teacher_features: {
        Row: {
          enabled: boolean
          feature_key: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          feature_key: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          feature_key?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_features_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_forum_access: {
        Row: {
          can_comment: boolean
          can_post: boolean
          can_view: boolean
          category_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          can_comment?: boolean
          can_post?: boolean
          can_view?: boolean
          category_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          can_comment?: boolean
          can_post?: boolean
          can_view?: boolean
          category_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_forum_access_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_forum_access_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_invites: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          initial_password: string
          invite_code: string
          notes: string | null
          organization_name: string | null
          phone: string | null
          portal_type: string
          used: boolean
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          full_name: string
          id?: string
          initial_password: string
          invite_code?: string
          notes?: string | null
          organization_name?: string | null
          phone?: string | null
          portal_type?: string
          used?: boolean
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          initial_password?: string
          invite_code?: string
          notes?: string | null
          organization_name?: string | null
          phone?: string | null
          portal_type?: string
          used?: boolean
          used_at?: string | null
        }
        Relationships: []
      }
      tips: {
        Row: {
          content: string
          created_at: string
          display_date: string | null
          id: string
          is_active: boolean | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          display_date?: string | null
          id?: string
          is_active?: boolean | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          display_date?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      mark_invite_used: { Args: { _id: string }; Returns: undefined }
      validate_teacher_invite: {
        Args: { _code: string; _email: string }
        Returns: {
          email: string
          full_name: string
          id: string
          initial_password: string
          organization_name: string
          phone: string
          portal_type: string
        }[]
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
