import { createClient } from '@supabase/supabase-js';

// Project ID extracted from the JWT provided: eepwojheiwvjedjrglpl
const supabaseUrl = 'https://eepwojheiwvjedjrglpl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcHdvamhlaXd2amVkanJnbHBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MDM0NTcsImV4cCI6MjA4MTM3OTQ1N30.AmDwNWGFRJhK3gdCNhzZxEkvsXrounSrtqyGNMjGslI';

export const supabase = createClient(supabaseUrl, supabaseKey);