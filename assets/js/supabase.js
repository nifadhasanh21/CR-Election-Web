import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://kystcovkdmpqsfihbsbf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5c3Rjb3ZrZG1wcXNmaWhic2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NzYwODIsImV4cCI6MjEwNTE1MjA4Mn0.43oIYFkOXN9v2AyAUL9PVDh-hL7u75t_wKlyvvd_iqo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);