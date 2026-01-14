// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qeikodkvdzczerweonyb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlaWtvZGt2ZHpjemVyd2VvbnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxOTIyNTEsImV4cCI6MjA4Mzc2ODI1MX0.GdJ7K3rikBfr-sJuZghn5WSYu_mVdQfQHZj_noGZJs4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
