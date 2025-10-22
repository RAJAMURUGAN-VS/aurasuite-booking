-- Setup script for dynamic seat/barber system
-- Run this in your Supabase SQL editor

-- Ensure seats table has the correct structure
CREATE TABLE IF NOT EXISTS seats (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    barber_id TEXT REFERENCES barbers(id) ON DELETE CASCADE,
    state TEXT DEFAULT 'available' CHECK (state IN ('available', 'booked', 'reserved')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure barbers table has the correct structure
CREATE TABLE IF NOT EXISTS barbers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    experience_years INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    services TEXT[] DEFAULT ARRAY['Haircut', 'Styling'],
    reviews JSONB DEFAULT '[]'::jsonb,
    photo TEXT DEFAULT 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;

-- Create policies for seats table
DROP POLICY IF EXISTS "Allow all operations on seats" ON seats;
CREATE POLICY "Allow all operations on seats" ON seats
    FOR ALL USING (true) WITH CHECK (true);

-- Create policies for barbers table  
DROP POLICY IF EXISTS "Allow all operations on barbers" ON barbers;
CREATE POLICY "Allow all operations on barbers" ON barbers
    FOR ALL USING (true) WITH CHECK (true);

-- Clean up any existing seats (optional - comment out if you want to keep existing data)
-- DELETE FROM seats;

-- Clean up any existing barbers (optional - comment out if you want to keep existing data)
-- DELETE FROM barbers;

-- The system will now work as follows:
-- 1. Admin adds barbers through the admin dashboard
-- 2. Each barber automatically gets a seat created
-- 3. Users can login and book seats as soon as barbers are added
-- 4. No maintenance mode - users can access immediately
