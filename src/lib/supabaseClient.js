import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xqmuibbubefercwphzsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxbXVpYmJ1YmVmZXJjd3BoenN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MDkxODYsImV4cCI6MjA3NjM4NTE4Nn0.th978PIUxf4Ab2oh1kbkmw5yy353MvV85qddpRLN5Hk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
