-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR NOT NULL,
  session_id VARCHAR UNIQUE NOT NULL,
  title VARCHAR DEFAULT 'New Chat',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  message_count INTEGER DEFAULT 0
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL,
  message_type VARCHAR CHECK (message_type IN ('text', 'audio')),
  content TEXT,
  sender VARCHAR CHECK (sender IN ('user', 'ai')),
  timestamp TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON chat_messages(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies (Note: These are permissive for now - tighten in production)
CREATE POLICY "Users can view their own sessions" ON chat_sessions
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own sessions" ON chat_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own sessions" ON chat_sessions
  FOR UPDATE USING (true);

CREATE POLICY "Users can view their own messages" ON chat_messages
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own messages" ON chat_messages
  FOR INSERT WITH CHECK (true);
