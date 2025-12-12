
import { createClient } from '@supabase/supabase-js';

// Configuration pour le projet: derbemxykhirylcmogtb
const supabaseUrl = 'https://derbemxykhirylcmogtb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlcmJlbXh5a2hpcnlsY21vZ3RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NjIwOTEsImV4cCI6MjA4MTEzODA5MX0.j96J7l_E9rpoOjxnzv62FxxzAjHP_SV6D6_IBb0GoeQ';

// Création du client
export const supabase = createClient(supabaseUrl, supabaseKey);
