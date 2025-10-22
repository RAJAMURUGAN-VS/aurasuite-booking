-- Update current_state table to include started_at and timer_running fields
-- Run this in your Supabase SQL editor

-- Add started_at column to current_state table
ALTER TABLE current_state 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Add timer_running column to current_state table
ALTER TABLE current_state 
ADD COLUMN IF NOT EXISTS timer_running BOOLEAN DEFAULT false;

-- Update the existing row to have null started_at and false timer_running
UPDATE current_state 
SET started_at = NULL, timer_running = false
WHERE id = 1;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_current_state_id ON current_state(id);

-- Ensure RLS policies are correct
DROP POLICY IF EXISTS "Allow all operations on current_state" ON current_state;
CREATE POLICY "Allow all operations on current_state" ON current_state
    FOR ALL USING (true) WITH CHECK (true);

-- The timer system will now work as follows:
-- 1. When barber accepts appointment, timer_running = false (no timer starts)
-- 2. When barber clicks "Start Service", timer_running = true and started_at is set
-- 3. Timer calculates remaining time based on started_at + approx_time_minutes
-- 4. Real-time updates sync across all portals (barber, user, seat grid)
-- 5. When service finishes, timer_running = false and started_at is cleared
