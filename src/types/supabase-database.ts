export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          fire_nepal_id: string | null;
          full_name: string | null;
          display_name: string | null;
          avatar_url: string | null;
          phone_dial_code: string | null;
          phone_national_digits: string | null;
          phone: string | null;
          email: string | null;
          membership_plan: string;
          membership_start: string | null;
          membership_expiry: string | null;
          membership_suspended_at: string | null;
          membership_archived_at: string | null;
          country: string | null;
          country_of_work: string | null;
          preferred_currency: string;
          fire_goal: number | null;
          monthly_investment: number | null;
          risk_profile: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          fire_nepal_id?: string;
          full_name?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          phone_dial_code?: string | null;
          phone_national_digits?: string | null;
          phone?: string | null;
          email?: string | null;
          membership_plan?: string;
          membership_start?: string | null;
          membership_expiry?: string | null;
          membership_suspended_at?: string | null;
          membership_archived_at?: string | null;
          country?: string | null;
          country_of_work?: string | null;
          preferred_currency?: string;
          fire_goal?: number | null;
          monthly_investment?: number | null;
          risk_profile?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          fire_nepal_id?: string;
          full_name?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          phone_dial_code?: string | null;
          phone_national_digits?: string | null;
          phone?: string | null;
          email?: string | null;
          membership_plan?: string;
          membership_start?: string | null;
          membership_expiry?: string | null;
          membership_suspended_at?: string | null;
          membership_archived_at?: string | null;
          country?: string | null;
          country_of_work?: string | null;
          preferred_currency?: string;
          fire_goal?: number | null;
          monthly_investment?: number | null;
          risk_profile?: string | null;
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
      group_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          local_member_id: string;
          name: string;
          avatar_url: string | null;
          phone: string | null;
          kakao_id: string | null;
          bank_name: string | null;
          account_number: string | null;
          emergency_contact: string | null;
          notes: string | null;
          sort_order: number;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          local_member_id: string;
          name: string;
          avatar_url?: string | null;
          phone?: string | null;
          kakao_id?: string | null;
          bank_name?: string | null;
          account_number?: string | null;
          emergency_contact?: string | null;
          notes?: string | null;
          sort_order?: number;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          kakao_id?: string | null;
          bank_name?: string | null;
          account_number?: string | null;
          emergency_contact?: string | null;
          notes?: string | null;
          sort_order?: number;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      group_expenses: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          local_expense_id: number | null;
          title: string;
          amount: number;
          payer_member_id: string;
          category: string;
          split_equally: boolean;
          expense_date: string;
          split_among: string[];
          split_percentages: Json;
          amount_currency: string;
          receipt_image_url: string | null;
          notes: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          local_expense_id?: number | null;
          title: string;
          amount?: number;
          payer_member_id: string;
          category: string;
          split_equally?: boolean;
          expense_date?: string;
          split_among?: string[];
          split_percentages?: Json;
          amount_currency?: string;
          receipt_image_url?: string | null;
          notes?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          local_expense_id?: number | null;
          title?: string;
          amount?: number;
          payer_member_id?: string;
          category?: string;
          split_equally?: boolean;
          expense_date?: string;
          split_among?: string[];
          split_percentages?: Json;
          amount_currency?: string;
          receipt_image_url?: string | null;
          notes?: string | null;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      settlements: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          month_key: string;
          from_member_id: string | null;
          to_member_id: string | null;
          amount: number;
          settlement_type: "transfer" | "complete" | "override";
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          month_key: string;
          from_member_id?: string | null;
          to_member_id?: string | null;
          amount?: number;
          settlement_type: "transfer" | "complete" | "override";
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          month_key?: string;
          from_member_id?: string | null;
          to_member_id?: string | null;
          amount?: number;
          settlement_type?: "transfer" | "complete" | "override";
          metadata?: Json;
        };
        Relationships: [];
      };
      expense_transactions: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          local_expense_id: number | null;
          transaction_type: "income" | "expense" | "transfer" | "settlement" | "adjustment";
          description: string;
          category: string | null;
          amount: number;
          currency: string;
          member_id: string | null;
          member_name: string | null;
          transaction_date: string;
          metadata: Json;
          created_by_name: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          local_expense_id?: number | null;
          transaction_type: "income" | "expense" | "transfer" | "settlement" | "adjustment";
          description: string;
          category?: string | null;
          amount?: number;
          currency?: string;
          member_id?: string | null;
          member_name?: string | null;
          transaction_date?: string;
          metadata?: Json;
          created_by_name?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          local_expense_id?: number | null;
          transaction_type?: "income" | "expense" | "transfer" | "settlement" | "adjustment";
          description?: string;
          category?: string | null;
          amount?: number;
          currency?: string;
          member_id?: string | null;
          member_name?: string | null;
          transaction_date?: string;
          metadata?: Json;
          created_by_name?: string | null;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      expense_transaction_audit_log: {
        Row: {
          id: string;
          transaction_id: string;
          workspace_id: string;
          user_id: string;
          action: "created" | "updated" | "deleted" | "restored";
          changes: Json;
          actor_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          workspace_id: string;
          user_id: string;
          action: "created" | "updated" | "deleted" | "restored";
          changes?: Json;
          actor_name?: string | null;
          created_at?: string;
        };
        Update: {
          action?: "created" | "updated" | "deleted" | "restored";
          changes?: Json;
          actor_name?: string | null;
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
      fire_ai_conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          preview: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          preview?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          preview?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fire_ai_messages: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          role: string;
          content?: string;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
        Relationships: [];
      };
      fire_ai_usage_events: {
        Row: {
          id: string;
          user_id: string;
          conversation_id: string | null;
          model: string;
          membership_plan: "free" | "premium" | "elite";
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          estimated_cost: number;
          response_time: number;
          ai_feature: string;
          status: "success" | "failed" | "blocked_quota";
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          conversation_id?: string | null;
          model: string;
          membership_plan?: "free" | "premium" | "elite";
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
          estimated_cost?: number;
          response_time?: number;
          ai_feature?: string;
          status?: "success" | "failed" | "blocked_quota";
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          conversation_id?: string | null;
          model?: string;
          membership_plan?: "free" | "premium" | "elite";
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
          estimated_cost?: number;
          response_time?: number;
          ai_feature?: string;
          status?: "success" | "failed" | "blocked_quota";
          error_message?: string | null;
        };
        Relationships: [];
      };
      fire_ai_monthly_usage: {
        Row: {
          id: string;
          user_id: string;
          usage_month: string;
          ai_messages_used: number;
          tokens_used: number;
          estimated_openai_cost: number;
          current_membership: "free" | "premium" | "elite";
          remaining_quota: number;
          reset_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          usage_month: string;
          ai_messages_used?: number;
          tokens_used?: number;
          estimated_openai_cost?: number;
          current_membership?: "free" | "premium" | "elite";
          remaining_quota?: number;
          reset_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          ai_messages_used?: number;
          tokens_used?: number;
          estimated_openai_cost?: number;
          current_membership?: "free" | "premium" | "elite";
          remaining_quota?: number;
          reset_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cashflow_snapshots: {
        Row: {
          user_id: string;
          state: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          state?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          state?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      finance_budget_records: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: string;
          icon: string;
          gradient: string;
          period: string;
          amount_npr: number;
          monthly_budget_npr: number;
          monthly_spent_npr: number;
          days_remaining: number;
          notification_settings: Json;
          ai_recommendation: Json | null;
          sort_order: number;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          category: string;
          icon?: string;
          gradient?: string;
          period: string;
          amount_npr: number;
          monthly_budget_npr: number;
          monthly_spent_npr?: number;
          days_remaining?: number;
          notification_settings?: Json;
          ai_recommendation?: Json | null;
          sort_order?: number;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          category?: string;
          icon?: string;
          gradient?: string;
          period?: string;
          amount_npr?: number;
          monthly_budget_npr?: number;
          monthly_spent_npr?: number;
          days_remaining?: number;
          notification_settings?: Json;
          ai_recommendation?: Json | null;
          sort_order?: number;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      finance_savings_workspace: {
        Row: {
          user_id: string;
          state: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          state?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          state?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      finance_insurance_policies: {
        Row: {
          id: string;
          user_id: string;
          insurance_type: string;
          provider: string;
          coverage_amount_npr: number;
          premium_npr: number;
          payment_frequency: string;
          start_date: string | null;
          expiry_date: string | null;
          nominee: string | null;
          family_members_covered: Json;
          notes: string | null;
          document_data_url: string | null;
          document_file_name: string | null;
          sort_order: number;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          insurance_type: string;
          provider: string;
          coverage_amount_npr?: number;
          premium_npr?: number;
          payment_frequency?: string;
          start_date?: string | null;
          expiry_date?: string | null;
          nominee?: string | null;
          family_members_covered?: Json;
          notes?: string | null;
          document_data_url?: string | null;
          document_file_name?: string | null;
          sort_order?: number;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          insurance_type?: string;
          provider?: string;
          coverage_amount_npr?: number;
          premium_npr?: number;
          payment_frequency?: string;
          start_date?: string | null;
          expiry_date?: string | null;
          nominee?: string | null;
          family_members_covered?: Json;
          notes?: string | null;
          document_data_url?: string | null;
          document_file_name?: string | null;
          sort_order?: number;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      fire_ai_admin_settings: {
        Row: {
          id: string;
          monthly_budget_usd: number;
          warn_50_enabled: boolean;
          warn_80_enabled: boolean;
          warn_100_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          monthly_budget_usd?: number;
          warn_50_enabled?: boolean;
          warn_80_enabled?: boolean;
          warn_100_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          monthly_budget_usd?: number;
          warn_50_enabled?: boolean;
          warn_80_enabled?: boolean;
          warn_100_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      community_reviews: {
        Row: {
          id: string;
          user_id: string | null;
          full_name: string;
          country: string | null;
          city: string | null;
          avatar_url: string | null;
          rating: number;
          review_title: string;
          review_text: string;
          verified: boolean;
          is_demo: boolean;
          status: "pending" | "approved" | "rejected";
          review_type: "community" | "homepage";
          display_order: number;
          created_at: string;
          updated_at: string;
          approved_by: string | null;
          approved_at: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          full_name: string;
          country?: string | null;
          city?: string | null;
          avatar_url?: string | null;
          rating: number;
          review_title: string;
          review_text: string;
          verified?: boolean;
          is_demo?: boolean;
          status?: "pending" | "approved" | "rejected";
          review_type?: "community" | "homepage";
          display_order?: number;
          created_at?: string;
          updated_at?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          user_id?: string | null;
          full_name?: string;
          country?: string | null;
          city?: string | null;
          avatar_url?: string | null;
          rating?: number;
          review_title?: string;
          review_text?: string;
          verified?: boolean;
          is_demo?: boolean;
          status?: "pending" | "approved" | "rejected";
          review_type?: "community" | "homepage";
          display_order?: number;
          updated_at?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      fire_ai_usage_month: {
        Args: { ts: string };
        Returns: string;
      };
      fire_ai_month_reset_at: {
        Args: { month_ym: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
  };
};
