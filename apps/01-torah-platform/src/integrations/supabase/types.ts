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
      admin_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: number
          identity: string
          role: string
          token: string
        }
        Insert: {
          created_at: string
          expires_at: string
          id?: number
          identity: string
          role?: string
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: number
          identity?: string
          role?: string
          token?: string
        }
        Relationships: []
      }
      ads: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          placement: string
          size: string
          sort_order: number | null
          starts_at: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          placement?: string
          size?: string
          sort_order?: number | null
          starts_at?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          placement?: string
          size?: string
          sort_order?: number | null
          starts_at?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string | null
          category: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_pinned: boolean | null
          is_published: boolean | null
          publish_date: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          body?: string | null
          category?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          is_published?: boolean | null
          publish_date?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          body?: string | null
          category?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          is_published?: boolean | null
          publish_date?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          created_at: string
          credentials_delivered_at: string | null
          email: string | null
          fin_client_id: number | null
          full_name: string
          id: number
          last_login_at: string | null
          notes: string | null
          password_hash: string | null
          password_plain: string | null
          phone: string | null
          plan: string
          product_access_json: string
          role: string
          status: string
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at: string
          credentials_delivered_at?: string | null
          email?: string | null
          fin_client_id?: number | null
          full_name: string
          id?: number
          last_login_at?: string | null
          notes?: string | null
          password_hash?: string | null
          password_plain?: string | null
          phone?: string | null
          plan?: string
          product_access_json?: string
          role?: string
          status?: string
          updated_at: string
          username?: string | null
        }
        Update: {
          created_at?: string
          credentials_delivered_at?: string | null
          email?: string | null
          fin_client_id?: number | null
          full_name?: string
          id?: number
          last_login_at?: string | null
          notes?: string | null
          password_hash?: string | null
          password_plain?: string | null
          phone?: string | null
          plan?: string
          product_access_json?: string
          role?: string
          status?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          is_present: boolean
          lesson_id: string | null
          notes: string | null
          participant_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_present?: boolean
          lesson_id?: string | null
          notes?: string | null
          participant_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_present?: boolean
          lesson_id?: string | null
          notes?: string | null
          participant_id?: string
          tenant_id?: string
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
          {
            foreignKeyName: "attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          diff: Json | null
          entity: string | null
          entity_id: string | null
          id: string
          ip: string | null
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          diff?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          diff?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_configs: {
        Row: {
          config_json: string
          description: string | null
          enabled: number
          endpoint_url: string | null
          id: number
          key: string
          label: string
          last_result: string | null
          last_status: string | null
          last_tested_at: string | null
          secret_ref: string | null
          updated_at: string
        }
        Insert: {
          config_json?: string
          description?: string | null
          enabled?: number
          endpoint_url?: string | null
          id?: number
          key: string
          label: string
          last_result?: string | null
          last_status?: string | null
          last_tested_at?: string | null
          secret_ref?: string | null
          updated_at: string
        }
        Update: {
          config_json?: string
          description?: string | null
          enabled?: number
          endpoint_url?: string | null
          id?: number
          key?: string
          label?: string
          last_result?: string | null
          last_status?: string | null
          last_tested_at?: string | null
          secret_ref?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      azkarot: {
        Row: {
          created_at: string
          date_of_death: string | null
          date_of_death_hebrew: string | null
          deceased_father_name: string | null
          deceased_name: string
          family_contact_name: string | null
          family_contact_phone: string | null
          id: string
          next_azkara_date: string | null
          notes: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          date_of_death?: string | null
          date_of_death_hebrew?: string | null
          deceased_father_name?: string | null
          deceased_name: string
          family_contact_name?: string | null
          family_contact_phone?: string | null
          id?: string
          next_azkara_date?: string | null
          notes?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          date_of_death?: string | null
          date_of_death_hebrew?: string | null
          deceased_father_name?: string | null
          deceased_name?: string
          family_contact_name?: string | null
          family_contact_phone?: string | null
          id?: string
          next_azkara_date?: string | null
          notes?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "azkarot_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          id: string
          items: Json
          session_id: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          session_id?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          session_id?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachments: Json | null
          body: string
          created_at: string
          id: string
          room_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          body: string
          created_at?: string
          id?: string
          room_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          body?: string
          created_at?: string
          id?: string
          room_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_private: boolean | null
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          birth_date: string | null
          city: string | null
          created_at: string
          email: string | null
          family_status: string | null
          full_name: string
          id: number
          id_number: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          city?: string | null
          created_at: string
          email?: string | null
          family_status?: string | null
          full_name: string
          id?: number
          id_number?: string | null
          phone: string
          updated_at: string
        }
        Update: {
          birth_date?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          family_status?: string | null
          full_name?: string
          id?: number
          id_number?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_services: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          hours: string | null
          id: string
          is_active: boolean | null
          links: Json | null
          notes: string | null
          service_type: string
          tenant_id: string
          title: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          hours?: string | null
          id?: string
          is_active?: boolean | null
          links?: Json | null
          notes?: string | null
          service_type: string
          tenant_id: string
          title: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          hours?: string | null
          id?: string
          is_active?: boolean | null
          links?: Json | null
          notes?: string | null
          service_type?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_queue: {
        Row: {
          attempts: number
          body: string
          callback_url: string | null
          channel: string
          created_at: string
          created_by: string | null
          endpoint_used: string | null
          id: number
          recipient_id: number | null
          recipient_label: string
          recipient_type: string
          response_text: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          status_detail: string | null
          subject: string | null
          to_address: string
        }
        Insert: {
          attempts?: number
          body: string
          callback_url?: string | null
          channel: string
          created_at: string
          created_by?: string | null
          endpoint_used?: string | null
          id?: number
          recipient_id?: number | null
          recipient_label: string
          recipient_type: string
          response_text?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          status_detail?: string | null
          subject?: string | null
          to_address: string
        }
        Update: {
          attempts?: number
          body?: string
          callback_url?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          endpoint_used?: string | null
          id?: number
          recipient_id?: number | null
          recipient_label?: string
          recipient_type?: string
          response_text?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          status_detail?: string | null
          subject?: string | null
          to_address?: string
        }
        Relationships: []
      }
      donation_campaigns: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string | null
          goal_ils: number | null
          hero_image_url: string | null
          id: string
          is_active: boolean | null
          meta: Json | null
          raised_ils: number | null
          slug: string
          starts_at: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          goal_ils?: number | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean | null
          meta?: Json | null
          raised_ils?: number | null
          slug: string
          starts_at?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          goal_ils?: number | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean | null
          meta?: Json | null
          raised_ils?: number | null
          slug?: string
          starts_at?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "donation_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount_ils: number
          campaign_id: string | null
          created_at: string
          dedication_father_name: string | null
          dedication_for_name: string | null
          dedication_message: string | null
          dedication_type: string | null
          donor_address: string | null
          donor_city: string | null
          donor_email: string | null
          donor_name: string
          donor_phone: string
          id: string
          is_anonymous: boolean | null
          is_recurring: boolean | null
          meta: Json | null
          notes: string | null
          paid_at: string | null
          parent_donation_id: string | null
          payment_meta: Json | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          receipt_issued_at: string | null
          receipt_number: string | null
          receipt_url: string | null
          recurring_charge_day: number | null
          recurring_months: number | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          amount_ils: number
          campaign_id?: string | null
          created_at?: string
          dedication_father_name?: string | null
          dedication_for_name?: string | null
          dedication_message?: string | null
          dedication_type?: string | null
          donor_address?: string | null
          donor_city?: string | null
          donor_email?: string | null
          donor_name: string
          donor_phone: string
          id?: string
          is_anonymous?: boolean | null
          is_recurring?: boolean | null
          meta?: Json | null
          notes?: string | null
          paid_at?: string | null
          parent_donation_id?: string | null
          payment_meta?: Json | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          receipt_issued_at?: string | null
          receipt_number?: string | null
          receipt_url?: string | null
          recurring_charge_day?: number | null
          recurring_months?: number | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          amount_ils?: number
          campaign_id?: string | null
          created_at?: string
          dedication_father_name?: string | null
          dedication_for_name?: string | null
          dedication_message?: string | null
          dedication_type?: string | null
          donor_address?: string | null
          donor_city?: string | null
          donor_email?: string | null
          donor_name?: string
          donor_phone?: string
          id?: string
          is_anonymous?: boolean | null
          is_recurring?: boolean | null
          meta?: Json | null
          notes?: string | null
          paid_at?: string | null
          parent_donation_id?: string | null
          payment_meta?: Json | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          receipt_issued_at?: string | null
          receipt_number?: string | null
          receipt_url?: string | null
          recurring_charge_day?: number | null
          recurring_months?: number | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "donation_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_parent_donation_id_fkey"
            columns: ["parent_donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_alerts: {
        Row: {
          acknowledged: number
          body: string | null
          client_id: number
          created_at: string
          id: number
          level: string
          source: string | null
          title: string
        }
        Insert: {
          acknowledged?: number
          body?: string | null
          client_id: number
          created_at: string
          id?: number
          level?: string
          source?: string | null
          title: string
        }
        Update: {
          acknowledged?: number
          body?: string | null
          client_id?: number
          created_at?: string
          id?: number
          level?: string
          source?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fin_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_budgets: {
        Row: {
          category_id: number
          client_id: number
          created_at: string
          id: number
          monthly_limit: number
          note: string | null
        }
        Insert: {
          category_id: number
          client_id: number
          created_at: string
          id?: number
          monthly_limit: number
          note?: string | null
        }
        Update: {
          category_id?: number
          client_id?: number
          created_at?: string
          id?: number
          monthly_limit?: number
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fin_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_budgets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fin_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_categories: {
        Row: {
          client_id: number | null
          color: string | null
          created_at: string
          icon: string | null
          id: number
          is_system: number
          kind: string
          name: string
        }
        Insert: {
          client_id?: number | null
          color?: string | null
          created_at: string
          icon?: string | null
          id?: number
          is_system?: number
          kind?: string
          name: string
        }
        Update: {
          client_id?: number | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: number
          is_system?: number
          kind?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_categories_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fin_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_clients: {
        Row: {
          city: string | null
          created_at: string
          email: string | null
          family_size: number | null
          full_name: string
          id: number
          mode: string
          monthly_income: number | null
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at: string
          email?: string | null
          family_size?: number | null
          full_name: string
          id?: number
          mode?: string
          monthly_income?: number | null
          notes?: string | null
          phone?: string | null
          updated_at: string
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string | null
          family_size?: number | null
          full_name?: string
          id?: number
          mode?: string
          monthly_income?: number | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fin_debts: {
        Row: {
          client_id: number
          created_at: string
          creditor: string
          current_balance: number
          end_date: string | null
          id: number
          interest_rate: number | null
          kind: string
          monthly_payment: number | null
          notes: string | null
          original_amount: number | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: number
          created_at: string
          creditor: string
          current_balance: number
          end_date?: string | null
          id?: number
          interest_rate?: number | null
          kind?: string
          monthly_payment?: number | null
          notes?: string | null
          original_amount?: number | null
          start_date?: string | null
          status?: string
          updated_at: string
        }
        Update: {
          client_id?: number
          created_at?: string
          creditor?: string
          current_balance?: number
          end_date?: string | null
          id?: number
          interest_rate?: number | null
          kind?: string
          monthly_payment?: number | null
          notes?: string | null
          original_amount?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_debts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fin_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_goals: {
        Row: {
          category: string | null
          client_id: number
          created_at: string
          id: number
          monthly_contribution: number | null
          notes: string | null
          saved_amount: number
          status: string
          target_amount: number
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          client_id: number
          created_at: string
          id?: number
          monthly_contribution?: number | null
          notes?: string | null
          saved_amount?: number
          status?: string
          target_amount: number
          target_date?: string | null
          title: string
          updated_at: string
        }
        Update: {
          category?: string | null
          client_id?: number
          created_at?: string
          id?: number
          monthly_contribution?: number | null
          notes?: string | null
          saved_amount?: number
          status?: string
          target_amount?: number
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fin_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_leads: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: number
          message: string | null
          mode: string | null
          phone: string
          source: string | null
          status: string
          webhook_response: string | null
          webhook_sent_at: string | null
          webhook_status: string
        }
        Insert: {
          created_at: string
          email?: string | null
          full_name: string
          id?: number
          message?: string | null
          mode?: string | null
          phone: string
          source?: string | null
          status?: string
          webhook_response?: string | null
          webhook_sent_at?: string | null
          webhook_status?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: number
          message?: string | null
          mode?: string | null
          phone?: string
          source?: string | null
          status?: string
          webhook_response?: string | null
          webhook_sent_at?: string | null
          webhook_status?: string
        }
        Relationships: []
      }
      fin_notes: {
        Row: {
          author_role: string
          body: string
          client_id: number
          created_at: string
          id: number
          title: string | null
          visibility: string
        }
        Insert: {
          author_role?: string
          body: string
          client_id: number
          created_at: string
          id?: number
          title?: string | null
          visibility?: string
        }
        Update: {
          author_role?: string
          body?: string
          client_id?: number
          created_at?: string
          id?: number
          title?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fin_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_opportunities: {
        Row: {
          category: string | null
          client_id: number | null
          created_at: string
          estimated_yearly_value: number | null
          id: number
          recommendation: string | null
          right_id: number | null
          status: string
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          client_id?: number | null
          created_at: string
          estimated_yearly_value?: number | null
          id?: number
          recommendation?: string | null
          right_id?: number | null
          status?: string
          title: string
          topic?: string | null
          updated_at: string
        }
        Update: {
          category?: string | null
          client_id?: number | null
          created_at?: string
          estimated_yearly_value?: number | null
          id?: number
          recommendation?: string | null
          right_id?: number | null
          status?: string
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fin_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_plans: {
        Row: {
          client_id: number
          created_at: string
          id: number
          premium: number
          status: string
          steps_json: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          client_id: number
          created_at: string
          id?: number
          premium?: number
          status?: string
          steps_json?: string
          summary?: string | null
          title: string
          updated_at: string
        }
        Update: {
          client_id?: number
          created_at?: string
          id?: number
          premium?: number
          status?: string
          steps_json?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fin_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_recurring: {
        Row: {
          active: number
          amount: number | null
          cadence: string
          category_id: number | null
          client_id: number
          created_at: string
          description: string | null
          id: number
          kind: string
          next_date: string
          title: string
        }
        Insert: {
          active?: number
          amount?: number | null
          cadence?: string
          category_id?: number | null
          client_id: number
          created_at: string
          description?: string | null
          id?: number
          kind?: string
          next_date: string
          title: string
        }
        Update: {
          active?: number
          amount?: number | null
          cadence?: string
          category_id?: number | null
          client_id?: number
          created_at?: string
          description?: string | null
          id?: number
          kind?: string
          next_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_recurring_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fin_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_recurring_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fin_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_tips: {
        Row: {
          active: number
          body: string
          created_at: string
          id: number
          tag: string | null
          title: string
        }
        Insert: {
          active?: number
          body: string
          created_at: string
          id?: number
          tag?: string | null
          title: string
        }
        Update: {
          active?: number
          body?: string
          created_at?: string
          id?: number
          tag?: string | null
          title?: string
        }
        Relationships: []
      }
      fin_transactions: {
        Row: {
          amount: number
          category_id: number | null
          client_id: number
          created_at: string
          description: string | null
          id: number
          kind: string
          occurred_on: string
          source: string | null
        }
        Insert: {
          amount: number
          category_id?: number | null
          client_id: number
          created_at: string
          description?: string | null
          id?: number
          kind?: string
          occurred_on: string
          source?: string | null
        }
        Update: {
          amount?: number
          category_id?: number | null
          client_id?: number
          created_at?: string
          description?: string | null
          id?: number
          kind?: string
          occurred_on?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fin_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fin_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_access: {
        Row: {
          can_moderate: boolean
          can_post: boolean
          can_view: boolean
          category_id: string
          id: string
          user_id: string
        }
        Insert: {
          can_moderate?: boolean
          can_post?: boolean
          can_view?: boolean
          category_id: string
          id?: string
          user_id: string
        }
        Update: {
          can_moderate?: boolean
          can_post?: boolean
          can_view?: boolean
          category_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_access_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          scope: string
          slug: string
          sort_order: number | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          scope?: string
          slug: string
          sort_order?: number | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          scope?: string
          slug?: string
          sort_order?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_comments: {
        Row: {
          attachments: Json | null
          body: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          body: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
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
          attachments: Json | null
          body: string | null
          category_id: string
          created_at: string
          id: string
          is_locked: boolean | null
          is_pinned: boolean | null
          tenant_id: string | null
          title: string | null
          updated_at: string
          user_id: string
          views: number | null
        }
        Insert: {
          attachments?: Json | null
          body?: string | null
          category_id: string
          created_at?: string
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          tenant_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          views?: number | null
        }
        Update: {
          attachments?: Json | null
          body?: string | null
          category_id?: string
          created_at?: string
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          tenant_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          sort_order: number | null
          tenant_id: string
          title: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          sort_order?: number | null
          tenant_id: string
          title?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          sort_order?: number | null
          tenant_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_images_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      halacha_daily: {
        Row: {
          audio_url: string | null
          body: string
          category: string | null
          created_at: string
          date: string
          id: string
          source: string | null
          tenant_id: string | null
          title: string
        }
        Insert: {
          audio_url?: string | null
          body: string
          category?: string | null
          created_at?: string
          date: string
          id?: string
          source?: string | null
          tenant_id?: string | null
          title: string
        }
        Update: {
          audio_url?: string | null
          body?: string
          category?: string | null
          created_at?: string
          date?: string
          id?: string
          source?: string | null
          tenant_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "halacha_daily_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_leads: {
        Row: {
          answers_json: string
          auth_status: string
          category: string | null
          contact_email: string | null
          contact_full_name: string | null
          contact_id_number: string | null
          contact_phone: string | null
          created_at: string
          documents_json: string
          external_id: string | null
          id: number
          ip_address: string | null
          lead_kind: string
          legal_accepted_json: string
          notes: string | null
          origin: string | null
          potential_level: string | null
          potential_score: number | null
          raw_payload_json: string
          referrer: string | null
          request_type: string | null
          selected_path: string | null
          source_page: string | null
          source_site: string | null
          status: string
          topic: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          webhook_log_id: number | null
          webhook_status: string
        }
        Insert: {
          answers_json?: string
          auth_status?: string
          category?: string | null
          contact_email?: string | null
          contact_full_name?: string | null
          contact_id_number?: string | null
          contact_phone?: string | null
          created_at: string
          documents_json?: string
          external_id?: string | null
          id?: number
          ip_address?: string | null
          lead_kind?: string
          legal_accepted_json?: string
          notes?: string | null
          origin?: string | null
          potential_level?: string | null
          potential_score?: number | null
          raw_payload_json?: string
          referrer?: string | null
          request_type?: string | null
          selected_path?: string | null
          source_page?: string | null
          source_site?: string | null
          status?: string
          topic?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          webhook_log_id?: number | null
          webhook_status?: string
        }
        Update: {
          answers_json?: string
          auth_status?: string
          category?: string | null
          contact_email?: string | null
          contact_full_name?: string | null
          contact_id_number?: string | null
          contact_phone?: string | null
          created_at?: string
          documents_json?: string
          external_id?: string | null
          id?: number
          ip_address?: string | null
          lead_kind?: string
          legal_accepted_json?: string
          notes?: string | null
          origin?: string | null
          potential_level?: string | null
          potential_score?: number | null
          raw_payload_json?: string
          referrer?: string | null
          request_type?: string | null
          selected_path?: string | null
          source_page?: string | null
          source_site?: string | null
          status?: string
          topic?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          webhook_log_id?: number | null
          webhook_status?: string
        }
        Relationships: []
      }
      kashrut_certifications: {
        Row: {
          address: string | null
          business_name: string
          business_type: string | null
          certificate_url: string | null
          certifier: string | null
          city: string | null
          created_at: string
          hechsher_level: string | null
          id: string
          notes: string | null
          status: string
          tenant_id: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          address?: string | null
          business_name: string
          business_type?: string | null
          certificate_url?: string | null
          certifier?: string | null
          city?: string | null
          created_at?: string
          hechsher_level?: string | null
          id?: string
          notes?: string | null
          status?: string
          tenant_id: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          business_type?: string | null
          certificate_url?: string | null
          certifier?: string | null
          city?: string | null
          created_at?: string
          hechsher_level?: string | null
          id?: string
          notes?: string | null
          status?: string
          tenant_id?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kashrut_certifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          area: string | null
          assigned_teacher_user_id: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          kind: string
          message: string | null
          phone: string | null
          preferred_subject: string | null
          raw_data: Json | null
          source: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          assigned_teacher_user_id?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          kind: string
          message?: string | null
          phone?: string | null
          preferred_subject?: string | null
          raw_data?: Json | null
          source?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          assigned_teacher_user_id?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          kind?: string
          message?: string | null
          phone?: string | null
          preferred_subject?: string | null
          raw_data?: Json | null
          source?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_acceptances: {
        Row: {
          accepted_at: string
          document_key: string
          document_version: string
          full_name: string | null
          id: number
          identifier: string | null
          ip_address: string | null
          signature_method: string
          signature_value: string | null
          subject_id: number | null
          subject_kind: string
          user_agent: string | null
        }
        Insert: {
          accepted_at: string
          document_key: string
          document_version: string
          full_name?: string | null
          id?: number
          identifier?: string | null
          ip_address?: string | null
          signature_method?: string
          signature_value?: string | null
          subject_id?: number | null
          subject_kind: string
          user_agent?: string | null
        }
        Update: {
          accepted_at?: string
          document_key?: string
          document_version?: string
          full_name?: string | null
          id?: number
          identifier?: string | null
          ip_address?: string | null
          signature_method?: string
          signature_value?: string | null
          subject_id?: number | null
          subject_kind?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      lesson_bookmarks: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_bookmarks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_topics: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_topics_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "lesson_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          address: string | null
          audience: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          date_specific: string | null
          day_of_week: number | null
          description: string | null
          duration_minutes: number | null
          id: string
          igud_tagged: boolean
          is_active: boolean
          is_approved: boolean
          language: string | null
          meta: Json
          neighborhood: string | null
          rabbi_name: string | null
          rabbi_user_id: string | null
          recording_url: string | null
          stream_url: string | null
          style: string | null
          synagogue_id: string | null
          tenant_id: string
          time_hhmm: string | null
          title: string
          topic_free_text: string | null
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          audience?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          date_specific?: string | null
          day_of_week?: number | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          igud_tagged?: boolean
          is_active?: boolean
          is_approved?: boolean
          language?: string | null
          meta?: Json
          neighborhood?: string | null
          rabbi_name?: string | null
          rabbi_user_id?: string | null
          recording_url?: string | null
          stream_url?: string | null
          style?: string | null
          synagogue_id?: string | null
          tenant_id: string
          time_hhmm?: string | null
          title: string
          topic_free_text?: string | null
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          audience?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          date_specific?: string | null
          day_of_week?: number | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          igud_tagged?: boolean
          is_active?: boolean
          is_approved?: boolean
          language?: string | null
          meta?: Json
          neighborhood?: string | null
          rabbi_name?: string | null
          rabbi_user_id?: string | null
          recording_url?: string | null
          stream_url?: string | null
          style?: string | null
          synagogue_id?: string | null
          tenant_id?: string
          time_hhmm?: string | null
          title?: string
          topic_free_text?: string | null
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: false
            referencedRelation: "synagogues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "lesson_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_forum_category_id: string | null
          display_in_public_profile: boolean | null
          duration_seconds: number | null
          featured_on_homepage: boolean | null
          file_size: number | null
          file_url: string | null
          id: string
          media_kind: string
          meta: Json | null
          owner_user_id: string | null
          rejection_reason: string | null
          status: string
          subcategory: string | null
          tenant_id: string
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_forum_category_id?: string | null
          display_in_public_profile?: boolean | null
          duration_seconds?: number | null
          featured_on_homepage?: boolean | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          media_kind: string
          meta?: Json | null
          owner_user_id?: string | null
          rejection_reason?: string | null
          status?: string
          subcategory?: string | null
          tenant_id: string
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_forum_category_id?: string | null
          display_in_public_profile?: boolean | null
          duration_seconds?: number | null
          featured_on_homepage?: boolean | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          media_kind?: string
          meta?: Json | null
          owner_user_id?: string | null
          rejection_reason?: string | null
          status?: string
          subcategory?: string | null
          tenant_id?: string
          thumbnail_url?: string | null
          title?: string
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
            foreignKeyName: "materials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          id: string
          joined_at: string
          meta: Json
          role: Database["public"]["Enums"]["app_role"]
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          meta?: Json
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          meta?: Json
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nedarim_configs: {
        Row: {
          api_valid: boolean | null
          charge_message: string | null
          default_campaign_id: string | null
          failure_redirect_url: string | null
          meta: Json | null
          mosad_id: string
          success_redirect_url: string | null
          tenant_id: string
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          api_valid?: boolean | null
          charge_message?: string | null
          default_campaign_id?: string | null
          failure_redirect_url?: string | null
          meta?: Json | null
          mosad_id: string
          success_redirect_url?: string | null
          tenant_id: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          api_valid?: boolean | null
          charge_message?: string | null
          default_campaign_id?: string | null
          failure_redirect_url?: string | null
          meta?: Json | null
          mosad_id?: string
          success_redirect_url?: string | null
          tenant_id?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nedarim_configs_default_campaign_id_fkey"
            columns: ["default_campaign_id"]
            isOneToOne: false
            referencedRelation: "donation_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nedarim_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nedarim_transactions: {
        Row: {
          amount_ils: number | null
          confirmation_code: string | null
          created_at: string
          donation_id: string | null
          error_message: string | null
          id: string
          order_id: string | null
          raw_request: Json | null
          raw_response: Json | null
          status: string | null
          tenant_id: string
          transaction_id: string | null
          webhook_payload: Json | null
        }
        Insert: {
          amount_ils?: number | null
          confirmation_code?: string | null
          created_at?: string
          donation_id?: string | null
          error_message?: string | null
          id?: string
          order_id?: string | null
          raw_request?: Json | null
          raw_response?: Json | null
          status?: string | null
          tenant_id: string
          transaction_id?: string | null
          webhook_payload?: Json | null
        }
        Update: {
          amount_ils?: number | null
          confirmation_code?: string | null
          created_at?: string
          donation_id?: string | null
          error_message?: string | null
          id?: string
          order_id?: string | null
          raw_request?: Json | null
          raw_response?: Json | null
          status?: string | null
          tenant_id?: string
          transaction_id?: string | null
          webhook_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "nedarim_transactions_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nedarim_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nedarim_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletters: {
        Row: {
          cover_image_url: string | null
          created_at: string
          id: string
          is_published: boolean | null
          issue_number: number | null
          pdf_url: string | null
          publish_date: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          issue_number?: number | null
          pdf_url?: string | null
          publish_date?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          issue_number?: number | null
          pdf_url?: string | null
          publish_date?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          attributes: Json | null
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          product_sku: string | null
          quantity: number
          tenant_id: string
          total_ils: number
          unit_price_ils: number
        }
        Insert: {
          attributes?: Json | null
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          product_sku?: string | null
          quantity?: number
          tenant_id: string
          total_ils: number
          unit_price_ils: number
        }
        Update: {
          attributes?: Json | null
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_sku?: string | null
          quantity?: number
          tenant_id?: string
          total_ils?: number
          unit_price_ils?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          discount_ils: number
          id: string
          meta: Json | null
          notes: string | null
          order_number: string
          paid_at: string | null
          payment_meta: Json | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipped_at: string | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_ils: number
          shipping_notes: string | null
          shipping_tracking: string | null
          shipping_zip: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_ils: number
          tenant_id: string
          total_ils: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          delivered_at?: string | null
          discount_ils?: number
          id?: string
          meta?: Json | null
          notes?: string | null
          order_number?: string
          paid_at?: string | null
          payment_meta?: Json | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_ils?: number
          shipping_notes?: string | null
          shipping_tracking?: string | null
          shipping_zip?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_ils?: number
          tenant_id: string
          total_ils?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          delivered_at?: string | null
          discount_ils?: number
          id?: string
          meta?: Json | null
          notes?: string | null
          order_number?: string
          paid_at?: string | null
          payment_meta?: Json | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_ils?: number
          shipping_notes?: string | null
          shipping_tracking?: string | null
          shipping_zip?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_ils?: number
          tenant_id?: string
          total_ils?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          is_active: boolean
          lesson_id: string | null
          meta: Json
          notes: string | null
          phone: string | null
          tenant_id: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          lesson_id?: string | null
          meta?: Json
          notes?: string | null
          phone?: string | null
          tenant_id: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          lesson_id?: string | null
          meta?: Json
          notes?: string | null
          phone?: string | null
          tenant_id?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_messages: {
        Row: {
          body: string | null
          created_at: string
          from_email: string | null
          from_name: string | null
          from_phone: string | null
          id: string
          meta: Json | null
          status: string
          subject: string | null
          tenant_id: string
          to_user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          from_email?: string | null
          from_name?: string | null
          from_phone?: string | null
          id?: string
          meta?: Json | null
          status?: string
          subject?: string | null
          tenant_id: string
          to_user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          from_email?: string | null
          from_name?: string | null
          from_phone?: string | null
          id?: string
          meta?: Json | null
          status?: string
          subject?: string | null
          tenant_id?: string
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_times: {
        Row: {
          created_at: string
          day_of_week: number | null
          id: string
          is_holiday: boolean | null
          is_shabbat: boolean | null
          notes: string | null
          prayer_type: string
          synagogue_id: string | null
          tenant_id: string
          time_hhmm: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          id?: string
          is_holiday?: boolean | null
          is_shabbat?: boolean | null
          notes?: string | null
          prayer_type: string
          synagogue_id?: string | null
          tenant_id: string
          time_hhmm: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          id?: string
          is_holiday?: boolean | null
          is_shabbat?: boolean | null
          notes?: string | null
          prayer_type?: string
          synagogue_id?: string | null
          tenant_id?: string
          time_hhmm?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_times_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: false
            referencedRelation: "synagogues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_times_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_requests: {
        Row: {
          admin_note: string | null
          app_user_id: number
          created_at: string
          decided_at: string | null
          id: number
          message: string | null
          status: string
        }
        Insert: {
          admin_note?: string | null
          app_user_id: number
          created_at: string
          decided_at?: string | null
          id?: number
          message?: string | null
          status?: string
        }
        Update: {
          admin_note?: string | null
          app_user_id?: number
          created_at?: string
          decided_at?: string | null
          id?: number
          message?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_requests_app_user_id_fkey"
            columns: ["app_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          attributes: Json | null
          category_id: string | null
          compare_at_price_ils: number | null
          cost_ils: number | null
          created_at: string
          description: string | null
          digital_file_url: string | null
          id: string
          images: Json | null
          is_active: boolean | null
          is_digital: boolean | null
          is_featured: boolean | null
          meta: Json | null
          name: string
          price_ils: number
          short_description: string | null
          sku: string | null
          slug: string
          sort_order: number | null
          stock: number | null
          tenant_id: string
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          attributes?: Json | null
          category_id?: string | null
          compare_at_price_ils?: number | null
          cost_ils?: number | null
          created_at?: string
          description?: string | null
          digital_file_url?: string | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          is_digital?: boolean | null
          is_featured?: boolean | null
          meta?: Json | null
          name: string
          price_ils?: number
          short_description?: string | null
          sku?: string | null
          slug: string
          sort_order?: number | null
          stock?: number | null
          tenant_id: string
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          attributes?: Json | null
          category_id?: string | null
          compare_at_price_ils?: number | null
          cost_ils?: number | null
          created_at?: string
          description?: string | null
          digital_file_url?: string | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          is_digital?: boolean | null
          is_featured?: boolean | null
          meta?: Json | null
          name?: string
          price_ils?: number
          short_description?: string | null
          sku?: string | null
          slug?: string
          sort_order?: number | null
          stock?: number | null
          tenant_id?: string
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          birthday: string | null
          city: string | null
          created_at: string
          display_name: string | null
          full_name: string | null
          id: string
          language: string | null
          meta: Json
          neighborhood: string | null
          phone: string | null
          preferred_tenant_id: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id: string
          language?: string | null
          meta?: Json
          neighborhood?: string | null
          phone?: string | null
          preferred_tenant_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          language?: string | null
          meta?: Json
          neighborhood?: string | null
          phone?: string | null
          preferred_tenant_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_preferred_tenant_id_fkey"
            columns: ["preferred_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rabbi_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          category: string | null
          created_at: string
          from_email: string | null
          from_name: string | null
          from_phone: string | null
          id: string
          is_anonymous: boolean | null
          is_public: boolean | null
          question: string
          rabbi_user_id: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          category?: string | null
          created_at?: string
          from_email?: string | null
          from_name?: string | null
          from_phone?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_public?: boolean | null
          question: string
          rabbi_user_id?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          category?: string | null
          created_at?: string
          from_email?: string | null
          from_name?: string | null
          from_phone?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_public?: boolean | null
          question?: string
          rabbi_user_id?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rabbi_questions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_submissions: {
        Row: {
          additional_topics_json: string
          answers_json: string
          category: string
          client_id: number
          created_at: string
          details_json: string
          documents_json: string
          id: number
          potential_level: string
          potential_percent: number
          request_type: string
          right_id: number
          terms_accepted: number
          topic: string
          webhook_response: string | null
          webhook_sent_at: string | null
          webhook_status: string
        }
        Insert: {
          additional_topics_json: string
          answers_json: string
          category: string
          client_id: number
          created_at: string
          details_json: string
          documents_json: string
          id?: number
          potential_level: string
          potential_percent: number
          request_type?: string
          right_id: number
          terms_accepted: number
          topic: string
          webhook_response?: string | null
          webhook_sent_at?: string | null
          webhook_status?: string
        }
        Update: {
          additional_topics_json?: string
          answers_json?: string
          category?: string
          client_id?: number
          created_at?: string
          details_json?: string
          documents_json?: string
          id?: number
          potential_level?: string
          potential_percent?: number
          request_type?: string
          right_id?: number
          terms_accepted?: number
          topic?: string
          webhook_response?: string | null
          webhook_sent_at?: string | null
          webhook_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_submissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      study_daily: {
        Row: {
          color: string | null
          content: string
          created_at: string
          date: string
          hebrew_date: string | null
          id: string
          is_special: boolean | null
          notes: string | null
          schedule_id: string
          special_type: string | null
          tenant_id: string
        }
        Insert: {
          color?: string | null
          content: string
          created_at?: string
          date: string
          hebrew_date?: string | null
          id?: string
          is_special?: boolean | null
          notes?: string | null
          schedule_id: string
          special_type?: string | null
          tenant_id: string
        }
        Update: {
          color?: string | null
          content?: string
          created_at?: string
          date?: string
          hebrew_date?: string | null
          id?: string
          is_special?: boolean | null
          notes?: string | null
          schedule_id?: string
          special_type?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_daily_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "study_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_daily_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      study_schedules: {
        Row: {
          created_at: string
          daily_amount: string | null
          end_date: string | null
          id: string
          lesson_id: string | null
          meta: Json
          owner_user_id: string | null
          source_book: string | null
          source_external: string | null
          source_url: string | null
          start_date: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string
          daily_amount?: string | null
          end_date?: string | null
          id?: string
          lesson_id?: string | null
          meta?: Json
          owner_user_id?: string | null
          source_book?: string | null
          source_external?: string | null
          source_url?: string | null
          start_date?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string
          daily_amount?: string | null
          end_date?: string | null
          id?: string
          lesson_id?: string | null
          meta?: Json
          owner_user_id?: string | null
          source_book?: string | null
          source_external?: string | null
          source_url?: string | null
          start_date?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_schedules_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      synagogues: {
        Row: {
          address: string | null
          capacity: number | null
          city: string | null
          created_at: string
          description: string | null
          gabbai_email: string | null
          gabbai_name: string | null
          gabbai_phone: string | null
          has_kollel: boolean | null
          has_mikve: boolean | null
          id: string
          latitude: number | null
          longitude: number | null
          meta: Json
          name: string
          neighborhood: string | null
          nusach: string | null
          photo_url: string | null
          rabbi_name: string | null
          region: string | null
          social_links: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          city?: string | null
          created_at?: string
          description?: string | null
          gabbai_email?: string | null
          gabbai_name?: string | null
          gabbai_phone?: string | null
          has_kollel?: boolean | null
          has_mikve?: boolean | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          meta?: Json
          name: string
          neighborhood?: string | null
          nusach?: string | null
          photo_url?: string | null
          rabbi_name?: string | null
          region?: string | null
          social_links?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          capacity?: number | null
          city?: string | null
          created_at?: string
          description?: string | null
          gabbai_email?: string | null
          gabbai_name?: string | null
          gabbai_phone?: string | null
          has_kollel?: boolean | null
          has_mikve?: boolean | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          meta?: Json
          name?: string
          neighborhood?: string | null
          nusach?: string | null
          photo_url?: string | null
          rabbi_name?: string | null
          region?: string | null
          social_links?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "synagogues_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_branding: {
        Row: {
          accent_color: string
          animations_enabled: boolean
          background_color: string
          background_image_url: string | null
          background_style: string | null
          custom_css: string | null
          favicon_url: string | null
          font_body: string
          font_heading: string
          footer_text: string | null
          hero_image_url: string | null
          logo_url: string | null
          meta: Json
          primary_color: string
          secondary_color: string
          show_union_footer: boolean
          site_name: string | null
          site_tagline: string | null
          social_links: Json
          tenant_id: string
          text_color: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          animations_enabled?: boolean
          background_color?: string
          background_image_url?: string | null
          background_style?: string | null
          custom_css?: string | null
          favicon_url?: string | null
          font_body?: string
          font_heading?: string
          footer_text?: string | null
          hero_image_url?: string | null
          logo_url?: string | null
          meta?: Json
          primary_color?: string
          secondary_color?: string
          show_union_footer?: boolean
          site_name?: string | null
          site_tagline?: string | null
          social_links?: Json
          tenant_id: string
          text_color?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          animations_enabled?: boolean
          background_color?: string
          background_image_url?: string | null
          background_style?: string | null
          custom_css?: string | null
          favicon_url?: string | null
          font_body?: string
          font_heading?: string
          footer_text?: string | null
          hero_image_url?: string | null
          logo_url?: string | null
          meta?: Json
          primary_color?: string
          secondary_color?: string
          show_union_footer?: boolean
          site_name?: string | null
          site_tagline?: string | null
          social_links?: Json
          tenant_id?: string
          text_color?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_branding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_features: {
        Row: {
          ad_banners: boolean
          ai_matching: boolean
          ask_rabbi: boolean
          bulk_lesson_upload: boolean
          community_services: boolean
          custom_features: Json
          dedications: boolean
          donations: boolean
          email_integration: boolean
          forums: boolean
          halacha_daily: boolean
          ivr_builder: boolean
          kashrut: boolean
          leads_inbox: boolean
          lesson_directory: boolean
          lessons: boolean
          matching_available: boolean
          materials_upload: boolean
          member_portal: boolean
          mikvaot: boolean
          mourning_guide: boolean
          newsletter: boolean
          participants: boolean
          png_export: boolean
          prayer_times: boolean
          public_site: boolean
          questionnaires: boolean
          recurring_donations: boolean
          shop: boolean
          study_schedule: boolean
          tenant_id: string
          updated_at: string
          whatsapp_integration: boolean
          yemot_integration: boolean
          zmanim: boolean
        }
        Insert: {
          ad_banners?: boolean
          ai_matching?: boolean
          ask_rabbi?: boolean
          bulk_lesson_upload?: boolean
          community_services?: boolean
          custom_features?: Json
          dedications?: boolean
          donations?: boolean
          email_integration?: boolean
          forums?: boolean
          halacha_daily?: boolean
          ivr_builder?: boolean
          kashrut?: boolean
          leads_inbox?: boolean
          lesson_directory?: boolean
          lessons?: boolean
          matching_available?: boolean
          materials_upload?: boolean
          member_portal?: boolean
          mikvaot?: boolean
          mourning_guide?: boolean
          newsletter?: boolean
          participants?: boolean
          png_export?: boolean
          prayer_times?: boolean
          public_site?: boolean
          questionnaires?: boolean
          recurring_donations?: boolean
          shop?: boolean
          study_schedule?: boolean
          tenant_id: string
          updated_at?: string
          whatsapp_integration?: boolean
          yemot_integration?: boolean
          zmanim?: boolean
        }
        Update: {
          ad_banners?: boolean
          ai_matching?: boolean
          ask_rabbi?: boolean
          bulk_lesson_upload?: boolean
          community_services?: boolean
          custom_features?: Json
          dedications?: boolean
          donations?: boolean
          email_integration?: boolean
          forums?: boolean
          halacha_daily?: boolean
          ivr_builder?: boolean
          kashrut?: boolean
          leads_inbox?: boolean
          lesson_directory?: boolean
          lessons?: boolean
          matching_available?: boolean
          materials_upload?: boolean
          member_portal?: boolean
          mikvaot?: boolean
          mourning_guide?: boolean
          newsletter?: boolean
          participants?: boolean
          png_export?: boolean
          prayer_times?: boolean
          public_site?: boolean
          questionnaires?: boolean
          recurring_donations?: boolean
          shop?: boolean
          study_schedule?: boolean
          tenant_id?: string
          updated_at?: string
          whatsapp_integration?: boolean
          yemot_integration?: boolean
          zmanim?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tenant_features_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invites: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          full_name: string | null
          id: string
          initial_password: string
          invite_code: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          full_name?: string | null
          id?: string
          initial_password: string
          invite_code?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          initial_password?: string
          invite_code?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          notes: string | null
          payment_method: string | null
          plan: string
          starts_at: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          payment_method?: string | null
          plan?: string
          starts_at?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          payment_method?: string | null
          plan?: string
          starts_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          activated_at: string | null
          address: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          created_at: string
          custom_domain: string | null
          description: string | null
          display_name: string | null
          id: string
          meta: Json
          name: string
          parent_tenant_id: string | null
          region: string | null
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          type: Database["public"]["Enums"]["tenant_type"]
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          display_name?: string | null
          id?: string
          meta?: Json
          name: string
          parent_tenant_id?: string | null
          region?: string | null
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          type: Database["public"]["Enums"]["tenant_type"]
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          display_name?: string | null
          id?: string
          meta?: Json
          name?: string
          parent_tenant_id?: string | null
          region?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          type?: Database["public"]["Enums"]["tenant_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_parent_tenant_id_fkey"
            columns: ["parent_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tips: {
        Row: {
          body: string
          category: string | null
          created_at: string
          id: string
          is_active: boolean | null
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          permissions: Json
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permissions?: Json
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permissions?: Json
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          app_user_id: number
          created_at: string
          expires_at: string
          id: number
          token: string
        }
        Insert: {
          app_user_id: number
          created_at: string
          expires_at: string
          id?: number
          token: string
        }
        Update: {
          app_user_id?: number
          created_at?: string
          expires_at?: string
          id?: number
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_app_user_id_fkey"
            columns: ["app_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          id: number
          password: string
          username: string
        }
        Insert: {
          id?: number
          password: string
          username: string
        }
        Update: {
          id?: number
          password?: string
          username?: string
        }
        Relationships: []
      }
      webhook_log: {
        Row: {
          attempts: number
          created_at: string
          endpoint_url: string
          http_status: number | null
          id: number
          last_attempt_at: string | null
          next_retry_at: string | null
          payload_json: string
          related_id: number | null
          related_kind: string | null
          response_text: string | null
          source: string
          status: string
        }
        Insert: {
          attempts?: number
          created_at: string
          endpoint_url: string
          http_status?: number | null
          id?: number
          last_attempt_at?: string | null
          next_retry_at?: string | null
          payload_json: string
          related_id?: number | null
          related_kind?: string | null
          response_text?: string | null
          source: string
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          endpoint_url?: string
          http_status?: number | null
          id?: number
          last_attempt_at?: string | null
          next_retry_at?: string | null
          payload_json?: string
          related_id?: number | null
          related_kind?: string | null
          response_text?: string | null
          source?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      service_submission_rows: {
        Row: {
          additionalTopicsJson: string | null
          answersJson: string | null
          birthDate: string | null
          category: string | null
          city: string | null
          clientId: number | null
          createdAt: string | null
          detailsJson: string | null
          documentsJson: string | null
          email: string | null
          familyStatus: string | null
          fullName: string | null
          id: number | null
          idNumber: string | null
          phone: string | null
          potentialLevel: string | null
          potentialPercent: number | null
          requestType: string | null
          rightId: number | null
          topic: string | null
          webhookResponse: string | null
          webhookSentAt: string | null
          webhookStatus: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_submissions_client_id_fkey"
            columns: ["clientId"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_tenant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _uid: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _uid: string }; Returns: boolean }
      user_in_tenant: { Args: { _tenant_id: string }; Returns: boolean }
      user_tenants: { Args: { _uid: string }; Returns: string[] }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "tenant_admin"
        | "moderator"
        | "member"
        | "viewer"
      order_status:
        | "pending"
        | "awaiting_payment"
        | "paid"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      payment_status:
        | "pending"
        | "authorized"
        | "captured"
        | "failed"
        | "refunded"
        | "cancelled"
      tenant_status: "pending" | "active" | "suspended" | "archived"
      tenant_type:
        | "super_admin"
        | "religious_council"
        | "organization"
        | "synagogue"
        | "maggid"
        | "rabbi"
        | "mori_horaah"
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
      app_role: [
        "super_admin",
        "tenant_admin",
        "moderator",
        "member",
        "viewer",
      ],
      order_status: [
        "pending",
        "awaiting_payment",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      payment_status: [
        "pending",
        "authorized",
        "captured",
        "failed",
        "refunded",
        "cancelled",
      ],
      tenant_status: ["pending", "active", "suspended", "archived"],
      tenant_type: [
        "super_admin",
        "religious_council",
        "organization",
        "synagogue",
        "maggid",
        "rabbi",
        "mori_horaah",
      ],
    },
  },
} as const
