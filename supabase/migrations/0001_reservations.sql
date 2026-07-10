-- Customer orders + reservations for the cart and booking drawer flows.
-- Drop this into supabase/migrations/{timestamp}_customer_transactions.sql
--
-- Service-role writes happen from app/api/orders/route.ts and
-- app/api/reservations/route.ts. Read access is admin-only — these tables
-- contain customer PII, never expose them via anon key.

create extension if not exists "pgcrypto";

-- ─── customer_orders ───────────────────────────────────────────────
create table if not exists public.customer_orders (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null,
  status          text not null default 'placed'
                    check (status in ('placed', 'paid', 'pending', 'fulfilled', 'cancelled')),
  currency        text not null default 'USD',
  items           jsonb not null,
  customer        jsonb not null,
  subtotal_cents  integer not null default 0,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists customer_orders_slug_created_at_idx
  on public.customer_orders (slug, created_at desc);

create index if not exists customer_orders_email_idx
  on public.customer_orders ((customer->>'email'));

-- ─── customer_reservations ─────────────────────────────────────────
create table if not exists public.customer_reservations (
  id             uuid primary key default gen_random_uuid(),
  status         text not null default 'placed'
                   check (status in ('placed', 'confirmed', 'pending', 'cancelled', 'completed')),
  room_slug      text not null,
  check_in       date not null,
  check_out      date not null,
  guests         integer not null default 1,
  full_name      text not null,
  email          text not null,
  phone          text,
  total_cents    integer not null default 0,
  deposit_cents  integer not null default 0,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists customer_reservations_check_in_idx
  on public.customer_reservations (check_in);

create index if not exists customer_reservations_email_idx
  on public.customer_reservations (email);

-- ─── RLS — service-role bypass; no anon access ─────────────────────
alter table public.customer_orders        enable row level security;
alter table public.customer_reservations  enable row level security;

-- No policies granted to anon/authenticated. All writes go through the
-- service-role key inside the Next.js route handlers; reads are admin-only.
