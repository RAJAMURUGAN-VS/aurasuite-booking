-- Add persistent timer fields to current_state table
-- Run this in your Supabase SQL editor

-- Add timer_started_at column to track when timer actually started
ALTER TABLE current_state 
ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ;

-- Add timer_duration_minutes to store the original timer duration
ALTER TABLE current_state 
ADD COLUMN IF NOT EXISTS timer_duration_minutes INTEGER;

-- Add appointment_id to link current state to specific appointment
ALTER TABLE current_state 
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id);

-- Update existing row
UPDATE current_state 
SET timer_started_at = NULL, timer_duration_minutes = NULL, appointment_id = NULL
WHERE id = 1;

-- The persistent timer system will work as follows:
-- 1. When barber accepts appointment, appointment_id is set but timer doesn't start
-- 2. When barber clicks "Start Service", timer_started_at is set with current timestamp
-- 3. Timer calculates remaining time: timer_duration_minutes - (now - timer_started_at)
-- 4. Timer persists across page refreshes using stored timestamp
-- 5. When service finishes, all timer fields are cleared

