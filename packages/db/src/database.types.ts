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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      approval_requests: {
        Row: {
          approval_reason: string | null
          approved_by: string | null
          created_at: string
          details: Json | null
          id: string
          request_type: string
          requested_by: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approval_reason?: string | null
          approved_by?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          request_type: string
          requested_by: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approval_reason?: string | null
          approved_by?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          request_type?: string
          requested_by?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          resource_id: string | null
          resource_name: string | null
          resource_type: string
          tenant_id: string
          user_email: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_name?: string | null
          resource_type: string
          tenant_id: string
          user_email: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string
          tenant_id?: string
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cal_bookings: {
        Row: {
          attendee_email: string | null
          attendee_name: string | null
          attendee_phone: string | null
          cal_booking_uid: string
          cal_event_type_id: number | null
          contact_id: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          needs_contact_link: boolean
          raw: Json | null
          starts_at: string | null
          status: string
          tenant_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          attendee_email?: string | null
          attendee_name?: string | null
          attendee_phone?: string | null
          cal_booking_uid: string
          cal_event_type_id?: number | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          needs_contact_link?: boolean
          raw?: Json | null
          starts_at?: string | null
          status?: string
          tenant_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          attendee_email?: string | null
          attendee_name?: string | null
          attendee_phone?: string | null
          cal_booking_uid?: string
          cal_event_type_id?: number | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          needs_contact_link?: boolean
          raw?: Json | null
          starts_at?: string | null
          status?: string
          tenant_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cal_bookings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cal_bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          caller_phone: string
          contact_id: string | null
          created_at: string
          id: string
          occurred_at: string
          provider_call_sid: string | null
          sms_error: string | null
          sms_sent: boolean
          tenant_id: string
        }
        Insert: {
          caller_phone: string
          contact_id?: string | null
          created_at?: string
          id?: string
          occurred_at?: string
          provider_call_sid?: string | null
          sms_error?: string | null
          sms_sent?: boolean
          tenant_id: string
        }
        Update: {
          caller_phone?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          occurred_at?: string
          provider_call_sid?: string | null
          sms_error?: string | null
          sms_sent?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_items: {
        Row: {
          base_price: number
          billing_unit: Database["public"]["Enums"]["billing_unit"]
          created_at: string
          deposit_amount: number | null
          description: string | null
          id: string
          is_active: boolean
          item_type: Database["public"]["Enums"]["item_type"]
          name: string
          requires_deposit: boolean
          taxable: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          billing_unit?: Database["public"]["Enums"]["billing_unit"]
          created_at?: string
          deposit_amount?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          item_type: Database["public"]["Enums"]["item_type"]
          name: string
          requires_deposit?: boolean
          taxable?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          billing_unit?: Database["public"]["Enums"]["billing_unit"]
          created_at?: string
          deposit_amount?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          item_type?: Database["public"]["Enums"]["item_type"]
          name?: string
          requires_deposit?: boolean
          taxable?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          company: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string | null
          notes: string | null
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["contact_status"]
          tags: string[] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          tags?: string[] | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_automation_overrides: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          send_invoice_reminders: boolean
          send_review_requests: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          send_invoice_reminders?: boolean
          send_review_requests?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          send_invoice_reminders?: boolean
          send_review_requests?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_automation_overrides_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_automation_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_pricing: {
        Row: {
          base_price_tier: string
          created_at: string
          created_by: string
          effective_from: string
          effective_to: string | null
          id: string
          notes: string | null
          override_monthly_amount: number | null
          override_one_time_amount: number | null
          reason: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          base_price_tier?: string
          created_at?: string
          created_by: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          override_monthly_amount?: number | null
          override_one_time_amount?: number | null
          reason?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          base_price_tier?: string
          created_at?: string
          created_by?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          override_monthly_amount?: number | null
          override_one_time_amount?: number | null
          reason?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_pricing_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          contact_id: string | null
          created_at: string
          description: string | null
          ends_at: string
          id: string
          starts_at: string
          tenant_id: string
          title: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          description?: string | null
          ends_at: string
          id?: string
          starts_at: string
          tenant_id: string
          title: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string
          id?: string
          starts_at?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          deleted_at: string | null
          id: string
          note: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date: string
          deleted_at?: string | null
          id?: string
          note?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          deleted_at?: string | null
          id?: string
          note?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          subject: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          subject: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          subject?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_events: {
        Row: {
          all_day: boolean
          description: string | null
          ends_at: string | null
          fetched_at: string
          gcal_id: string
          id: string
          starts_at: string | null
          status: string | null
          tenant_id: string
          title: string | null
        }
        Insert: {
          all_day?: boolean
          description?: string | null
          ends_at?: string | null
          fetched_at?: string
          gcal_id: string
          id?: string
          starts_at?: string | null
          status?: string | null
          tenant_id: string
          title?: string | null
        }
        Update: {
          all_day?: boolean
          description?: string | null
          ends_at?: string | null
          fetched_at?: string
          gcal_id?: string
          id?: string
          starts_at?: string | null
          status?: string | null
          tenant_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_logs: {
        Row: {
          ended_at: string | null
          id: string
          reason: string | null
          started_at: string
          super_admin_id: string
          tenant_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          reason?: string | null
          started_at?: string
          super_admin_id: string
          tenant_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          reason?: string | null
          started_at?: string
          super_admin_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          created_at: string
          customers_notified: boolean
          description: string | null
          detected_at: string
          detected_by: string
          id: string
          incident_type: string
          notification_sent_at: string | null
          remediation: string | null
          root_cause: string | null
          root_cause_summary: string | null
          severity: string
          status: string
          summary_sent_at: string | null
          tenant_id: string | null
          timeline: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          customers_notified?: boolean
          description?: string | null
          detected_at?: string
          detected_by?: string
          id?: string
          incident_type: string
          notification_sent_at?: string | null
          remediation?: string | null
          root_cause?: string | null
          root_cause_summary?: string | null
          severity?: string
          status?: string
          summary_sent_at?: string | null
          tenant_id?: string | null
          timeline?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          customers_notified?: boolean
          description?: string | null
          detected_at?: string
          detected_by?: string
          id?: string
          incident_type?: string
          notification_sent_at?: string | null
          remediation?: string | null
          root_cause?: string | null
          root_cause_summary?: string | null
          severity?: string
          status?: string
          summary_sent_at?: string | null
          tenant_id?: string | null
          timeline?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          body: string
          contact_id: string
          created_at: string
          id: string
          occurred_at: string
          tenant_id: string
          type: Database["public"]["Enums"]["interaction_type"]
        }
        Insert: {
          body: string
          contact_id: string
          created_at?: string
          id?: string
          occurred_at?: string
          tenant_id: string
          type: Database["public"]["Enums"]["interaction_type"]
        }
        Update: {
          body?: string
          contact_id?: string
          created_at?: string
          id?: string
          occurred_at?: string
          tenant_id?: string
          type?: Database["public"]["Enums"]["interaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          tenant_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          tenant_id: string
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          tenant_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_escalations: {
        Row: {
          created_at: string
          id: string
          payment_request_id: string
          sent_at: string
          stage: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_request_id: string
          sent_at?: string
          stage: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_request_id?: string
          sent_at?: string
          stage?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_escalations_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_escalations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          description: string | null
          helcim_checkout_token: string | null
          helcim_secret_token: string | null
          helcim_transaction_id: string | null
          id: string
          invoice_number: string
          invoice_type: string
          paid_at: string | null
          sent_at: string | null
          sent_to_email: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          description?: string | null
          helcim_checkout_token?: string | null
          helcim_secret_token?: string | null
          helcim_transaction_id?: string | null
          id?: string
          invoice_number?: string
          invoice_type?: string
          paid_at?: string | null
          sent_at?: string | null
          sent_to_email?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          description?: string | null
          helcim_checkout_token?: string | null
          helcim_secret_token?: string | null
          helcim_transaction_id?: string | null
          id?: string
          invoice_number?: string
          invoice_type?: string
          paid_at?: string | null
          sent_at?: string | null
          sent_to_email?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_photos: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          label: string | null
          order_id: string
          storage_path: string
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          label?: string | null
          order_id: string
          storage_path: string
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          label?: string | null
          order_id?: string
          storage_path?: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_photos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_photos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_pages: {
        Row: {
          content: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_line_items: {
        Row: {
          actual_return_date: string | null
          billing_unit_snapshot: Database["public"]["Enums"]["billing_unit"]
          catalog_item_id: string | null
          created_at: string
          description_snapshot: string | null
          id: string
          item_name_snapshot: string
          order_id: string
          quantity: number
          rental_end_date: string | null
          rental_start_date: string | null
          rental_status: Database["public"]["Enums"]["rental_status"] | null
          tenant_id: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          actual_return_date?: string | null
          billing_unit_snapshot?: Database["public"]["Enums"]["billing_unit"]
          catalog_item_id?: string | null
          created_at?: string
          description_snapshot?: string | null
          id?: string
          item_name_snapshot: string
          order_id: string
          quantity?: number
          rental_end_date?: string | null
          rental_start_date?: string | null
          rental_status?: Database["public"]["Enums"]["rental_status"] | null
          tenant_id: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          actual_return_date?: string | null
          billing_unit_snapshot?: Database["public"]["Enums"]["billing_unit"]
          catalog_item_id?: string | null
          created_at?: string
          description_snapshot?: string | null
          id?: string
          item_name_snapshot?: string
          order_id?: string
          quantity?: number
          rental_end_date?: string | null
          rental_start_date?: string | null
          rental_status?: Database["public"]["Enums"]["rental_status"] | null
          tenant_id?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_catalog_item_tenant"
            columns: ["catalog_item_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "fk_order_tenant"
            columns: ["order_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "order_line_items_tenant_id_fkey"
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
          customer_id: string | null
          helcim_transaction_id: string | null
          id: string
          job_status: Database["public"]["Enums"]["job_status"] | null
          notes: string | null
          paid_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          signed_at: string | null
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          helcim_transaction_id?: string | null
          id?: string
          job_status?: Database["public"]["Enums"]["job_status"] | null
          notes?: string | null
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          signed_at?: string | null
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          helcim_transaction_id?: string | null
          id?: string
          job_status?: Database["public"]["Enums"]["job_status"] | null
          notes?: string | null
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          signed_at?: string | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_requests: {
        Row: {
          amount: number
          contact_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          order_id: string
          paid_at: string | null
          sent_via: string | null
          status: string
          tenant_id: string
          token: string
        }
        Insert: {
          amount: number
          contact_id: string
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          order_id: string
          paid_at?: string | null
          sent_via?: string | null
          status?: string
          tenant_id: string
          token?: string
        }
        Update: {
          amount?: number
          contact_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          order_id?: string
          paid_at?: string | null
          sent_via?: string | null
          status?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_deals: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          notes: string | null
          position: number
          stage_id: string
          tenant_id: string
          title: string
          updated_at: string
          value: number | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          position?: number
          stage_id: string
          tenant_id: string
          title: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          position?: number
          stage_id?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          position: number
          tenant_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          position?: number
          tenant_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_modules: {
        Row: {
          color: string
          created_at: string
          description: string
          icon_key: string
          is_available: boolean
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          description: string
          icon_key: string
          is_available?: boolean
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          icon_key?: string
          is_available?: boolean
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      portal_magic_links: {
        Row: {
          contact_id: string
          created_at: string
          expires_at: string
          id: string
          tenant_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          expires_at: string
          id?: string
          tenant_id: string
          token: string
          used_at?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          tenant_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_magic_links_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_magic_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_sessions: {
        Row: {
          access_token: string
          contact_id: string
          created_at: string
          expires_at: string
          id: string
          tenant_id: string
        }
        Insert: {
          access_token: string
          contact_id: string
          created_at?: string
          expires_at: string
          id?: string
          tenant_id: string
        }
        Update: {
          access_token?: string
          contact_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_signatures: {
        Row: {
          access_token: string
          id: string
          ip_address: string | null
          order_id: string
          signature_data: string
          signature_type: string
          signed_at: string
          signed_by_name: string
          tenant_id: string
          token_expires_at: string
        }
        Insert: {
          access_token: string
          id?: string
          ip_address?: string | null
          order_id: string
          signature_data: string
          signature_type?: string
          signed_at?: string
          signed_by_name: string
          tenant_id: string
          token_expires_at: string
        }
        Update: {
          access_token?: string
          id?: string
          ip_address?: string | null
          order_id?: string
          signature_data?: string
          signature_type?: string
          signed_at?: string
          signed_by_name?: string
          tenant_id?: string
          token_expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_signatures_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_signatures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_tokens: {
        Row: {
          access_token: string
          created_at: string
          id: string
          order_id: string
          tenant_id: string
          token_expires_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          order_id: string
          tenant_id: string
          token_expires_at: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          order_id?: string
          tenant_id?: string
          token_expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_tokens_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_log: {
        Row: {
          endpoint: string
          hit_at: string
          id: number
          ip: string
        }
        Insert: {
          endpoint: string
          hit_at?: string
          id?: number
          ip: string
        }
        Update: {
          endpoint?: string
          hit_at?: string
          id?: number
          ip?: string
        }
        Relationships: []
      }
      rental_extensions: {
        Row: {
          extended_at: string
          extended_by: string | null
          id: string
          new_end_date: string
          order_line_item_id: string
          previous_end_date: string
          tenant_id: string
        }
        Insert: {
          extended_at?: string
          extended_by?: string | null
          id?: string
          new_end_date: string
          order_line_item_id: string
          previous_end_date: string
          tenant_id: string
        }
        Update: {
          extended_at?: string
          extended_by?: string | null
          id?: string
          new_end_date?: string
          order_line_item_id?: string
          previous_end_date?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_extensions_order_line_item_id_fkey"
            columns: ["order_line_item_id"]
            isOneToOne: false
            referencedRelation: "order_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_extensions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      review_requests: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          order_id: string
          sent_at: string
          stage: string
          tenant_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          order_id: string
          sent_at?: string
          stage: string
          tenant_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          order_id?: string
          sent_at?: string
          stage?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_requests_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      send_log: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["send_channel"]
          contact_id: string | null
          created_at: string
          error: string | null
          id: string
          provider_id: string | null
          recipient: string
          sent_at: string | null
          status: Database["public"]["Enums"]["send_status"]
          subject: string | null
          template_id: string | null
          tenant_id: string
        }
        Insert: {
          body: string
          channel: Database["public"]["Enums"]["send_channel"]
          contact_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          provider_id?: string | null
          recipient: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["send_status"]
          subject?: string | null
          template_id?: string | null
          tenant_id: string
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["send_channel"]
          contact_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          provider_id?: string | null
          recipient?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["send_status"]
          subject?: string | null
          template_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "send_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "send_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "send_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_checklist: {
        Row: {
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          id: string
          month: string
          service_name: string
          tenant_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          month: string
          service_name: string
          tenant_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          month?: string
          service_name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_checklist_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          body: string
          category: string
          channel: Database["public"]["Enums"]["template_channel"]
          created_at: string
          deleted_at: string | null
          id: string
          is_marketing: boolean
          name: string
          subject: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          body: string
          category?: string
          channel: Database["public"]["Enums"]["template_channel"]
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_marketing?: boolean
          name: string
          subject?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          channel?: Database["public"]["Enums"]["template_channel"]
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_marketing?: boolean
          name?: string
          subject?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_integrations: {
        Row: {
          access_token_enc: string | null
          cal_user_id: string | null
          cal_username: string | null
          created_at: string
          id: string
          provider: string
          refresh_token_enc: string | null
          tenant_id: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_enc?: string | null
          cal_user_id?: string | null
          cal_username?: string | null
          created_at?: string
          id?: string
          provider: string
          refresh_token_enc?: string | null
          tenant_id: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_enc?: string | null
          cal_user_id?: string | null
          cal_username?: string | null
          created_at?: string
          id?: string
          provider?: string
          refresh_token_enc?: string | null
          tenant_id?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_module_access: {
        Row: {
          enabled: boolean
          module_key: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          module_key: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          module_key?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_module_access_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_payment_accounts: {
        Row: {
          access_token_enc: string | null
          account_email: string | null
          account_holder_name: string | null
          api_key_enc: string | null
          connected_at: string | null
          created_at: string
          id: string
          is_connected: boolean
          last_verified_at: string | null
          provider: string
          provider_account_id: string | null
          refresh_token_enc: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          access_token_enc?: string | null
          account_email?: string | null
          account_holder_name?: string | null
          api_key_enc?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          last_verified_at?: string | null
          provider: string
          provider_account_id?: string | null
          refresh_token_enc?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          access_token_enc?: string | null
          account_email?: string | null
          account_holder_name?: string | null
          api_key_enc?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          last_verified_at?: string | null
          provider?: string
          provider_account_id?: string | null
          refresh_token_enc?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_payment_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          deleted_at: string | null
          deletion_reason: string | null
          deletion_requested_at: string | null
          deletion_scheduled_at: string | null
          id: string
          is_admin: boolean
          name: string
          plan: string
          settings: Json
          slug: string
          status: string
          telnyx_number: string | null
          twilio_number: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deletion_reason?: string | null
          deletion_requested_at?: string | null
          deletion_scheduled_at?: string | null
          id?: string
          is_admin?: boolean
          name: string
          plan?: string
          settings?: Json
          slug: string
          status?: string
          telnyx_number?: string | null
          twilio_number?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deletion_reason?: string | null
          deletion_requested_at?: string | null
          deletion_scheduled_at?: string | null
          id?: string
          is_admin?: boolean
          name?: string
          plan?: string
          settings?: Json
          slug?: string
          status?: string
          telnyx_number?: string | null
          twilio_number?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          has_seen_welcome: boolean
          id: string
          legal_name: string | null
          nickname: string | null
          phone: string | null
          state: string | null
          street: string | null
          tenant_id: string
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          has_seen_welcome?: boolean
          id: string
          legal_name?: string | null
          nickname?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          tenant_id: string
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          has_seen_welcome?: boolean
          id?: string
          legal_name?: string | null
          nickname?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          tenant_id?: string
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_settings: {
        Row: {
          created_at: string
          google_review_url: string | null
          id: string
          invoice_escalate_days: number
          invoice_escalate_enabled: boolean
          invoice_reminder_days: number
          invoice_reminder_enabled: boolean
          review_reminder_days: number
          review_reminder_enabled: boolean
          review_request_days: number
          review_request_enabled: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          google_review_url?: string | null
          id?: string
          invoice_escalate_days?: number
          invoice_escalate_enabled?: boolean
          invoice_reminder_days?: number
          invoice_reminder_enabled?: boolean
          review_reminder_days?: number
          review_reminder_enabled?: boolean
          review_request_days?: number
          review_request_enabled?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          google_review_url?: string | null
          id?: string
          invoice_escalate_days?: number
          invoice_escalate_enabled?: boolean
          invoice_reminder_days?: number
          invoice_reminder_enabled?: boolean
          review_reminder_days?: number
          review_reminder_enabled?: boolean
          review_request_days?: number
          review_request_enabled?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_tenant_id: { Args: never; Returns: string }
      is_super_admin: { Args: never; Returns: boolean }
      purge_old_audit_logs: { Args: never; Returns: undefined }
      purge_stale_draft_invoices: { Args: never; Returns: undefined }
      seed_pipeline_stages: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      seed_starter_templates: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      tenant_id: { Args: never; Returns: string }
      user_role: { Args: never; Returns: string }
    }
    Enums: {
      billing_unit: "flat" | "hourly" | "daily" | "weekly" | "monthly"
      contact_status: "active" | "inactive" | "lead"
      interaction_type: "call" | "email" | "visit" | "note"
      item_type: "good" | "service" | "rental"
      job_status: "en_route" | "in_progress" | "completed"
      payment_status: "draft" | "pending" | "paid" | "refunded"
      rental_status: "reserved" | "active" | "returned" | "overdue"
      send_channel: "email" | "sms"
      send_status: "queued" | "sent" | "failed"
      template_channel: "sms" | "email"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      billing_unit: ["flat", "hourly", "daily", "weekly", "monthly"],
      contact_status: ["active", "inactive", "lead"],
      interaction_type: ["call", "email", "visit", "note"],
      item_type: ["good", "service", "rental"],
      job_status: ["en_route", "in_progress", "completed"],
      payment_status: ["draft", "pending", "paid", "refunded"],
      rental_status: ["reserved", "active", "returned", "overdue"],
      send_channel: ["email", "sms"],
      send_status: ["queued", "sent", "failed"],
      template_channel: ["sms", "email"],
    },
  },
} as const
