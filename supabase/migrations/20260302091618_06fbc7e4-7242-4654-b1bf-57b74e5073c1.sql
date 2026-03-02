
-- Add wallet_points column to products (admin products)
ALTER TABLE public.products
ADD COLUMN wallet_points numeric NOT NULL DEFAULT 0;

-- Add wallet_points column to seller_products
ALTER TABLE public.seller_products
ADD COLUMN wallet_points numeric NOT NULL DEFAULT 0;
