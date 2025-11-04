import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yiarrshhxltesgoehqse.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpYXJyc2hoeGx0ZXNnb2VocXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY1NjIzNCwiZXhwIjoyMDY0MjMyMjM0fQ.-ycD96zzx36rzH92Fu-h1IWF7oxL2WMjeTDmH_fu7L8';

export const supabase = createClient(supabaseUrl, supabaseKey);
