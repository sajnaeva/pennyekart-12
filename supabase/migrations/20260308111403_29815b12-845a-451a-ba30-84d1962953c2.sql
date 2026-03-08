-- Add is_blocked column for customer blocking functionality
ALTER TABLE public.profiles
ADD COLUMN is_blocked boolean NOT NULL DEFAULT false;