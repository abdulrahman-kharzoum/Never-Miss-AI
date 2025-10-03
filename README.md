# Google OAuth Authentication for n8n Integration

This is a simple web application that allows users to authenticate with their Google account, retrieve access tokens, and securely store them for n8n workflow integration.

## 🎯 Features

✅ **Google OAuth Authentication** - Sign in with Google account  
✅ **Multiple Scopes Support** - Gmail, Google Calendar, Google Drive, Profile  
✅ **Secure Token Storage** - Encrypted token storage in MongoDB  
✅ **n8n Integration Ready** - API endpoint for n8n workflows  
✅ **Simple UI** - Clean interface with user profile display  
✅ **Hidden Token** - Token hidden by default with show/copy option  

## 🏗️ Architecture

```
Frontend (React + Firebase) → Backend (FastAPI) → MongoDB
                ↓
          Google OAuth
                ↓
         n8n Workflows
```

## 📁 Project Structure

```
/app/
├── backend/                 # FastAPI backend
│   ├── server.py           # Main API server
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables
├── frontend/               # React frontend
│   ├── src/
│   │   ├── App.js         # Main component
│   │   ├── firebase.js    # Firebase configuration
│   │   └── ...
│   ├── package.json       # Node dependencies
│   └── .env              # Frontend environment variables
└── README.md             # This file
```

## 🚀 Getting Started

### Prerequisites
- Firebase project with Google OAuth enabled
- MongoDB running locally
- Node.js and Python installed

### Services Status
Check if all services are running:
```bash
sudo supervisorctl status
```

Expected output:
```
backend    RUNNING
frontend   RUNNING
mongodb    RUNNING
```

### Restart Services
```bash
sudo supervisorctl restart all
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
