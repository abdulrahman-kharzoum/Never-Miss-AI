# NeverMiss AI - Your AI-Powered Productivity Assistant

**Never miss what matters most.** NeverMiss AI is an intelligent productivity platform that transforms how you manage your digital life through conversational AI. Get AI-powered assistance for planning your day, understanding university content, and creating study materials from your documents.

## 🎯 Key Features

### 📅 **Plan Your Day**
- AI-powered daily planning assistant
- Smart task organization and prioritization
- Natural conversation interface
- Voice interaction support
- Context-aware suggestions

### � **University Guide (DU-Guide)**
- Interactive AI assistant for Damascus University students
- Information about faculties, departments, and programs
- Academic guidance and course recommendations
- Admission requirements and procedures
- Campus navigation and resources

### 📚 **Study Guide Chat**
- Upload and analyze PDF, CSV, Excel, and other documents
- AI-powered document understanding
- Generate summaries from your files
- Create quizzes automatically from content
- Extract key insights and study notes
- RAG (Retrieval Augmented Generation) for accurate answers
- Real-time file processing with notifications

### 🎙️ **Voice Interaction**
- Voice recording and playback
- Audio responses from AI
- Natural conversation flow
- Hands-free productivity

### 📊 **Dashboard & Analytics**
- Track your conversations and sessions
- View recent activity
- Monitor study progress
- Quick access to all features

### 🎨 **Modern UI/UX**
- Dark/Light theme support
- Responsive design for all devices
- Smooth animations and transitions
- Intuitive tab-based navigation
- Mobile-friendly sidebar

## 🏗️ Architecture

```
Frontend (React + Firebase Auth) → Backend (FastAPI) → Supabase
                ↓
          Google OAuth
                ↓
         N8N AI Workflows → OpenAI/LLM
                ↓
         Socket.IO (Real-time Updates)
```

## 📁 Project Structure

```
nevermiss-ai/
├── backend/                 # FastAPI backend server
│   ├── server.py           # Main API server
│   ├── requirements.txt    # Python dependencies
│   └── README.md          # Backend documentation
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── ChatInterfaceNew.js  # Main chat interface
│   │   │   ├── StudyGuideTab.jsx    # File upload & RAG
│   │   │   ├── DashboardTab.jsx     # Analytics dashboard
│   │   │   ├── SettingsTab.jsx      # User settings
│   │   │   ├── AboutTab.jsx         # About page
│   │   │   └── ...
│   │   ├── context/       # React context providers
│   │   ├── utils/         # Utility functions
│   │   ├── firebase.js    # Firebase configuration
│   │   └── App.js         # Root component
│   ├── package.json       # Node dependencies
│   └── README.md         # Frontend documentation
├── scripts/               # Database & setup scripts
└── README.md             # This file
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **Firebase Account** (for authentication)
- **Supabase Account** (for database)
- **N8N Instance** (for AI workflows)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/abdulrahman-kharzoum/nevermiss-ai.git
cd nevermiss-ai
```

#### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Create .env file with your credentials
cp .env.example .env
# Edit .env with your configuration

# Run the backend server
python server.py
```

The backend will start on `http://localhost:8001`

#### 3. Frontend Setup
```bash
cd frontend
npm install

# Create .env file with your Firebase credentials
cp .env.example .env
# Edit .env with your Firebase configuration

# Run the frontend development server
npm start
```

The frontend will start on `http://localhost:3000`

### Environment Variables

#### Backend (.env)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
N8N_WEBHOOK_URL=your_n8n_chat_webhook
STUDY_GUIDE_WEBHOOK=your_n8n_study_guide_webhook
UNIVERSITY_GUIDE_WEBHOOK=your_n8n_university_guide_webhook
PORT=8001
```

#### Frontend (.env)
```env
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🔧 Configuration

### Backend Configuration (`/app/backend/.env`)
```env
MONGO_URL=mongodb://localhost:27017/
DATABASE_NAME=google_auth_db
API_SECRET_KEY=your-secret-key-change-this-in-production
N8N_API_KEY=n8n-secure-api-key-change-this
ENCRYPTION_KEY=your-encryption-key-32-chars-long
```

**⚠️ IMPORTANT:** Change these values in production!

### Frontend Configuration (`/app/frontend/.env`)
Already configured with your Firebase credentials:
- Firebase API Key: `AIzaSyBjNcwo_56CaFNds5QVAqerk-JDUUEuGIo`
- Project ID: `product-image-maker`

## 📡 API Endpoints

### 1. Store User Token
```http
POST /api/auth/store-token
Content-Type: application/json

{
  "userId": "user-uid",
  "email": "user@example.com",
  "displayName": "User Name",
  "photoURL": "https://...",
  "accessToken": "token",
  "refreshToken": "refresh-token",
  "expiresAt": "2024-01-01T00:00:00Z",
  "scopes": ["gmail", "calendar", "drive"]
}
```

### 2. Get User Token (for n8n)
```http
GET /api/auth/get-token/{user_id}
Authorization: Bearer n8n-secure-api-key-change-this
```

Response:
```json
{
  "userId": "user-uid",
  "email": "user@example.com",
  "displayName": "User Name",
  "accessToken": "decrypted-token",
  "expiresAt": "2024-01-01T00:00:00Z",
  "scopes": ["gmail", "calendar", "drive"]
}
```

### 3. Validate Token
```http
POST /api/auth/validate-token
Content-Type: application/json

{
  "userId": "user-uid"
}
```

### 4. List All Users (Admin)
```http
GET /api/auth/users
Authorization: Bearer n8n-secure-api-key-change-this
```

## 🔐 Google OAuth Scopes

The application requests the following Google API scopes:

- `userinfo.profile` - Basic profile information
- `userinfo.email` - Email address
- `gmail.readonly` - Read Gmail messages
- `gmail.modify` - Modify Gmail messages
- `calendar` - Full Calendar access
- `calendar.events` - Calendar events access
- `drive` - Full Drive access
- `drive.file` - Drive file access

## 🎨 Frontend Features

1. **Sign In with Google** - Click the button to authenticate
2. **User Profile Display** - Shows name, email, and photo
3. **Token Management** - View and copy access token
4. **n8n Integration Info** - Shows the API endpoint for workflows
5. **Granted Permissions** - Displays all granted scopes
6. **Sign Out** - Clear session and tokens

## 🔗 n8n Integration

### Step 1: Get User ID
1. Sign in with Google on the web page
2. Copy the User ID displayed in the profile section

### Step 2: Create n8n Workflow
1. Add an **HTTP Request** node
2. Configure:
   - Method: `GET`
   - URL: `http://localhost:8001/api/auth/get-token/{USER_ID}`
   - Authentication: Header Auth
   - Header Name: `Authorization`
   - Header Value: `Bearer n8n-secure-api-key-change-this`

### Step 3: Use Token in Google API Calls
1. Add another **HTTP Request** node
2. Use the token from the previous node:
   ```
   Authorization: Bearer {{$node["Get Token"].json.accessToken}}
   ```

### Example n8n Workflow
```
[Webhook] → [Get User Token] → [Gmail API Call]
```

## 🧪 Testing

### Test Backend API
```bash
# Test root endpoint
curl http://localhost:8001/

# Test store token (after getting a real token from frontend)
curl -X POST http://localhost:8001/api/auth/store-token \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "email": "test@example.com",
    "displayName": "Test User",
    "accessToken": "test-token",
    "scopes": ["gmail"]
  }'

# Test get token (requires API key)
curl http://localhost:8001/api/auth/get-token/test-user \
  -H "Authorization: Bearer n8n-secure-api-key-change-this"
```

### Test Frontend
1. Open browser: `http://localhost:3000`
2. Click "Sign in with Google"
3. Complete OAuth flow
4. Verify token is displayed
5. Check backend for stored token

## 📝 Next Steps

### For Production Deployment:
1. ✅ Change all API keys in `.env` files
2. ✅ Update `ENCRYPTION_KEY` to a secure 32-character string
3. ✅ Update `N8N_API_KEY` to a strong random key
4. ✅ Configure CORS to only allow your domain
5. ✅ Use HTTPS for all connections
6. ✅ Set up proper MongoDB authentication
7. ✅ Enable Firebase App Check for security
8. ✅ Implement token refresh logic
9. ✅ Add rate limiting to API endpoints
10. ✅ Set up monitoring and logging

### For Enhanced Features:
- [ ] Add token refresh mechanism
- [ ] Implement Microsoft/GitHub OAuth
- [ ] Add user management dashboard
- [ ] Create token expiry notifications
- [ ] Add audit logging
- [ ] Implement webhook for token updates

## 🐛 Troubleshooting

### Services not starting
```bash
sudo supervisorctl restart all
tail -100 /var/log/supervisor/backend.err.log
tail -100 /var/log/supervisor/frontend.err.log
```

### MongoDB connection issues
```bash
sudo supervisorctl status mongodb
sudo supervisorctl restart mongodb
```

### Firebase authentication errors
1. Check Firebase console for correct OAuth configuration
2. Verify redirect URIs are properly set
3. Ensure API is enabled in Google Cloud Console

### Token not being stored
1. Check backend logs: `tail -100 /var/log/supervisor/backend.err.log`
2. Verify MongoDB is running: `sudo supervisorctl status mongodb`
3. Check CORS configuration in `server.py`

## 📞 Support

If you encounter any issues:
1. Check service logs in `/var/log/supervisor/`
2. Verify all environment variables are set correctly
3. Ensure MongoDB is running and accessible
4. Check Firebase console for OAuth configuration

## 🔒 Security Notes

- ✅ Tokens are encrypted in MongoDB using Fernet encryption
- ✅ API endpoints are protected with API key authentication
- ✅ CORS is configured (update for production)
- ⚠️ Change all default keys before production deployment
- ⚠️ Use HTTPS in production
- ⚠️ Implement proper session management

## 📄 License

This project is for testing purposes. Use responsibly and ensure compliance with Google's OAuth policies and n8n's terms of service.

---

**Built with ❤️ for n8n integration testing**
