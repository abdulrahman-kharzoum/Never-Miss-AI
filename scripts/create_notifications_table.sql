-- Create a notifications table for real-time file-processing and session notifications
-- Run this in your Supabase SQL editor or psql against the project's database.

-- Enable pgcrypto extension if not present (for gen_random_uuid)
-- If using psql, uncomment the next line:
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text,
  session_id text,
  status text,
  message text,
  data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_session_id ON public.notifications (session_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

-- Row Level Security (RLS) suggestions
-- NOTE: Adjust policies to your security model. The examples below assume
-- using Supabase Auth and that `auth.uid()` returns the user's id.

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT notifications that belong to them
CREATE POLICY "Allow select for owner" ON public.notifications
  FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());

-- Allow authenticated users to INSERT notifications for themselves (optional)
CREATE POLICY "Allow insert for owner" ON public.notifications
  FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- It's typical to use a server (service_role) key to INSERT notifications for users
-- (e.g., from a backend processing job). Do NOT use the anon key for privileged inserts.

-- Example insert (replace values):
-- INSERT INTO public.notifications (user_id, session_id, status, message, data)
-- VALUES ('PdO6B3E0oOcQlYIcvC5vn1Naflz2', 'rag_1761600323807_ohl1nq4e', 'pending', 'File processing has started for this session.', '{"redirectUrl": null}');

-- Helpful view for debugging (optional)
CREATE OR REPLACE VIEW public.notifications_recent AS
SELECT id, user_id, session_id, status, message, data, created_at
FROM public.notifications
ORDER BY created_at DESC
LIMIT 200;

-- End of file