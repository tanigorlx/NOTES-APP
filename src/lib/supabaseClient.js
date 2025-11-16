// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xyxxvzuvfrxbvxifvzzk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5eHh2enV2ZnJ4YnZ4aWZ2enprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNzExMDEsImV4cCI6MjA3ODg0NzEwMX0.1NqTFeY8ohkBrPIwqc7iGSugTaqoGwnhI0S0BxAnR_U';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
