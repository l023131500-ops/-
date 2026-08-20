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
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["category_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type: Database["public"]["Enums"]["category_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["category_type"]
          updated_at?: string
        }
        Relationships: []
      }
      client_bank_accounts: {
        Row: {
          account_number_last4: string | null
          account_type: string | null
          bank: string
          branch: string | null
          client_id: string
          created_at: string
          currency: string | null
          id: string
          is_primary: boolean
          notes: string | null
          updated_at: string
        }
        Insert: {
          account_number_last4?: string | null
          account_type?: string | null
          bank: string
          branch?: string | null
          client_id: string
          created_at?: string
          currency?: string | null
          id?: string
          is_primary?: boolean
          notes?: string | null
          updated_at?: string
        }
        Update: {
          account_number_last4?: string | null
          account_type?: string | null
          bank?: string
          branch?: string | null
          client_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          is_primary?: boolean
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_consents: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_granted: boolean
          partner_category: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_granted?: boolean
          partner_category: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_granted?: boolean
          partner_category?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_consents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_employment_history: {
        Row: {
          client_id: string
          created_at: string
          employer: string
          end_date: string | null
          id: string
          monthly_gross: number | null
          notes: string | null
          role: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          employer: string
          end_date?: string | null
          id?: string
          monthly_gross?: number | null
          notes?: string | null
          role?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          employer?: string
          end_date?: string | null
          id?: string
          monthly_gross?: number | null
          notes?: string | null
          role?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_family_members: {
        Row: {
          client_id: string
          created_at: string
          date_of_birth: string | null
          dependent: boolean
          full_name: string
          id: string
          id_number: string | null
          notes: string | null
          relation: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          date_of_birth?: string | null
          dependent?: boolean
          full_name: string
          id?: string
          id_number?: string | null
          notes?: string | null
          relation: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          date_of_birth?: string | null
          dependent?: boolean
          full_name?: string
          id?: string
          id_number?: string | null
          notes?: string | null
          relation?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_financial_profile: {
        Row: {
          account_type: string | null
          assets_summary: string | null
          bank_name: string | null
          client_id: string
          created_at: string
          liabilities_summary: string | null
          monthly_expenses: number | null
          monthly_income: number | null
          notes: string | null
          risk_profile: string | null
          tax_residency: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string | null
          assets_summary?: string | null
          bank_name?: string | null
          client_id: string
          created_at?: string
          liabilities_summary?: string | null
          monthly_expenses?: number | null
          monthly_income?: number | null
          notes?: string | null
          risk_profile?: string | null
          tax_residency?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string | null
          assets_summary?: string | null
          bank_name?: string | null
          client_id?: string
          created_at?: string
          liabilities_summary?: string | null
          monthly_expenses?: number | null
          monthly_income?: number | null
          notes?: string | null
          risk_profile?: string | null
          tax_residency?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_personal_details: {
        Row: {
          address_city: string | null
          address_country: string | null
          address_street: string | null
          address_zip: string | null
          client_id: string
          created_at: string
          date_of_birth: string | null
          employer: string | null
          gender: string | null
          id_number: string | null
          marital_status: string | null
          notes: string | null
          occupation: string | null
          residency_status: string | null
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_country?: string | null
          address_street?: string | null
          address_zip?: string | null
          client_id: string
          created_at?: string
          date_of_birth?: string | null
          employer?: string | null
          gender?: string | null
          id_number?: string | null
          marital_status?: string | null
          notes?: string | null
          occupation?: string | null
          residency_status?: string | null
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_country?: string | null
          address_street?: string | null
          address_zip?: string | null
          client_id?: string
          created_at?: string
          date_of_birth?: string | null
          employer?: string | null
          gender?: string | null
          id_number?: string | null
          marital_status?: string | null
          notes?: string | null
          occupation?: string | null
          residency_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_professional_assignments: {
        Row: {
          client_id: string
          created_at: string
          id: string
          professional_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          professional_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          professional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_professional_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_professional_assignments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          created_at: string
          id: string
          internal_admin_notes: string | null
          lead_source: Database["public"]["Enums"]["lead_source"] | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          raw_voicemail_transcription: string | null
          share_enabled: boolean
          share_token: string
          updated_at: string
          uploaded_documents: Json
        }
        Insert: {
          created_at?: string
          id: string
          internal_admin_notes?: string | null
          lead_source?: Database["public"]["Enums"]["lead_source"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          raw_voicemail_transcription?: string | null
          share_enabled?: boolean
          share_token?: string
          updated_at?: string
          uploaded_documents?: Json
        }
        Update: {
          created_at?: string
          id?: string
          internal_admin_notes?: string | null
          lead_source?: Database["public"]["Enums"]["lead_source"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          raw_voicemail_transcription?: string | null
          share_enabled?: boolean
          share_token?: string
          updated_at?: string
          uploaded_documents?: Json
        }
        Relationships: [
          {
            foreignKeyName: "client_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_topic_states: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_relevant: boolean
          topic_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_relevant?: boolean
          topic_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_relevant?: boolean
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_topic_states_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_logs: {
        Row: {
          channel: string
          client_id: string
          created_at: string
          id: string
          payload: Json
          status: string
          template_type: string
          triggered_by: string | null
        }
        Insert: {
          channel?: string
          client_id: string
          created_at?: string
          id?: string
          payload?: Json
          status?: string
          template_type: string
          triggered_by?: string | null
        }
        Update: {
          channel?: string
          client_id?: string
          created_at?: string
          id?: string
          payload?: Json
          status?: string
          template_type?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_definitions: {
        Row: {
          created_at: string
          entity_type: Database["public"]["Enums"]["custom_field_entity"]
          id: string
          key: string
          label: string
          options: Json
          required: boolean
          sort_order: number
          type: Database["public"]["Enums"]["custom_field_type"]
          updated_at: string
          visible_to_roles: string[]
        }
        Insert: {
          created_at?: string
          entity_type: Database["public"]["Enums"]["custom_field_entity"]
          id?: string
          key: string
          label: string
          options?: Json
          required?: boolean
          sort_order?: number
          type: Database["public"]["Enums"]["custom_field_type"]
          updated_at?: string
          visible_to_roles?: string[]
        }
        Update: {
          created_at?: string
          entity_type?: Database["public"]["Enums"]["custom_field_entity"]
          id?: string
          key?: string
          label?: string
          options?: Json
          required?: boolean
          sort_order?: number
          type?: Database["public"]["Enums"]["custom_field_type"]
          updated_at?: string
          visible_to_roles?: string[]
        }
        Relationships: []
      }
      custom_field_values: {
        Row: {
          created_at: string
          definition_id: string
          entity_id: string
          id: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          definition_id: string
          entity_id: string
          id?: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          definition_id?: string
          entity_id?: string
          id?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "custom_field_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string | null
          created_at: string
          id: string
          mime: string | null
          name: string
          notes: string | null
          owner_client_id: string
          partner_visible: boolean
          size: number | null
          status: string
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          mime?: string | null
          name: string
          notes?: string | null
          owner_client_id: string
          partner_visible?: boolean
          size?: number | null
          status?: string
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          mime?: string | null
          name?: string
          notes?: string | null
          owner_client_id?: string
          partner_visible?: boolean
          size?: number | null
          status?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      global_event_log: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          source_id: string
          source_table: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          source_id: string
          source_table: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          source_id?: string
          source_table?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string | null
          metadata: Json
          name: string
          phone: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          name: string
          phone?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          name?: string
          phone?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      outbox_queue: {
        Row: {
          attempts: number
          created_at: string
          event_type: string
          id: string
          last_error: string | null
          payload: Json
          sent_at: string | null
          status: string
          target_url: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_type: string
          id?: string
          last_error?: string | null
          payload?: Json
          sent_at?: string | null
          status?: string
          target_url?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          event_type?: string
          id?: string
          last_error?: string | null
          payload?: Json
          sent_at?: string | null
          status?: string
          target_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      partner_assignments: {
        Row: {
          admin_notes: string | null
          client_id: string
          created_at: string
          id: string
          partner_feedback_notes: string | null
          partner_id: string
          treatment_status: Database["public"]["Enums"]["treatment_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          client_id: string
          created_at?: string
          id?: string
          partner_feedback_notes?: string | null
          partner_id: string
          treatment_status?: Database["public"]["Enums"]["treatment_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          client_id?: string
          created_at?: string
          id?: string
          partner_feedback_notes?: string | null
          partner_id?: string
          treatment_status?: Database["public"]["Enums"]["treatment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_assignments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_profiles: {
        Row: {
          company_name: string | null
          created_at: string
          id: string
          specialization_category: string | null
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          id: string
          specialization_category?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          id?: string
          specialization_category?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          category_id: string | null
          contact_info: Json
          created_at: string
          email: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          contact_info?: Json
          created_at?: string
          email?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          contact_info?: Json
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professionals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          partner_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          partner_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          partner_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          category_id: string | null
          client_html_body: string
          client_subject: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          notify_partner: boolean
          response_template_html: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          client_html_body: string
          client_subject: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notify_partner?: boolean
          response_template_html?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          client_html_body?: string
          client_subject?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notify_partner?: boolean
          response_template_html?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
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
      visibility_rules: {
        Row: {
          allowed_schema_fields: Json
          created_at: string
          id: string
          partner_category: string
          updated_at: string
        }
        Insert: {
          allowed_schema_fields?: Json
          created_at?: string
          id?: string
          partner_category: string
          updated_at?: string
        }
        Update: {
          allowed_schema_fields?: Json
          created_at?: string
          id?: string
          partner_category?: string
          updated_at?: string
        }
        Relationships: []
      }
      webhook_settings: {
        Row: {
          id: string
          outbound_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          outbound_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          outbound_url?: string | null
          updated_at?: string
          updated_by?: string | null
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
      app_role: "admin" | "client" | "partner"
      category_type: "topic" | "professional"
      custom_field_entity: "client" | "partner" | "professional" | "topic"
      custom_field_type:
        | "text"
        | "number"
        | "date"
        | "boolean"
        | "select"
        | "multiselect"
      lead_source: "email" | "whatsapp" | "yemot_hamashiach" | "nedarim_plus"
      payment_status: "unpaid" | "active_subscriber"
      task_priority: "low" | "medium" | "high"
      task_status: "pending" | "in_progress" | "completed"
      treatment_status: "sent" | "in_progress" | "completed"
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
      app_role: ["admin", "client", "partner"],
      category_type: ["topic", "professional"],
      custom_field_entity: ["client", "partner", "professional", "topic"],
      custom_field_type: [
        "text",
        "number",
        "date",
        "boolean",
        "select",
        "multiselect",
      ],
      lead_source: ["email", "whatsapp", "yemot_hamashiach", "nedarim_plus"],
      payment_status: ["unpaid", "active_subscriber"],
      task_priority: ["low", "medium", "high"],
      task_status: ["pending", "in_progress", "completed"],
      treatment_status: ["sent", "in_progress", "completed"],
    },
  },
} as const
