import requests
import json

SUPABASE_URL = "https://yiarrshhxltesgoehqse.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpYXJyc2hoeGx0ZXNnb2VocXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY1NjIzNCwiZXhwIjoyMDY0MjMyMjM0fQ.-ycD96zzx36rzH92Fu-h1IWF7oxL2WMjeTDmH_fu7L8"

# SQL to create tables
sql_query = """
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  session_id TEXT UNIQUE NOT NULL,
  title TEXT DEFAULT 'New Conversation',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  message_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp ASC);

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL,
  theme TEXT CHECK (theme IN ('light', 'dark')) DEFAULT 'light',
  firefly_api_key TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
"""

headers = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json"
}

try:
    print("🔌 Connecting to Supabase REST API...")
    
    # Try to execute the SQL via the REST API
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        headers=headers,
        json={"query": sql_query}
    )
    
    if response.status_code == 200:
        print("✅ Tables created successfully!")
        print(response.json())
    else:
        print(f"⚠️ Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Fallback: Create tables via individual REST API calls
        print("\n📝 Creating tables manually via REST API...")
        
        # Note: We'll need to use Supabase SQL Editor or pgAdmin for this
        print("❌ Cannot create tables via REST API directly")
        print("\n💡 Manual steps required:")
        print("1. Go to: https://yiarrshhxltesgoehqse.supabase.co")
        print("2. Click 'SQL Editor' in left menu")
        print("3. Copy and paste the SQL from /app/scripts/create_supabase_tables.sql")
        print("4. Click 'Run'")
        
except Exception as e:
    print(f"❌ Error: {e}")
