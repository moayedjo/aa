-- Add options column to products table
-- Run this if you already have a products table without the options column
alter table public.products
  add column if not exists options jsonb default '[]'::jsonb;
