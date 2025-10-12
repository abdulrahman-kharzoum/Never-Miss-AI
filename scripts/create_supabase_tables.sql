-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  session_id TEXT UNIQUE NOT NULL,
  title TEXT DEFAULT 'New Conversation',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  message_count INTEGER DEFAULT 0
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('text', 'audio')),
  content TEXT,
  audio_data BYTEA,
  sender TEXT CHECK (sender IN ('user', 'ai')),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp ASC);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL,
  theme TEXT CHECK (theme IN ('light', 'dark')) DEFAULT 'light',
  firefly_api_key TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies to allow users to access only their own data
CREATE POLICY "Users can view their own sessions" ON chat_sessions
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own sessions" ON chat_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own sessions" ON chat_sessions
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own sessions" ON chat_sessions
  FOR DELETE USING (true);

CREATE POLICY "Users can view their own messages" ON chat_messages
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own messages" ON chat_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own settings" ON user_settings
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own settings" ON user_settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own settings" ON user_settings
  FOR UPDATE USING (true);