# 🚀 Phase 2: Voice Recording, Dashboard, Settings & Navigation Tabs

## ✅ Phase 1 Complete
- Token auto-refresh ✅
- Beautiful dark blue UI ✅
- N8N webhook integration ✅
- Timeout & error handling ✅

---

## 📋 Phase 2 Features

### 1. **Voice Recording System** 🎤
**Components to Build:**
- `VoiceRecorder.jsx` - Main recording component
- `AudioPlayer.jsx` - Playback component with controls
- `WaveformAnimation.jsx` - Visual feedback during recording

**Features:**
- Click-to-record button in chat input
- Real-time waveform animation
- Recording timer (max 2 minutes)
- Preview before sending
- Cancel/Redo recording
- Send audio to N8N webhook
- Store audio in Supabase (BYTEA)

**Technical:**
- Use MediaRecorder API
- Convert to MP3 (128kbps)
- Base64 encode for transmission
- Store as binary in Supabase

---

### 2. **Navigation Tabs** 🧭
**Tabs:**
1. **💬 Chat** (current)
2. **📊 Dashboard** (new)
3. **⚙️ Settings** (new)

**Implementation:**
- Tab bar component (sticky top)
- Route-like behavior (state-based, no react-router needed)
- Active tab indicator (blue gradient underline)
- Smooth transitions between tabs
- Icons + labels

---

### 3. **Dashboard Tab** 📊
**Widgets to Display:**

#### Statistics Cards:
- 💬 Total Conversations
- ✉️ Total Messages
- 📝 Text Messages Count
- 🎤 Voice Messages Count

#### Recent Activity:
- Last 5 conversations
- Click to open in Chat tab

#### Charts (Optional - Phase 2.5):
- Messages per day (last 7 days)
- Text vs Voice ratio

**Data Source:** Supabase queries

---

### 4. **Settings Tab** ⚙️
**Sections:**

#### Appearance:
- 🌓 **Theme Switcher**: Light / Dark mode
  - Toggle button
  - Persist in Supabase `user_settings`
  - Apply dark classes globally

#### Integrations:
- 🔥 **Fireflies API Key** (encrypted storage)
  - Input field (password type)
  - Save button
  - Encryption before storage

#### Account:
- 👤 User profile display
- 📧 Email
- 🚪 Logout button

---

### 5. **Theme System (Light/Dark)** 🌓
**Implementation:**
- ThemeContext provider
- `theme` state: 'light' | 'dark'
- CSS classes: `dark:bg-gray-900`, etc.
- Tailwind dark mode configuration
- Store in Supabase on toggle
- Load on app start

**Dark Mode Colors:**
- Background: Gray-900
- Cards: Gray-800
- Text: White/Gray-100
- Borders: Gray-700
- Keep blue gradient buttons

---

## 📁 Files to Create

### New Components:
1. `/app/frontend/src/components/VoiceRecorder.jsx`
2. `/app/frontend/src/components/AudioPlayer.jsx`
3. `/app/frontend/src/components/WaveformAnimation.jsx`
4. `/app/frontend/src/components/NavigationTabs.jsx`
5. `/app/frontend/src/components/DashboardTab.jsx`
6. `/app/frontend/src/components/SettingsTab.jsx`

### New Contexts:
7. `/app/frontend/src/context/ThemeContext.jsx`

### Modified Files:
- `/app/frontend/src/App.js` - Add ThemeProvider wrapper
- `/app/frontend/src/components/ChatInterface.js` - Add VoiceRecorder
- `/app/frontend/tailwind.config.js` - Enable dark mode

---

## 🎯 Implementation Order

### Step 1: Navigation Tabs (30 min)
- Create NavigationTabs component
- Add to ChatInterface
- State management for active tab

### Step 2: Dashboard Tab (45 min)
- Fetch stats from Supabase
- Create statistics cards
- Recent activity list
- Responsive grid layout

### Step 3: Settings Tab (30 min)
- User profile section
- Theme switcher (basic)
- Fireflies API key input
- Logout button

### Step 4: Theme System (45 min)
- ThemeContext setup
- Dark mode CSS
- Persist in Supabase
- Apply throughout app

### Step 5: Voice Recording (1.5 hours)
- VoiceRecorder component
- MediaRecorder setup
- Waveform animation
- AudioPlayer component
- Integrate in chat

### Step 6: Audio Storage & Webhook (45 min)
- Send audio to N8N
- Store in Supabase
- Display in chat
- Playback controls

---

## 🗄️ Supabase Schema Updates

### `chat_messages` table:
Already has `audio_data BYTEA` ✅

### `user_settings` table:
```sql
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL,
  theme TEXT CHECK (theme IN ('light', 'dark')) DEFAULT 'light',
  firefly_api_key TEXT, -- Encrypted
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎨 Design Specifications

### Dark Mode Palette:
- Background: `#0f172a` (slate-900)
- Cards: `#1e293b` (slate-800)
- Borders: `#334155` (slate-700)
- Text: `#f1f5f9` (slate-100)
- Accent: Blue gradient (same as light)

### Voice Recording UI:
- Microphone button: Blue gradient circle
- Recording: Red pulsing circle + waveform
- Timer: White text on red background
- Controls: White buttons with blue gradient on hover

---

## ✅ Success Criteria

**Phase 2 Complete When:**
- ✅ Can navigate between Chat, Dashboard, Settings
- ✅ Dashboard shows accurate statistics
- ✅ Settings allows theme toggle (light/dark)
- ✅ Dark mode works throughout app
- ✅ Voice recording works (record, preview, send)
- ✅ Audio messages appear in chat
- ✅ Audio playback works
- ✅ All data persists in Supabase

---

## 🚀 Let's Start!

**Ready to implement Phase 2?**
Say "Yes, start Phase 2!" and I'll begin with Navigation Tabs first! 🎉