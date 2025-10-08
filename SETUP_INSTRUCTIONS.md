# Phase 1 Setup Instructions

## ✅ What's Been Done

1. **Supabase Integration Added**
   - Installed @supabase/supabase-js client
   - Created utility file for Supabase connection
   - Added Supabase credentials

2. **Chat Interface Created**
   - Simple chat UI with sidebar for sessions
   - Message list with user/AI differentiation
   - Text input with send functionality
   - Integration with n8n webhook (https://n8n.zentraid.com/webhook/ConnectAI_KH_message)

3. **Authentication Updated**
   - Simplified Google OAuth login
   - Chat interface shown after login
   - User info displayed in sidebar

4. **Code Pushed to GitHub** ✅
   - Repository: https://github.com/abdulrahman-kharzoum/web-google-auth-test.git
   - All changes committed and pushed

---

## 🔴 IMPORTANT: You Need to Do This!

### Create Supabase Tables

You need to run the SQL script to create the database tables. Follow these steps:

1. **Go to Supabase SQL Editor:**
   👉 https://supabase.com/dashboard/project/yiarrshhxltesgoehqse/editor

2. **Copy and paste this SQL:**

```sql
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
```

3. **Click "Run" or press Ctrl+Enter**

4. **Verify tables were created:**
   - Go to Table Editor in Supabase
   - You should see `chat_sessions` and `chat_messages` tables

---

## 🧪 Testing the Application

1. **Open the app:** http://localhost:3000 (or your preview URL)

2. **Login with Google**

3. **You should see:**
   - Chat interface with sidebar
   - "New Chat" button at the top
   - Empty message area in the center
   - Text input at the bottom

4. **Test messaging:**
   - Type a message and press Enter or click Send
   - Your message should appear on the right (blue bubble)
   - AI response should appear on the left (gray bubble)

---

## 📝 What's Working

- ✅ Google OAuth authentication
- ✅ Create new chat sessions
- ✅ Send text messages
- ✅ Messages saved to Supabase
- ✅ Integration with n8n webhook
- ✅ Real-time message display
- ✅ Session list in sidebar

---

## 🚀 Next Phases (Future)

**Phase 2:** Voice recording + audio messages
**Phase 3:** Dashboard, settings, theme system
**Phase 4:** Polish, animations, mobile optimization

---

## 📁 New Files Created

```
/app/frontend/src/
  ├── utils/supabaseClient.js     # Supabase connection
  ├── components/ChatInterface.js  # Main chat UI
  └── App.js                       # Updated with chat integration

/app/scripts/
  ├── setup_supabase_tables.sql   # SQL script
  └── setup_supabase.py           # Setup helper
```

---

## 🆘 Troubleshooting

**If you get errors about tables not existing:**
- Make sure you ran the SQL script in Supabase (see above)

**If messages aren't sending:**
- Check browser console for errors
- Verify your n8n webhook is active: https://n8n.zentraid.com/webhook/ConnectAI_KH_message
- Check that the webhook is returning JSON with an "output" field

**If frontend won't load:**
- Check logs: `tail -100 /var/log/supervisor/frontend.err.log`
- Restart: `sudo supervisorctl restart frontend`

---

## ✅ Current Status

✅ Phase 1 Complete - Basic Chat Interface Working!
✅ Pushed to GitHub
⏳ Waiting for you to create Supabase tables
