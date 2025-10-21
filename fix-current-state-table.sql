-- Fix current_state table issues
-- Run this in your Supabase SQL Editor

-- 1. First, let's check if the table exists and drop it if it has wrong structure
DROP TABLE IF EXISTS current_state;

-- 2. Create current_state table with proper structure
CREATE TABLE current_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    customer_name TEXT,
    approx_time_minutes INTEGER,
    seat_id TEXT,
    barber_id TEXT,
    paused BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Insert default current_state
INSERT INTO current_state (id, customer_name, approx_time_minutes, seat_id, barber_id, paused)
VALUES (1, null, null, null, null, false);

-- 4. Enable RLS on current_state
ALTER TABLE current_state ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for current_state
CREATE POLICY "Enable all access for current_state" ON current_state
    FOR ALL USING (true);

-- 6. Add missing seats
INSERT INTO seats (id, label, state, expires_at, barber_id, paused) VALUES
('S2', 'Seat 2', 'available', null, 'B2', false),
('S3', 'Seat 3', 'available', null, 'B3', false),
('S4', 'Seat 4', 'available', null, 'B4', false),
('S5', 'Seat 5', 'available', null, 'B5', false),
('S6', 'Seat 6', 'available', null, 'B6', false)
ON CONFLICT (id) DO NOTHING;

-- 7. Fix appointments table permissions  
DROP POLICY IF EXISTS "Enable read access for all users" ON appointments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON appointments;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON appointments;

CREATE POLICY "Enable all access for appointments" ON appointments
    FOR ALL USING (true);

-- 8. Add missing columns to appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS barber_id TEXT REFERENCES barbers(id);

-- 9. Fix barbers table permissions
DROP POLICY IF EXISTS "Enable all access for barbers" ON barbers;
CREATE POLICY "Enable all access for barbers" ON barbers
    FOR ALL USING (true);
