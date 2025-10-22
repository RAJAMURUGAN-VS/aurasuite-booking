-- Test script to verify current_state table and data
-- Run this in your Supabase SQL editor to debug the Start Service button issue

-- 1. Check if current_state table exists and its structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'current_state' 
ORDER BY ordinal_position;

-- 2. Check current data in current_state table
SELECT * FROM current_state;

-- 3. Check if appointments table has data
SELECT id, customer_name, status, barber_id 
FROM appointments 
WHERE status IN ('pending', 'accepted') 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Test inserting appointment_id into current_state (if it exists)
-- This will help identify if the column exists
UPDATE current_state 
SET appointment_id = (
  SELECT id FROM appointments 
  WHERE status = 'accepted' 
  LIMIT 1
)
WHERE id = 1;

-- 5. Check the result
SELECT * FROM current_state WHERE id = 1;

