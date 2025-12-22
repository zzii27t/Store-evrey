-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    username VARCHAR(255),
    email VARCHAR(255), -- NULL allowed initially, will be filled when user provides email
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    payment_amount INTEGER NOT NULL DEFAULT 1,
    payment_currency VARCHAR(10) DEFAULT 'XTR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fix: Ensure email column allows NULL (for initial payment record)
-- This is safe to run even if the table already exists
ALTER TABLE subscriptions 
ALTER COLUMN email DROP NOT NULL;

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON subscriptions(created_at DESC);
