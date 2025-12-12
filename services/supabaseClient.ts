import { createClient } from '@supabase/supabase-js';

// Configuration explicite avec les clés fournies
const supabaseUrl = 'https://twhvuwszxovfexhthukg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3aHZ1d3N6eG92ZmV4aHRodWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNTUwMTIsImV4cCI6MjA4MDYzMTAxMn0.g99xecg2R6haf_zMbUZZQ-WquXDT7Tk-wcHFJANuQ2Q';

// Création du client
export const supabase = createClient(supabaseUrl, supabaseKey);