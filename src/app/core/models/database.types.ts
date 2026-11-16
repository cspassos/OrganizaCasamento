export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      expenses: {
        Row: {
          attachment_path: string | null;
          category_id: string;
          contract_date: string | null;
          contract_reference: string;
          contracted_cents: number;
          created_at: string;
          description: string;
          due_date: string | null;
          id: string;
          method: string;
          notes: string;
          planned_cents: number;
          status: string;
          supplier_id: string | null;
          supplier_name: string;
          updated_at: string;
          wedding_id: string;
        };
        Insert: {
          attachment_path?: string | null;
          category_id: string;
          contract_date?: string | null;
          contract_reference?: string;
          contracted_cents?: number;
          created_at?: string;
          description: string;
          due_date?: string | null;
          id?: string;
          method?: string;
          notes?: string;
          planned_cents?: number;
          status?: string;
          supplier_id?: string | null;
          supplier_name?: string;
          updated_at?: string;
          wedding_id: string;
        };
        Update: {
          attachment_path?: string | null;
          category_id?: string;
          contract_date?: string | null;
          contract_reference?: string;
          contracted_cents?: number;
          created_at?: string;
          description?: string;
          due_date?: string | null;
          id?: string;
          method?: string;
          notes?: string;
          planned_cents?: number;
          status?: string;
          supplier_id?: string | null;
          supplier_name?: string;
          updated_at?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'expenses_wedding_id_category_id_fkey';
            columns: ['wedding_id', 'category_id'];
            isOneToOne: false;
            referencedRelation: 'finance_categories';
            referencedColumns: ['wedding_id', 'id'];
          },
          {
            foreignKeyName: 'expenses_wedding_id_fkey';
            columns: ['wedding_id'];
            isOneToOne: false;
            referencedRelation: 'weddings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_wedding_id_supplier_id_fkey';
            columns: ['wedding_id', 'supplier_id'];
            isOneToOne: false;
            referencedRelation: 'suppliers';
            referencedColumns: ['wedding_id', 'id'];
          },
        ];
      };
      external_gift_lists: {
        Row: {
          id: string;
          name: string;
          updated_at: string;
          url: string;
          wedding_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          updated_at?: string;
          url: string;
          wedding_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          updated_at?: string;
          url?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'external_gift_lists_wedding_id_fkey';
            columns: ['wedding_id'];
            isOneToOne: false;
            referencedRelation: 'weddings';
            referencedColumns: ['id'];
          },
        ];
      };
      families: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          notes: string;
          updated_at: string;
          wedding_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          notes?: string;
          updated_at?: string;
          wedding_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          notes?: string;
          updated_at?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'families_wedding_id_fkey';
            columns: ['wedding_id'];
            isOneToOne: false;
            referencedRelation: 'weddings';
            referencedColumns: ['id'];
          },
        ];
      };
      finance_audit: {
        Row: {
          action: string;
          detail: string;
          entity_id: string;
          id: string;
          occurred_at: string;
          wedding_id: string;
        };
        Insert: {
          action: string;
          detail?: string;
          entity_id?: string;
          id?: string;
          occurred_at?: string;
          wedding_id: string;
        };
        Update: {
          action?: string;
          detail?: string;
          entity_id?: string;
          id?: string;
          occurred_at?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'finance_audit_wedding_id_fkey';
            columns: ['wedding_id'];
            isOneToOne: false;
            referencedRelation: 'weddings';
            referencedColumns: ['id'];
          },
        ];
      };
      finance_categories: {
        Row: {
          budget_cents: number;
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
          wedding_id: string;
        };
        Insert: {
          budget_cents?: number;
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
          wedding_id: string;
        };
        Update: {
          budget_cents?: number;
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'finance_categories_wedding_id_fkey';
            columns: ['wedding_id'];
            isOneToOne: false;
            referencedRelation: 'weddings';
            referencedColumns: ['id'];
          },
        ];
      };
      finance_settings: {
        Row: {
          budget_cents: number | null;
          reserve_cents: number;
          updated_at: string;
          wedding_id: string;
        };
        Insert: {
          budget_cents?: number | null;
          reserve_cents?: number;
          updated_at?: string;
          wedding_id: string;
        };
        Update: {
          budget_cents?: number | null;
          reserve_cents?: number;
          updated_at?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'finance_settings_wedding_id_fkey';
            columns: ['wedding_id'];
            isOneToOne: true;
            referencedRelation: 'weddings';
            referencedColumns: ['id'];
          },
        ];
      };
      financial_transactions: {
        Row: {
          amount_cents: number;
          attachment_path: string | null;
          created_at: string;
          expense_id: string;
          id: string;
          installment_id: string;
          kind: string;
          method: string;
          notes: string;
          payment_id: string | null;
          transaction_date: string;
          updated_at: string;
          void_reason: string | null;
          voided_at: string | null;
          wedding_id: string;
        };
        Insert: {
          amount_cents: number;
          attachment_path?: string | null;
          created_at?: string;
          expense_id: string;
          id?: string;
          installment_id: string;
          kind: string;
          method?: string;
          notes?: string;
          payment_id?: string | null;
          transaction_date: string;
          updated_at?: string;
          void_reason?: string | null;
          voided_at?: string | null;
          wedding_id: string;
        };
        Update: {
          amount_cents?: number;
          attachment_path?: string | null;
          created_at?: string;
          expense_id?: string;
          id?: string;
          installment_id?: string;
          kind?: string;
          method?: string;
          notes?: string;
          payment_id?: string | null;
          transaction_date?: string;
          updated_at?: string;
          void_reason?: string | null;
          voided_at?: string | null;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'financial_transactions_wedding_id_expense_id_installment_i_fkey';
            columns: ['wedding_id', 'expense_id', 'installment_id'];
            isOneToOne: false;
            referencedRelation: 'installments';
            referencedColumns: ['wedding_id', 'expense_id', 'id'];
          },
          {
            foreignKeyName: 'financial_transactions_wedding_id_fkey';
            columns: ['wedding_id'];
            isOneToOne: false;
            referencedRelation: 'weddings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'financial_transactions_wedding_id_payment_id_fkey';
            columns: ['wedding_id', 'payment_id'];
            isOneToOne: false;
            referencedRelation: 'financial_transactions';
            referencedColumns: ['wedding_id', 'id'];
          },
        ];
      };
      gift_items: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          name: string;
          photo_path: string | null;
          price_cents: number | null;
          product_url: string;
          quantity: number;
          received_quantity: number;
          updated_at: string;
          wedding_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          id?: string;
          name: string;
          photo_path?: string | null;
          price_cents?: number | null;
          product_url?: string;
          quantity?: number;
          received_quantity?: number;
          updated_at?: string;
          wedding_id: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          name?: string;
          photo_path?: string | null;
          price_cents?: number | null;
          product_url?: string;
          quantity?: number;
          received_quantity?: number;
          updated_at?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'gift_items_wedding_id_fkey';
            columns: ['wedding_id'];
            isOneToOne: false;
            referencedRelation: 'weddings';
            referencedColumns: ['id'];
          },
        ];
      };
      gift_lists: {
        Row: {
          message: string;
          title: string;
          updated_at: string;
          wedding_id: string;
        };
        Insert: {
          message?: string;
          title?: string;
          updated_at?: string;
          wedding_id: string;
        };
        Update: {
          message?: string;
          title?: string;
          updated_at?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'gift_lists_wedding_id_fkey';
            columns: ['wedding_id'];
            isOneToOne: true;
            referencedRelation: 'weddings';
            referencedColumns: ['id'];
          },
        ];
      };
      guests: {
        Row: {
          age: number | null;
          child: boolean;
          companion_of: string | null;
          created_at: string;
          email: string;
          family_id: string | null;
          id: string;
          invitation_sent: boolean;
          legacy_details: Json;
          name: string;
          notes: string;
          phone: string;
          relationship: string;
          sent_date: string | null;
          side: string;
          status: string;
          updated_at: string;
          wedding_id: string;
          whatsapp: string;
        };
        Insert: {
          age?: number | null;
          child?: boolean;
          companion_of?: string | null;
          created_at?: string;
          email?: string;
          family_id?: string | null;
          id?: string;
          invitation_sent?: boolean;
          legacy_details?: Json;
          name: string;
          notes?: string;
          phone?: string;
          relationship?: string;
          sent_date?: string | null;
          side?: string;
          status?: string;
          updated_at?: string;
          wedding_id: string;
          whatsapp?: string;
        };
        Update: {
          age?: number | null;
          child?: boolean;
          companion_of?: string | null;
          created_at?: string;
          email?: string;
          family_id?: string | null;
          id?: string;
          invitation_sent?: boolean;
          legacy_details?: Json;
          name?: string;
          notes?: string;
          phone?: string;
          relationship?: string;
          sent_date?: string | null;
          side?: string;
          status?: string;
          updated_at?: string;
          wedding_id?: string;
          whatsapp?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'guests_wedding_id_companion_of_fkey';
            columns: ['wedding_id', 'companion_of'];
            isOneToOne: false;
            referencedRelation: 'guests';
            referencedColumns: ['wedding_id', 'id'];
          },
          {
            foreignKeyName: 'guests_wedding_id_family_id_fkey';
            columns: ['wedding_id', 'family_id'];
            isOneToOne: false;
            referencedRelation: 'families';
            referencedColumns: ['wedding_id', 'id'];
          },
          {
            foreignKeyName: 'guests_wedding_id_fkey';
            columns: ['wedding_id'];
            isOneToOne: false;
            referencedRelation: 'weddings';
            referencedColumns: ['id'];
          },
        ];
      };
      installments: {
        Row: {
          amount_cents: number;
          created_at: string;
          due_date: string;
          expense_id: string;
          id: string;
          label: string;
          number: number;
          updated_at: string;
          wedding_id: string;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          due_date: string;
          expense_id: string;
          id?: string;
          label: string;
          number: number;
          updated_at?: string;
          wedding_id: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          due_date?: string;
          expense_id?: string;
          id?: string;
          label?: string;
          number?: number;
          updated_at?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'installments_wedding_id_expense_id_fkey';
            columns: ['wedding_id', 'expense_id'];
            isOneToOne: false;
            referencedRelation: 'expenses';
            referencedColumns: ['wedding_id', 'id'];
          },
          {
            foreignKeyName: 'installments_wedding_id_fkey';
            columns: ['wedding_id'];
            isOneToOne: false;
            referencedRelation: 'weddings';
            referencedColumns: ['id'];
          },
        ];
      };
      invitation_designs: {
        Row: {
          created_at: string;
          design: Json;
          id: string;
          title: string;
          updated_at: string;
          wedding_id: string;
        };
        Insert: {
          created_at?: string;
          design: Json;
          id?: string;
          title: string;
          updated_at?: string;
          wedding_id: string;
        };
        Update: {
          created_at?: string;
          design?: Json;
          id?: string;
          title?: string;
          updated_at?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invitation_designs_wedding_id_fkey';
            columns: ['wedding_id'];
            isOneToOne: false;
            referencedRelation: 'weddings';
            referencedColumns: ['id'];
          },
        ];
      };
      invitation_guests: {
        Row: {
          guest_id: string;
          id: string;
          invitation_id: string;
          name_snapshot: string;
          wedding_id: string;
        };
        Insert: {
          guest_id: string;
          id?: string;
          invitation_id: string;
          name_snapshot: string;
          wedding_id: string;
        };
        Update: {
          guest_id?: string;
          id?: string;
          invitation_id?: string;
          name_snapshot?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invitation_guests_wedding_id_fkey';
            columns: ['wedding_id'];
            isOneToOne: false;
            referencedRelation: 'weddings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invitation_guests_wedding_id_guest_id_fkey';
            columns: ['wedding_id', 'guest_id'];
            isOneToOne: false;
            referencedRelation: 'guests';
            referencedColumns: ['wedding_id', 'id'];
          },
          {
            foreignKeyName: 'invitation_guests_wedding_id_invitation_id_fkey';
            columns: ['wedding_id', 'invitation_id'];
            isOneToOne: false;
            referencedRelation: 'invitations';
            referencedColumns: ['wedding_id', 'id'];
          },
        ];
      };
      invitation_messages: {
        Row: {
          action: string;
          id: string;
          message: string;
          updated_at: string;
          wedding_id: string;
        };
        Insert: {
          action: string;
          id?: string;
          message: string;
          updated_at?: string;
          wedding_id: string;
        };
        Update: {
          action?: string;
          id?: string;
          message?: string;
          updated_at?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invitation_messages_wedding_id_fkey';
            columns: ['wedding_id'];
            isOneToOne: false;
            referencedRelation: 'weddings';
            referencedColumns: ['id'];
          },
        ];
      };
      invitations: {
        Row: {
          active: boolean;
          created_at: string;
          design_id: string | null;
          design_snapshot: Json;
          id: string;
          recipient_label: string;
          sent_at: string | null;
          token_hash: string | null;
          unit_key: string;
          updated_at: string;
          wedding_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          design_id?: string | null;
          design_snapshot: Json;
          id?: string;
          recipient_label: string;
          sent_at?: string | null;
          token_hash?: string | null;
          unit_key: string;
          updated_at?: string;
          wedding_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          design_id?: string | null;
          design_snapshot?: Json;
          id?: string;
          recipient_label?: string;
          sent_at?: string | null;
          token_hash?: string | null;
          unit_key?: string;
          updated_at?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invitations_wedding_id_design_id_fkey';
            columns: ['wedding_id', 'design_id'];
            isOneToOne: false;
            referencedRelation: 'invitation_designs';
            referencedColumns: ['wedding_id', 'id'];
          },
          {
            foreignKeyName: 'invitations_wedding_id_fkey';
            columns: ['wedding_id'];
            isOneToOne: false;
            referencedRelation: 'weddings';
            referencedColumns: ['id'];
          },
        ];
      };
      legacy_snapshots: {
        Row: {
          id: string;
          imported_at: string;
          module: string;
          payload: Json;
          wedding_id: string;
        };
        Insert: {
          id?: string;
          imported_at?: string;
          module: string;
          payload: Json;
          wedding_id: string;
        };
        Update: {
          id?: string;
          imported_at?: string;
          module?: string;
          payload?: Json;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'legacy_snapshots_wedding_id_fkey';
            columns: ['wedding_id'];
            isOneToOne: false;
            referencedRelation: 'weddings';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      rsvp_responses: {
        Row: {
          attending: boolean;
          guest_id: string;
          id: string;
          invitation_id: string;
          notes: string;
          responded_at: string;
          wedding_id: string;
        };
        Insert: {
          attending: boolean;
          guest_id: string;
          id?: string;
          invitation_id: string;
          notes?: string;
          responded_at?: string;
          wedding_id: string;
        };
        Update: {
          attending?: boolean;
          guest_id?: string;
          id?: string;
          invitation_id?: string;
          notes?: string;
          responded_at?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rsvp_responses_wedding_id_fkey';
            columns: ['wedding_id'];
            isOneToOne: false;
            referencedRelation: 'weddings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rsvp_responses_wedding_id_invitation_id_guest_id_fkey';
            columns: ['wedding_id', 'invitation_id', 'guest_id'];
            isOneToOne: false;
            referencedRelation: 'invitation_guests';
            referencedColumns: ['wedding_id', 'invitation_id', 'guest_id'];
          },
        ];
      };
      special_participations: {
        Row: {
          created_at: string;
          guest_id: string;
          id: string;
          legacy_details: Json;
          notes: string;
          participation: string;
          partner_id: string | null;
          updated_at: string;
          wedding_id: string;
        };
        Insert: {
          created_at?: string;
          guest_id: string;
          id?: string;
          legacy_details?: Json;
          notes?: string;
          participation: string;
          partner_id?: string | null;
          updated_at?: string;
          wedding_id: string;
        };
        Update: {
          created_at?: string;
          guest_id?: string;
          id?: string;
          legacy_details?: Json;
          notes?: string;
          participation?: string;
          partner_id?: string | null;
          updated_at?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'special_participations_wedding_id_fkey';
            columns: ['wedding_id'];
            isOneToOne: false;
            referencedRelation: 'weddings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'special_participations_wedding_id_guest_id_fkey';
            columns: ['wedding_id', 'guest_id'];
            isOneToOne: true;
            referencedRelation: 'guests';
            referencedColumns: ['wedding_id', 'id'];
          },
          {
            foreignKeyName: 'special_participations_wedding_id_partner_id_fkey';
            columns: ['wedding_id', 'partner_id'];
            isOneToOne: false;
            referencedRelation: 'special_participations';
            referencedColumns: ['wedding_id', 'id'];
          },
        ];
      };
      suppliers: {
        Row: {
          address: string;
          attachment_path: string | null;
          category: string;
          company: string;
          created_at: string;
          document: string;
          email: string;
          id: string;
          name: string;
          notes: string;
          phone: string;
          rating: number;
          responsible: string;
          review: string;
          service: string;
          status: string;
          updated_at: string;
          wedding_id: string;
          whatsapp: string;
        };
        Insert: {
          address?: string;
          attachment_path?: string | null;
          category?: string;
          company?: string;
          created_at?: string;
          document?: string;
          email?: string;
          id?: string;
          name: string;
          notes?: string;
          phone?: string;
          rating?: number;
          responsible?: string;
          review?: string;
          service?: string;
          status?: string;
          updated_at?: string;
          wedding_id: string;
          whatsapp?: string;
        };
        Update: {
          address?: string;
          attachment_path?: string | null;
          category?: string;
          company?: string;
          created_at?: string;
          document?: string;
          email?: string;
          id?: string;
          name?: string;
          notes?: string;
          phone?: string;
          rating?: number;
          responsible?: string;
          review?: string;
          service?: string;
          status?: string;
          updated_at?: string;
          wedding_id?: string;
          whatsapp?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'suppliers_wedding_id_fkey';
            columns: ['wedding_id'];
            isOneToOne: false;
            referencedRelation: 'weddings';
            referencedColumns: ['id'];
          },
        ];
      };
      user_preferences: {
        Row: {
          collapsed: boolean;
          dark: boolean;
          id: string;
          selected_wedding_id: string | null;
          updated_at: string;
        };
        Insert: {
          collapsed?: boolean;
          dark?: boolean;
          id?: string;
          selected_wedding_id?: string | null;
          updated_at?: string;
        };
        Update: {
          collapsed?: boolean;
          dark?: boolean;
          id?: string;
          selected_wedding_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_preferences_selected_wedding_id_fkey';
            columns: ['selected_wedding_id'];
            isOneToOne: false;
            referencedRelation: 'weddings';
            referencedColumns: ['id'];
          },
        ];
      };
      weddings: {
        Row: {
          archived: boolean;
          bride_name: string;
          capacity: number;
          ceremony_address: string;
          ceremony_description: string;
          ceremony_time: string | null;
          ceremony_type: string;
          ceremony_venue: string;
          city: string;
          color_palette: string[];
          colors: string;
          created_at: string;
          estimated_guests: number;
          groom_name: string;
          id: string;
          initial_budget_cents: number;
          name: string;
          notes: string;
          owner_id: string;
          photo_path: string | null;
          reception_address: string;
          reception_time: string | null;
          reception_venue: string;
          state: string;
          style: string;
          temporary_seed: boolean;
          theme: string;
          updated_at: string;
          wedding_date: string | null;
        };
        Insert: {
          archived?: boolean;
          bride_name?: string;
          capacity?: number;
          ceremony_address?: string;
          ceremony_description?: string;
          ceremony_time?: string | null;
          ceremony_type?: string;
          ceremony_venue?: string;
          city?: string;
          color_palette?: string[];
          colors?: string;
          created_at?: string;
          estimated_guests?: number;
          groom_name?: string;
          id?: string;
          initial_budget_cents?: number;
          name: string;
          notes?: string;
          owner_id?: string;
          photo_path?: string | null;
          reception_address?: string;
          reception_time?: string | null;
          reception_venue?: string;
          state?: string;
          style?: string;
          temporary_seed?: boolean;
          theme?: string;
          updated_at?: string;
          wedding_date?: string | null;
        };
        Update: {
          archived?: boolean;
          bride_name?: string;
          capacity?: number;
          ceremony_address?: string;
          ceremony_description?: string;
          ceremony_time?: string | null;
          ceremony_type?: string;
          ceremony_venue?: string;
          city?: string;
          color_palette?: string[];
          colors?: string;
          created_at?: string;
          estimated_guests?: number;
          groom_name?: string;
          id?: string;
          initial_budget_cents?: number;
          name?: string;
          notes?: string;
          owner_id?: string;
          photo_path?: string | null;
          reception_address?: string;
          reception_time?: string | null;
          reception_venue?: string;
          state?: string;
          style?: string;
          temporary_seed?: boolean;
          theme?: string;
          updated_at?: string;
          wedding_date?: string | null;
        };
        Relationships: [];
      };
      whatsapp_queues: {
        Row: {
          queue: Json;
          updated_at: string;
          wedding_id: string;
        };
        Insert: {
          queue: Json;
          updated_at?: string;
          wedding_id: string;
        };
        Update: {
          queue?: Json;
          updated_at?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsapp_queues_wedding_id_fkey';
            columns: ['wedding_id'];
            isOneToOne: true;
            referencedRelation: 'weddings';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
