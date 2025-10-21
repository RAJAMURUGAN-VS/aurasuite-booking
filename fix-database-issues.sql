-- Fix database issues
-- Run this in your Supabase SQL Editor

-- 1. Add missing seats
INSERT INTO seats (id, label, state, expires_at, barber_id, paused) VALUES
('S2', 'Seat 2', 'available', null, 'B2', false),
('S3', 'Seat 3', 'available', null, 'B3', false),
('S4', 'Seat 4', 'available', null, 'B4', false),
('S5', 'Seat 5', 'available', null, 'B5', false),
('S6', 'Seat 6', 'available', null, 'B6', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Fix RLS policies for appointments table
DROP POLICY IF EXISTS "Enable read access for all users" ON appointments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON appointments;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON appointments;

-- Create proper RLS policies for appointments
CREATE POLICY "Enable read access for all users" ON appointments
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON appointments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON appointments
    FOR UPDATE USING (true);

-- 3. Ensure appointments table has all required columns
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS barber_id TEXT REFERENCES barbers(id);

-- 4. Create current_state table if it doesn't exist
CREATE TABLE IF NOT EXISTS current_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    customer_name TEXT,
    approx_time_minutes INTEGER,
    seat_id TEXT,
    barber_id TEXT,
    paused BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default current_state if it doesn't exist
INSERT INTO current_state (id, customer_name, approx_time_minutes, seat_id, barber_id, paused)
VALUES (1, null, null, null, null, false)
ON CONFLICT (id) DO NOTHING;

-- 5. Enable RLS on current_state
ALTER TABLE current_state ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for current_state
CREATE POLICY "Enable all access for current_state" ON current_state
    FOR ALL USING (true);

-- 6. Update admin user metadata (run this after creating the admin user)
-- You'll need to do this manually in Supabase Dashboard > Authentication > Users
-- Find your admin user and update their metadata to:
-- {
--   "name": "Admin User",
--   "role": "admin"
-- }
