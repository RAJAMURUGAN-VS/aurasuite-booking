import { createClient } from '@supabase/supabase-js';

// Read from env (Vite). Avoid process.env in browser builds.
const envUrl = import.meta?.env?.VITE_SUPABASE_URL;
const envAnon = import.meta?.env?.VITE_SUPABASE_ANON_KEY;

// Fallbacks (you can override with .env.local). Using the project ref you shared.
const FALLBACK_URL = 'https://ccjbpqnaaaztdscgwpyk.supabase.co';
const FALLBACK_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjamJwcW5hYWF6dGRzY2d3cHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3OTU4NzMsImV4cCI6MjA3NjM3MTg3M30.YWXvM3ZzzvhoYFxmZgOlkkwojwMndMcuig7eSyLS5vA';

const SUPABASE_URL = envUrl || FALLBACK_URL;
const SUPABASE_ANON_KEY = envAnon || FALLBACK_ANON;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});


