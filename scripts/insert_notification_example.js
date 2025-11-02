/*
  Example script to INSERT a notification into the `notifications` table in Supabase.
  This script uses the Supabase service role key because inserts for other users should
  be performed server-side. Do NOT use the anon/public key for privileged inserts.

  Usage:
    - Create a `.env` file (or add to `backend/.env`) with SUPABASE_URL and SUPABASE_SERVICE_ROLE
    - Run: node scripts/insert_notification_example.js

  Note: This is intentionally minimal. In production call Supabase from your backend using
  the service role secret, or use RLS policies and edge functions as appropriate.
*/

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yiarrshhxltesgoehqse.supabase.co';
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_KEY;

if (!SUPABASE_SERVICE_ROLE) {
  console.error('Missing SUPABASE_SERVICE_ROLE environment variable. Set it and retry.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function main() {
  const payload = {
    user_id: 'PdO6B3E0oOcQlYIcvC5vn1Naflz2',
    session_id: 'rag_1761600323807_ohl1nq4e',
    status: 'pending',
    message: 'File processing has started for this session.',
    data: { redirectUrl: null }
  };

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([payload]);

    if (error) {
      console.error('Insert error:', error);
      process.exit(1);
    }

    console.log('Inserted notification:', data);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

main();
