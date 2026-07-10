// Booking engine domain types — DB2 shared project (public schema)

export type BookingState = "pending" | "confirmed" | "active" | "completed" | "cancelled" | "no_show";

export const ALLOWED_TRANSITIONS: Record<BookingState, BookingState[]> = {
  pending:   ["confirmed", "cancelled"],
  confirmed: ["active", "cancelled", "no_show"],
  active:    ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  no_show:   [],
};

export interface Resource {
  id: string;
  site_id: string;
  type: string;
  name: string | null;
  description: string | null;
  attributes: Record<string, unknown>;
  base_price_cents: number;
  currency: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  site_id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  notes: string | null;
  total_bookings: number;
  lifetime_value_cents: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  site_id: string;
  resource_id: string;
  customer_id: string | null;
  reference: string;
  start_at: string;
  end_at: string;
  state: BookingState;
  guest_count: number;
  subtotal_cents: number;
  fees_cents: number;
  taxes_cents: number;
  total_cents: number;
  paid_cents: number;
  currency: string;
  payment_provider: string | null;
  payment_ref: string | null;
  fields: Record<string, unknown>;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

export interface CreateBookingInput {
  resource_id: string;
  start_at: string;
  end_at: string;
  guest_count?: number;
  total_cents: number;
  currency: string;
  payment_provider?: string;
  payment_ref?: string;
  customer: {
    email?: string;
    phone?: string;
    full_name?: string;
  };
  fields?: Record<string, unknown>;
}
