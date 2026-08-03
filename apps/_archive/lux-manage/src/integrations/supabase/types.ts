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
      academy_content: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          duration: string | null
          icon: string | null
          id: string
          target_topic: string | null
          title: string
          type: string
          video_url: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          duration?: string | null
          icon?: string | null
          id?: string
          target_topic?: string | null
          title: string
          type?: string
          video_url?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          duration?: string | null
          icon?: string | null
          id?: string
          target_topic?: string | null
          title?: string
          type?: string
          video_url?: string | null
        }
        Relationships: []
      }
      benefit_statuses: {
        Row: {
          benefit_key: string
          id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          benefit_key: string
          id?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          benefit_key?: string
          id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      budget_items: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          description: string | null
          due_date: string | null
          due_month: number | null
          duration_months: number | null
          end_date: string | null
          id: string
          installments: number | null
          is_active: boolean
          is_business: boolean
          payment_method: string | null
          start_date: string | null
          subcategory: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          due_month?: number | null
          duration_months?: number | null
          end_date?: string | null
          id?: string
          installments?: number | null
          is_active?: boolean
          is_business?: boolean
          payment_method?: string | null
          start_date?: string | null
          subcategory?: string
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          due_month?: number | null
          duration_months?: number | null
          end_date?: string | null
          id?: string
          installments?: number | null
          is_active?: boolean
          is_business?: boolean
          payment_method?: string | null
          start_date?: string | null
          subcategory?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      budget_limits: {
        Row: {
          amount: number
          category: string
          id: string
          user_id: string
        }
        Insert: {
          amount?: number
          category: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      condition_rules: {
        Row: {
          alert_message: string
          alert_title: string
          category: string | null
          created_at: string | null
          created_by: string | null
          field: string
          id: string
          operator: string
          target_segment: string | null
          tip_content: string | null
          tip_type: string | null
          value: number
          value_to: number | null
        }
        Insert: {
          alert_message: string
          alert_title: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          field: string
          id?: string
          operator: string
          target_segment?: string | null
          tip_content?: string | null
          tip_type?: string | null
          value?: number
          value_to?: number | null
        }
        Update: {
          alert_message?: string
          alert_title?: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          field?: string
          id?: string
          operator?: string
          target_segment?: string | null
          tip_content?: string | null
          tip_type?: string | null
          value?: number
          value_to?: number | null
        }
        Relationships: []
      }
      dynamic_questions: {
        Row: {
          condition_alerts: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          options: string[] | null
          required: boolean | null
          target_segment: string | null
          text: string
          type: string
        }
        Insert: {
          condition_alerts?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          options?: string[] | null
          required?: boolean | null
          target_segment?: string | null
          text: string
          type?: string
        }
        Update: {
          condition_alerts?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          options?: string[] | null
          required?: boolean | null
          target_segment?: string | null
          text?: string
          type?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          client_name: string
          created_at: string | null
          id: string
          items: Json | null
          status: string | null
          total: number | null
          user_id: string
        }
        Insert: {
          client_name: string
          created_at?: string | null
          id?: string
          items?: Json | null
          status?: string | null
          total?: number | null
          user_id: string
        }
        Update: {
          client_name?: string
          created_at?: string | null
          id?: string
          items?: Json | null
          status?: string | null
          total?: number | null
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          message: string | null
          name: string
          phone: string | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          source?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          assigned_advisor_id: string | null
          business_dividends: number | null
          business_enabled: boolean | null
          car_type: string | null
          car_year: number | null
          children_ages: number[] | null
          children_count: number | null
          children_health_needs: string[] | null
          children_names: string[] | null
          city: string | null
          created_at: string | null
          credit_card_debt: number | null
          daily_expenses: number | null
          enabled_modules: Json | null
          family_financial_help: boolean | null
          family_help_amount: number | null
          family_status: string | null
          health_fund: string | null
          id: string
          id_number: string | null
          ivr_pin: string | null
          living_standard: string | null
          loans: Json | null
          monthly_fixed_expenses: number | null
          monthly_income: number | null
          mortgage_monthly: number | null
          name: string
          onboarding_complete: boolean | null
          one_time_income: number | null
          passive_income: number | null
          profile_complete: boolean | null
          real_estate_assets: string | null
          recurring_support: number | null
          rent_amount: number | null
          residential_status: string | null
          sector: string | null
          special_health_needs: string | null
          tier: string | null
          updated_at: string | null
          weekly_expenses: number | null
          yearly_bonus: number | null
          yearly_fixed_expenses: number | null
        }
        Insert: {
          assigned_advisor_id?: string | null
          business_dividends?: number | null
          business_enabled?: boolean | null
          car_type?: string | null
          car_year?: number | null
          children_ages?: number[] | null
          children_count?: number | null
          children_health_needs?: string[] | null
          children_names?: string[] | null
          city?: string | null
          created_at?: string | null
          credit_card_debt?: number | null
          daily_expenses?: number | null
          enabled_modules?: Json | null
          family_financial_help?: boolean | null
          family_help_amount?: number | null
          family_status?: string | null
          health_fund?: string | null
          id: string
          id_number?: string | null
          ivr_pin?: string | null
          living_standard?: string | null
          loans?: Json | null
          monthly_fixed_expenses?: number | null
          monthly_income?: number | null
          mortgage_monthly?: number | null
          name?: string
          onboarding_complete?: boolean | null
          one_time_income?: number | null
          passive_income?: number | null
          profile_complete?: boolean | null
          real_estate_assets?: string | null
          recurring_support?: number | null
          rent_amount?: number | null
          residential_status?: string | null
          sector?: string | null
          special_health_needs?: string | null
          tier?: string | null
          updated_at?: string | null
          weekly_expenses?: number | null
          yearly_bonus?: number | null
          yearly_fixed_expenses?: number | null
        }
        Update: {
          assigned_advisor_id?: string | null
          business_dividends?: number | null
          business_enabled?: boolean | null
          car_type?: string | null
          car_year?: number | null
          children_ages?: number[] | null
          children_count?: number | null
          children_health_needs?: string[] | null
          children_names?: string[] | null
          city?: string | null
          created_at?: string | null
          credit_card_debt?: number | null
          daily_expenses?: number | null
          enabled_modules?: Json | null
          family_financial_help?: boolean | null
          family_help_amount?: number | null
          family_status?: string | null
          health_fund?: string | null
          id?: string
          id_number?: string | null
          ivr_pin?: string | null
          living_standard?: string | null
          loans?: Json | null
          monthly_fixed_expenses?: number | null
          monthly_income?: number | null
          mortgage_monthly?: number | null
          name?: string
          onboarding_complete?: boolean | null
          one_time_income?: number | null
          passive_income?: number | null
          profile_complete?: boolean | null
          real_estate_assets?: string | null
          recurring_support?: number | null
          rent_amount?: number | null
          residential_status?: string | null
          sector?: string | null
          special_health_needs?: string | null
          tier?: string | null
          updated_at?: string | null
          weekly_expenses?: number | null
          yearly_bonus?: number | null
          yearly_fixed_expenses?: number | null
        }
        Relationships: []
      }
      project_categories: {
        Row: {
          budget: number
          id: string
          name: string
          parent_group: string | null
          project_id: string
          sort_order: number | null
          spent: number
        }
        Insert: {
          budget?: number
          id?: string
          name: string
          parent_group?: string | null
          project_id: string
          sort_order?: number | null
          spent?: number
        }
        Update: {
          budget?: number
          id?: string
          name?: string
          parent_group?: string | null
          project_id?: string
          sort_order?: number | null
          spent?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_categories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          created_at: string | null
          due_date: string | null
          id: string
          notes: string | null
          project_id: string
          show_in_calendar: boolean | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          project_id: string
          show_in_calendar?: boolean | null
          status?: string
          title: string
        }
        Update: {
          created_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          show_in_calendar?: boolean | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          date: string
          description: string | null
          id: string
          project_id: string
        }
        Insert: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          project_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "project_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          id: string
          name: string
          spent: number
          status: string
          template: string | null
          total_budget: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          spent?: number
          status?: string
          template?: string | null
          total_budget?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          spent?: number
          status?: string
          template?: string | null
          total_budget?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rights_inquiries: {
        Row: {
          admin_notes: string | null
          assigned_advisor_id: string | null
          client_id: string
          created_at: string | null
          description: string | null
          id: string
          right_type: string
          service_preference: string
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          assigned_advisor_id?: string | null
          client_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          right_type?: string
          service_preference?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          assigned_advisor_id?: string | null
          client_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          right_type?: string
          service_preference?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          category: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          next_payment_amount: number | null
          next_payment_date: string | null
          notes: string | null
          phone: string | null
          rating: number | null
          total_paid: number | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          next_payment_amount?: number | null
          next_payment_date?: string | null
          notes?: string | null
          phone?: string | null
          rating?: number | null
          total_paid?: number | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          next_payment_amount?: number | null
          next_payment_date?: string | null
          notes?: string | null
          phone?: string | null
          rating?: number | null
          total_paid?: number | null
          user_id?: string
        }
        Relationships: []
      }
      task_history: {
        Row: {
          auto_generated: boolean | null
          auto_id: string | null
          completed_at: string
          completion_note: string
          id: string
          task_category: string | null
          task_description: string | null
          task_title: string
          user_id: string
        }
        Insert: {
          auto_generated?: boolean | null
          auto_id?: string | null
          completed_at?: string
          completion_note: string
          id?: string
          task_category?: string | null
          task_description?: string | null
          task_title: string
          user_id: string
        }
        Update: {
          auto_generated?: boolean | null
          auto_id?: string | null
          completed_at?: string
          completion_note?: string
          id?: string
          task_category?: string | null
          task_description?: string | null
          task_title?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          auto_generated: boolean | null
          auto_id: string | null
          category: string | null
          completed_at: string | null
          completion_note: string | null
          created_at: string | null
          description: string | null
          dismissal_reason: string | null
          due_date: string
          id: string
          remind_channel: string | null
          remind_date: string | null
          snooze_until: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          auto_generated?: boolean | null
          auto_id?: string | null
          category?: string | null
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string | null
          description?: string | null
          dismissal_reason?: string | null
          due_date?: string
          id?: string
          remind_channel?: string | null
          remind_date?: string | null
          snooze_until?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          auto_generated?: boolean | null
          auto_id?: string | null
          category?: string | null
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string | null
          description?: string | null
          dismissal_reason?: string | null
          due_date?: string
          id?: string
          remind_channel?: string | null
          remind_date?: string | null
          snooze_until?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          date: string
          description: string | null
          id: string
          installment_details: Json | null
          is_installment: boolean | null
          is_recurring: boolean | null
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          installment_details?: Json | null
          is_installment?: boolean | null
          is_recurring?: boolean | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          installment_details?: Json | null
          is_installment?: boolean | null
          is_recurring?: boolean | null
          type?: string
          user_id?: string
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
      app_role: "admin" | "moderator" | "user" | "advisor"
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
      app_role: ["admin", "moderator", "user", "advisor"],
    },
  },
} as const
