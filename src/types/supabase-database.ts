export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          preferred_currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          preferred_currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          preferred_currency?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          company_name: string | null;
          room_number: string | null;
          company_type: string | null;
          description: string | null;
          logo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string;
          company_name?: string | null;
          room_number?: string | null;
          company_type?: string | null;
          description?: string | null;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          company_name?: string | null;
          room_number?: string | null;
          company_type?: string | null;
          description?: string | null;
          logo_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      bank_accounts: {
        Row: {
          id: string;
          user_id: string;
          row_id: string;
          account_kind: "liquid" | "fd";
          payload: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          row_id: string;
          account_kind: "liquid" | "fd";
          payload?: Json;
          updated_at?: string;
        };
        Update: {
          payload?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      investments: {
        Row: { id: string; user_id: string; row_id: string; payload: Json; updated_at: string };
        Insert: { id?: string; user_id: string; row_id: string; payload?: Json; updated_at?: string };
        Update: { payload?: Json; updated_at?: string };
        Relationships: [];
      };
      gold_assets: {
        Row: { id: string; user_id: string; row_id: string; payload: Json; updated_at: string };
        Insert: { id?: string; user_id: string; row_id: string; payload?: Json; updated_at?: string };
        Update: { payload?: Json; updated_at?: string };
        Relationships: [];
      };
      real_estate: {
        Row: { id: string; user_id: string; row_id: string; payload: Json; updated_at: string };
        Insert: { id?: string; user_id: string; row_id: string; payload?: Json; updated_at?: string };
        Update: { payload?: Json; updated_at?: string };
        Relationships: [];
      };
      vehicles: {
        Row: { id: string; user_id: string; row_id: string; payload: Json; updated_at: string };
        Insert: { id?: string; user_id: string; row_id: string; payload?: Json; updated_at?: string };
        Update: { payload?: Json; updated_at?: string };
        Relationships: [];
      };
      liabilities: {
        Row: { id: string; user_id: string; row_id: string; payload: Json; updated_at: string };
        Insert: { id?: string; user_id: string; row_id: string; payload?: Json; updated_at?: string };
        Update: { payload?: Json; updated_at?: string };
        Relationships: [];
      };
      retirement_assets: {
        Row: { id: string; user_id: string; row_id: string; payload: Json; updated_at: string };
        Insert: { id?: string; user_id: string; row_id: string; payload?: Json; updated_at?: string };
        Update: { payload?: Json; updated_at?: string };
        Relationships: [];
      };
      fire_goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          target_amount_npr: number | null;
          target_age: number | null;
          target_month: string | null;
          notes: string | null;
          payload: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          target_amount_npr?: number | null;
          target_age?: number | null;
          target_month?: string | null;
          notes?: string | null;
          payload?: Json;
          updated_at?: string;
        };
        Update: {
          title?: string;
          target_amount_npr?: number | null;
          target_age?: number | null;
          target_month?: string | null;
          notes?: string | null;
          payload?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      portfolio_extensions: {
        Row: {
          user_id: string;
          ledger: Json;
          net_worth_history: Json;
          metal_purchase_bill_urls: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          ledger?: Json;
          net_worth_history?: Json;
          metal_purchase_bill_urls?: Json;
          updated_at?: string;
        };
        Update: {
          ledger?: Json;
          net_worth_history?: Json;
          metal_purchase_bill_urls?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      nepse_watchlist: {
        Row: {
          user_id: string;
          symbols: string[];
          updated_at: string;
        };
        Insert: {
          user_id: string;
          symbols?: string[];
          updated_at?: string;
        };
        Update: {
          symbols?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      scheduled_reminders: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          amount: number | null;
          due_date: string;
          due_time: string;
          timezone: string;
          email: string;
          repeat_frequency: string;
          notify_7d: boolean;
          notify_3d: boolean;
          notify_1d: boolean;
          notify_at_due: boolean;
          notify_overdue: boolean;
          reminder_type: string;
          notes: string | null;
          shared_with_family: boolean;
          is_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          amount?: number | null;
          due_date: string;
          due_time?: string;
          timezone?: string;
          email: string;
          repeat_frequency?: string;
          notify_7d?: boolean;
          notify_3d?: boolean;
          notify_1d?: boolean;
          notify_at_due?: boolean;
          notify_overdue?: boolean;
          reminder_type?: string;
          notes?: string | null;
          shared_with_family?: boolean;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          amount?: number | null;
          due_date?: string;
          due_time?: string;
          timezone?: string;
          email?: string;
          repeat_frequency?: string;
          notify_7d?: boolean;
          notify_3d?: boolean;
          notify_1d?: boolean;
          notify_at_due?: boolean;
          notify_overdue?: boolean;
          reminder_type?: string;
          notes?: string | null;
          shared_with_family?: boolean;
          is_completed?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      scheduled_reminder_email_sends: {
        Row: {
          id: string;
          reminder_id: string;
          slot: string;
          anchor_due_date: string;
          overdue_local_date: string | null;
          sent_at: string;
        };
        Insert: {
          id?: string;
          reminder_id: string;
          slot: string;
          anchor_due_date: string;
          overdue_local_date?: string | null;
          sent_at?: string;
        };
        Update: {
          slot?: string;
          anchor_due_date?: string;
          overdue_local_date?: string | null;
          sent_at?: string;
        };
        Relationships: [];
      };
      admin_member_notes: {
        Row: {
          id: string;
          user_id: string;
          body: string;
          author_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          body: string;
          author_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          author_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_member_crm_events: {
        Row: {
          id: string;
          user_id: string;
          event_type:
            | "membership_renewed"
            | "user_suspended"
            | "user_reactivated"
            | "user_archived"
            | "user_restored"
            | "user_permanently_removed";
          title: string;
          body: string | null;
          meta: Json;
          occurred_at: string;
          actor_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type:
            | "membership_renewed"
            | "user_suspended"
            | "user_reactivated"
            | "user_archived"
            | "user_restored"
            | "user_permanently_removed";
          title: string;
          body?: string | null;
          meta?: Json;
          occurred_at?: string;
          actor_id?: string | null;
        };
        Update: {
          title?: string;
          body?: string | null;
          meta?: Json;
          occurred_at?: string;
          actor_id?: string | null;
        };
        Relationships: [];
      };
      membership_requests: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          plan_type: "premium" | "elite";
          payment_method: "khalti_qr" | "esewa_qr" | "global_ime_qr";
          amount_npr: number;
          proof_url: string;
          reference: string | null;
          created_at: string;
          status: "pending" | "approved" | "rejected";
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          plan_type: "premium" | "elite";
          payment_method: "khalti_qr" | "esewa_qr" | "global_ime_qr";
          amount_npr: number;
          proof_url: string;
          reference?: string | null;
          created_at?: string;
          status?: "pending" | "approved" | "rejected";
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Update: {
          email?: string;
          plan_type?: "premium" | "elite";
          payment_method?: "khalti_qr" | "esewa_qr" | "global_ime_qr";
          amount_npr?: number;
          proof_url?: string;
          reference?: string | null;
          created_at?: string;
          status?: "pending" | "approved" | "rejected";
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Relationships: [];
      };
      membership_reminder_emails: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          reminder_type: string;
          sent_at: string;
          delivery_status: "sent" | "failed" | "skipped";
          membership_plan: "premium" | "elite";
          expires_at: string;
          subject: string | null;
          provider_message: string | null;
          resend_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          reminder_type: string;
          sent_at?: string;
          delivery_status: "sent" | "failed" | "skipped";
          membership_plan: "premium" | "elite";
          expires_at: string;
          subject?: string | null;
          provider_message?: string | null;
          resend_id?: string | null;
          created_at?: string;
        };
        Update: {
          email?: string;
          reminder_type?: string;
          sent_at?: string;
          delivery_status?: "sent" | "failed" | "skipped";
          membership_plan?: "premium" | "elite";
          expires_at?: string;
          subject?: string | null;
          provider_message?: string | null;
          resend_id?: string | null;
        };
        Relationships: [];
      };
      membership_reminder_queue: {
        Row: {
          id: string;
          user_id: string;
          reminder_type: string;
          membership_expires_at: string;
          scheduled_for: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reminder_type: string;
          membership_expires_at: string;
          scheduled_for: string;
          created_at?: string;
        };
        Update: {
          reminder_type?: string;
          membership_expires_at?: string;
          scheduled_for?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          plan_type: "free" | "premium" | "elite";
          last_active_at: string | null;
          membership_activated_at: string | null;
          expires_at: string | null;
          suspended_at: string | null;
          archived_at: string | null;
          last_login_at: string | null;
          country: string | null;
          region: string | null;
          timezone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          plan_type?: "free" | "premium" | "elite";
          last_active_at?: string | null;
          membership_activated_at?: string | null;
          expires_at?: string | null;
          suspended_at?: string | null;
          archived_at?: string | null;
          last_login_at?: string | null;
          country?: string | null;
          region?: string | null;
          timezone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          plan_type?: "free" | "premium" | "elite";
          last_active_at?: string | null;
          membership_activated_at?: string | null;
          expires_at?: string | null;
          suspended_at?: string | null;
          archived_at?: string | null;
          last_login_at?: string | null;
          country?: string | null;
          region?: string | null;
          timezone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: "premium" | "elite";
          status: "active" | "canceled" | "past_due" | "trialing" | "incomplete";
          amount_minor: number | null;
          currency: string;
          current_period_start: string | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan: "premium" | "elite";
          status?: "active" | "canceled" | "past_due" | "trialing" | "incomplete";
          amount_minor?: number | null;
          currency?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          plan?: "premium" | "elite";
          status?: "active" | "canceled" | "past_due" | "trialing" | "incomplete";
          amount_minor?: number | null;
          currency?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      revenue_events: {
        Row: {
          id: string;
          user_id: string | null;
          amount_npr: number;
          kind: "subscription" | "one_time" | "adjustment" | "other";
          note: string | null;
          external_ref: string | null;
          created_at: string;
          membership_request_id: string | null;
          plan_type: "premium" | "elite" | null;
          payment_method: "khalti_qr" | "esewa_qr" | "global_ime_qr" | null;
          event_type: "membership_payment" | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          amount_npr: number;
          kind?: "subscription" | "one_time" | "adjustment" | "other";
          note?: string | null;
          external_ref?: string | null;
          created_at?: string;
          membership_request_id?: string | null;
          plan_type?: "premium" | "elite" | null;
          payment_method?: "khalti_qr" | "esewa_qr" | "global_ime_qr" | null;
          event_type?: "membership_payment" | null;
        };
        Update: {
          user_id?: string | null;
          amount_npr?: number;
          kind?: "subscription" | "one_time" | "adjustment" | "other";
          note?: string | null;
          external_ref?: string | null;
          created_at?: string;
          membership_request_id?: string | null;
          plan_type?: "premium" | "elite" | null;
          payment_method?: "khalti_qr" | "esewa_qr" | "global_ime_qr" | null;
          event_type?: "membership_payment" | null;
        };
        Relationships: [];
      };
      reminder_logs: {
        Row: {
          id: string;
          reminder_id: string | null;
          user_id: string | null;
          event_type: "email_sent" | "email_failed" | "cron_started" | "cron_completed" | "other";
          provider_message: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          reminder_id?: string | null;
          user_id?: string | null;
          event_type: "email_sent" | "email_failed" | "cron_started" | "cron_completed" | "other";
          provider_message?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          reminder_id?: string | null;
          user_id?: string | null;
          event_type?: "email_sent" | "email_failed" | "cron_started" | "cron_completed" | "other";
          provider_message?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_users: {
        Row: {
          user_id: string;
          role: "admin" | "super_admin";
          created_at: string;
        };
        Insert: {
          user_id: string;
          role?: "admin" | "super_admin";
          created_at?: string;
        };
        Update: {
          role?: "admin" | "super_admin";
          created_at?: string;
        };
        Relationships: [];
      };
      system_health: {
        Row: {
          id: string;
          label: string | null;
          last_run_at: string | null;
          last_status: string | null;
          metadata: Json;
          updated_at: string;
        };
        Insert: {
          id: string;
          label?: string | null;
          last_run_at?: string | null;
          last_status?: string | null;
          metadata?: Json;
          updated_at?: string;
        };
        Update: {
          label?: string | null;
          last_run_at?: string | null;
          last_status?: string | null;
          metadata?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      business_profiles: {
        Row: {
          id: string;
          user_id: string;
          business_name: string;
          business_type: string | null;
          pan_vat: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          fiscal_year_start_month: number;
          currency: string;
          payload: Json;
          default_vat_rate: number;
          vat_registered: boolean;
          esewa_merchant_id: string | null;
          khalti_merchant_id: string | null;
          esewa_qr_url: string | null;
          khalti_qr_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_name?: string;
          business_type?: string | null;
          pan_vat?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          fiscal_year_start_month?: number;
          currency?: string;
          payload?: Json;
          default_vat_rate?: number;
          vat_registered?: boolean;
          esewa_merchant_id?: string | null;
          khalti_merchant_id?: string | null;
          esewa_qr_url?: string | null;
          khalti_qr_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_name?: string;
          business_type?: string | null;
          pan_vat?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          fiscal_year_start_month?: number;
          currency?: string;
          payload?: Json;
          default_vat_rate?: number;
          vat_registered?: boolean;
          esewa_merchant_id?: string | null;
          khalti_merchant_id?: string | null;
          esewa_qr_url?: string | null;
          khalti_qr_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          user_id: string;
          business_profile_id: string | null;
          name: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          opening_balance: number;
          balance: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_profile_id?: string | null;
          name: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          opening_balance?: number;
          balance?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_profile_id?: string | null;
          name?: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          opening_balance?: number;
          balance?: number;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      suppliers: {
        Row: {
          id: string;
          user_id: string;
          business_profile_id: string | null;
          name: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          opening_balance: number;
          balance: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_profile_id?: string | null;
          name: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          opening_balance?: number;
          balance?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_profile_id?: string | null;
          name?: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          opening_balance?: number;
          balance?: number;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      sales: {
        Row: {
          id: string;
          user_id: string;
          business_profile_id: string | null;
          customer_id: string | null;
          invoice_number: string | null;
          sale_date: string;
          subtotal: number;
          tax_amount: number;
          discount_amount: number;
          total_amount: number;
          amount_paid: number;
          payment_status: "paid" | "partial" | "unpaid";
          payment_method: "cash" | "bank" | "esewa" | "khalti" | "other";
          vat_rate: number;
          is_tax_invoice: boolean;
          line_items: Json;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_profile_id?: string | null;
          customer_id?: string | null;
          invoice_number?: string | null;
          sale_date?: string;
          subtotal?: number;
          tax_amount?: number;
          discount_amount?: number;
          total_amount?: number;
          amount_paid?: number;
          payment_status?: "paid" | "partial" | "unpaid";
          payment_method?: "cash" | "bank" | "esewa" | "khalti" | "other";
          vat_rate?: number;
          is_tax_invoice?: boolean;
          line_items?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_profile_id?: string | null;
          customer_id?: string | null;
          invoice_number?: string | null;
          sale_date?: string;
          subtotal?: number;
          tax_amount?: number;
          discount_amount?: number;
          total_amount?: number;
          amount_paid?: number;
          payment_status?: "paid" | "partial" | "unpaid";
          payment_method?: "cash" | "bank" | "esewa" | "khalti" | "other";
          vat_rate?: number;
          is_tax_invoice?: boolean;
          line_items?: Json;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      purchases: {
        Row: {
          id: string;
          user_id: string;
          business_profile_id: string | null;
          supplier_id: string | null;
          bill_number: string | null;
          purchase_date: string;
          subtotal: number;
          tax_amount: number;
          discount_amount: number;
          total_amount: number;
          amount_paid: number;
          payment_status: "paid" | "partial" | "unpaid";
          line_items: Json;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_profile_id?: string | null;
          supplier_id?: string | null;
          bill_number?: string | null;
          purchase_date?: string;
          subtotal?: number;
          tax_amount?: number;
          discount_amount?: number;
          total_amount?: number;
          amount_paid?: number;
          payment_status?: "paid" | "partial" | "unpaid";
          line_items?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_profile_id?: string | null;
          supplier_id?: string | null;
          bill_number?: string | null;
          purchase_date?: string;
          subtotal?: number;
          tax_amount?: number;
          discount_amount?: number;
          total_amount?: number;
          amount_paid?: number;
          payment_status?: "paid" | "partial" | "unpaid";
          line_items?: Json;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      inventory_items: {
        Row: {
          id: string;
          user_id: string;
          business_profile_id: string | null;
          sku: string | null;
          name: string;
          category: string | null;
          unit: string;
          quantity: number;
          cost_price: number;
          selling_price: number;
          reorder_level: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_profile_id?: string | null;
          sku?: string | null;
          name: string;
          category?: string | null;
          unit?: string;
          quantity?: number;
          cost_price?: number;
          selling_price?: number;
          reorder_level?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_profile_id?: string | null;
          sku?: string | null;
          name?: string;
          category?: string | null;
          unit?: string;
          quantity?: number;
          cost_price?: number;
          selling_price?: number;
          reorder_level?: number;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          business_profile_id: string | null;
          transaction_type: "income" | "expense" | "transfer" | "payment_received" | "payment_made";
          amount: number;
          account_type: "cash" | "bank";
          account_name: string | null;
          reference_type: "sale" | "purchase" | "expense" | "other" | null;
          reference_id: string | null;
          party_name: string | null;
          transaction_date: string;
          expense_category_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_profile_id?: string | null;
          transaction_type: "income" | "expense" | "transfer" | "payment_received" | "payment_made";
          amount?: number;
          account_type?: "cash" | "bank";
          account_name?: string | null;
          reference_type?: "sale" | "purchase" | "expense" | "other" | null;
          reference_id?: string | null;
          party_name?: string | null;
          transaction_date?: string;
          expense_category_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_profile_id?: string | null;
          transaction_type?: "income" | "expense" | "transfer" | "payment_received" | "payment_made";
          amount?: number;
          account_type?: "cash" | "bank";
          account_name?: string | null;
          reference_type?: "sale" | "purchase" | "expense" | "other" | null;
          reference_id?: string | null;
          party_name?: string | null;
          transaction_date?: string;
          expense_category_id?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      credit_reminders: {
        Row: {
          id: string;
          user_id: string;
          business_profile_id: string | null;
          party_type: "customer" | "supplier";
          party_id: string | null;
          party_name: string;
          amount_due: number;
          due_date: string;
          reminder_type: "receivable" | "payable";
          is_resolved: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_profile_id?: string | null;
          party_type: "customer" | "supplier";
          party_id?: string | null;
          party_name: string;
          amount_due?: number;
          due_date: string;
          reminder_type: "receivable" | "payable";
          is_resolved?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_profile_id?: string | null;
          party_type?: "customer" | "supplier";
          party_id?: string | null;
          party_name?: string;
          amount_due?: number;
          due_date?: string;
          reminder_type?: "receivable" | "payable";
          is_resolved?: boolean;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      expense_categories: {
        Row: {
          id: string;
          user_id: string;
          business_profile_id: string | null;
          name: string;
          color: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_profile_id?: string | null;
          name: string;
          color?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_profile_id?: string | null;
          name?: string;
          color?: string | null;
          is_default?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      purchase_orders: {
        Row: {
          id: string;
          user_id: string;
          business_profile_id: string | null;
          supplier_id: string | null;
          po_number: string | null;
          order_date: string;
          expected_date: string | null;
          status: "draft" | "sent" | "partial" | "received" | "cancelled";
          subtotal: number;
          tax_amount: number;
          total_amount: number;
          line_items: Json;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_profile_id?: string | null;
          supplier_id?: string | null;
          po_number?: string | null;
          order_date?: string;
          expected_date?: string | null;
          status?: "draft" | "sent" | "partial" | "received" | "cancelled";
          subtotal?: number;
          tax_amount?: number;
          total_amount?: number;
          line_items?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_profile_id?: string | null;
          supplier_id?: string | null;
          po_number?: string | null;
          order_date?: string;
          expected_date?: string | null;
          status?: "draft" | "sent" | "partial" | "received" | "cancelled";
          subtotal?: number;
          tax_amount?: number;
          total_amount?: number;
          line_items?: Json;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
