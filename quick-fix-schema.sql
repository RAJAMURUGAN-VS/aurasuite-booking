-- Quick fix: Add only the started_at column to current_state table
-- Run this in your Supabase SQL editor

-- Add started_at column to current_state table
ALTER TABLE current_state 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Update the existing row to have null started_at
UPDATE current_state 
SET started_at = NULL 
WHERE id = 1;

-- The timer system will now work as follows:
-- 1. When barber accepts appointment, customer info is set but timer doesn't start
-- 2. When barber clicks "Start Service", started_at is set and timer begins
-- 3. Timer only runs when started_at is not null
-- 4. When service finishes, started_at is cleared

