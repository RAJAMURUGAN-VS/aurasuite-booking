-- Add token number system to appointments table
-- Run this in your Supabase SQL editor

-- Add token_number column to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS token_number INTEGER;

-- Add queue_position column to track position in queue
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS queue_position INTEGER;

-- Create a function to generate token numbers
CREATE OR REPLACE FUNCTION generate_token_number()
RETURNS INTEGER AS $$
DECLARE
    next_token INTEGER;
BEGIN
    SELECT COALESCE(MAX(token_number), 0) + 1 
    INTO next_token 
    FROM appointments 
    WHERE DATE(created_at) = CURRENT_DATE;
    
    RETURN next_token;
END;
$$ LANGUAGE plpgsql;

-- Update existing appointments with token numbers (optional)
-- UPDATE appointments SET token_number = generate_token_number() WHERE token_number IS NULL;

-- The queue system will work as follows:
-- 1. When appointment is created, it gets a token number
-- 2. When barber accepts, it moves to current serving (not queue)
-- 3. Accepted appointments stay visible with token numbers
-- 4. When barber clicks Next, next accepted appointment moves to current serving

