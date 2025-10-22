-- Complete database schema update for persistent timer system
-- Run this in your Supabase SQL editor

-- Step 1: Add missing columns to current_state table
ALTER TABLE current_state 
ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ;

ALTER TABLE current_state 
ADD COLUMN IF NOT EXISTS timer_duration_minutes INTEGER;

ALTER TABLE current_state 
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id);

-- Step 2: Update existing row to have null values for new columns
UPDATE current_state 
SET 
  timer_started_at = NULL, 
  timer_duration_minutes = NULL, 
  appointment_id = NULL
WHERE id = 1;

-- Step 3: Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'current_state' 
ORDER BY ordinal_position;

-- Step 4: Check current data
SELECT * FROM current_state WHERE id = 1;

-- The persistent timer system will work as follows:
-- 1. When barber accepts appointment, appointment_id is set but timer doesn't start
-- 2. When barber clicks "Start Service", timer_started_at is set with current timestamp
-- 3. Timer calculates remaining time: timer_duration_minutes - (now - timer_started_at)
-- 4. Timer persists across page refreshes using stored timestamp
-- 5. When service finishes, all timer fields are cleared

