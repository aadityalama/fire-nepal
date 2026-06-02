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
          updated_at: string;
        };
        Insert: {
          user_id: string;
          ledger?: Json;
          net_worth_history?: Json;
          updated_at?: string;
        };
        Update: {
          ledger?: Json;
          net_worth_history?: Json;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
