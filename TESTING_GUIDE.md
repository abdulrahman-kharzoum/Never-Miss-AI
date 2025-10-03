# 🧪 Testing Guide - Google OAuth Authentication

This guide will walk you through testing your Google OAuth authentication setup step by step.

## ✅ Pre-Testing Checklist

Before you start testing, verify:

1. **Services are running**
   ```bash
   sudo supervisorctl status
   ```
   Expected: All services showing `RUNNING`

2. **Backend is responding**
   ```bash
   curl http://localhost:8001/
   ```
   Expected: `{"message":"Google Auth API is running","status":"healthy"}`

3. **Frontend is accessible**
   - Open: `http://localhost:3000`
   - Expected: You should see the Google OAuth Authentication page

## 🎯 Step-by-Step Testing

### Test 1: Backend Health Check ✅

```bash
curl http://localhost:8001/
```

**Expected Response:**
```json
{
  "message": "Google Auth API is running",
  "status": "healthy"
}
```

### Test 2: Google Sign-In Flow 🔐

1. **Open the application**
   - URL: `http://localhost:3000`
   - You should see: "Google OAuth Authentication" page

2. **Click "Sign in with Google" button**
   - A popup window should appear
   - Google OAuth consent screen should load

3. **Select your Google account**
   - Choose the account you want to test with
   - Review the permissions requested:
     - Gmail access
     - Google Calendar access
     - Google Drive access
     - Profile information

4. **Grant permissions**
   - Click "Allow" or "Continue"
   - The popup should close automatically

5. **Verify successful authentication**
   - You should see your profile displayed:
     - Profile photo
     - Name
     - Email address
     - User ID
   - Green success message: "Token Stored Successfully"

### Test 3: Token Display and Copy 📋

1. **Show the token**
   - Click the "👁️ Show" button next to "Access Token"
   - The token should be displayed in a gray box
   - It should look like a long string (JWT format)

2. **Copy the token**
   - Click the "Copy Token" button
   - Button should show "✓ Copied!" for 2 seconds
   - Paste somewhere to verify it was copied

3. **Hide the token**
   - Click "🙈 Hide" button
   - Token should disappear

### Test 4: Backend Token Storage 💾

Check if the token was stored in the backend:

```bash
# First, get your User ID from the frontend (displayed under your email)
# Replace USER_ID_HERE with your actual user ID

curl http://localhost:8001/api/auth/get-token/USER_ID_HERE \
  -H "Authorization: Bearer n8n-secure-api-key-change-this"
```

**Expected Response:**
```json
{
  "userId": "your-user-id",
  "email": "your-email@gmail.com",
  "displayName": "Your Name",
  "photoURL": "https://...",
  "accessToken": "decrypted-token-here",
  "expiresAt": "2024-XX-XXTXX:XX:XXZ",
  "scopes": ["userinfo.profile", "userinfo.email", ...]
}
```

### Test 5: API Authentication 🔑

**Test without API key (should fail):**
```bash
curl http://localhost:8001/api/auth/get-token/USER_ID_HERE
```

**Expected Response:**
```json
{
  "detail": "Authorization header missing"
}
```

**Test with wrong API key (should fail):**
```bash
curl http://localhost:8001/api/auth/get-token/USER_ID_HERE \
  -H "Authorization: Bearer wrong-key"
```

**Expected Response:**
```json
{
  "detail": "Invalid API key"
}
```

### Test 6: List All Users (Admin Endpoint) 👥

```bash
curl http://localhost:8001/api/auth/users \
  -H "Authorization: Bearer n8n-secure-api-key-change-this"
```

**Expected Response:**
```json
{
  "users": [
    {
      "userId": "user-id-1",
      "email": "user1@example.com",
      "displayName": "User One",
      "photoURL": "https://...",
      "scopes": [...],
      "updatedAt": "2024-XX-XXTXX:XX:XX"
    }
  ],
  "count": 1
}
```

### Test 7: Sign Out 🚪

1. Click the "Sign Out" button on the frontend
2. You should be returned to the sign-in page
3. Profile information should disappear
4. No errors should appear

### Test 8: Re-Authentication 🔄

1. Sign in again with the same Google account
2. The token should be updated in the backend
3. Previous test (Test 4) should still work with the same User ID

## 🧪 Advanced Testing

### Test: Multiple Users

1. Sign in with one Google account
2. Note the User ID
3. Sign out
4. Sign in with a different Google account
5. Note the different User ID
6. Use the admin endpoint (Test 6) to verify both users are stored

### Test: Token Encryption

Check MongoDB to verify tokens are encrypted:

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/google_auth_db

# Query the user_tokens collection
db.user_tokens.find().pretty()
```

**Expected:** The `accessToken` field should be encrypted (looks like gibberish, not a valid JWT)

### Test: Error Handling

**Test 1: Invalid User ID**
```bash
curl http://localhost:8001/api/auth/get-token/invalid-user-id \
  -H "Authorization: Bearer n8n-secure-api-key-change-this"
```

**Expected Response:**
```json
{
  "detail": "User token not found"
}
```

## 🎯 n8n Integration Testing

### Setup n8n Workflow

1. **Create a new workflow in n8n**

2. **Add HTTP Request Node** (Get Token)
   - Name: "Get User Token"
   - Method: `GET`
   - URL: `http://localhost:8001/api/auth/get-token/YOUR_USER_ID`
   - Authentication: "Header Auth"
     - Header Name: `Authorization`
     - Header Value: `Bearer n8n-secure-api-key-change-this`

3. **Test the node**
   - Click "Execute Node"
   - You should see your token in the output

4. **Add another HTTP Request Node** (Use Token)
   - Name: "Get Gmail Messages"
   - Method: `GET`
   - URL: `https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=5`
   - Authentication: "Header Auth"
     - Header Name: `Authorization`
     - Header Value: `Bearer {{$node["Get User Token"].json.accessToken}}`

5. **Test the workflow**
   - Execute both nodes
   - You should see Gmail messages in the output

## 🐛 Common Issues and Solutions

### Issue 1: "Authorization header missing"
**Solution:** Make sure you're including the Bearer token:
```bash
-H "Authorization: Bearer n8n-secure-api-key-change-this"
```

### Issue 2: Google sign-in popup blocked
**Solution:** 
- Allow popups in your browser for `localhost:3000`
- Try again

### Issue 3: "Token expired"
**Solution:**
- Sign out and sign in again to get a fresh token
- Implement token refresh mechanism (future enhancement)

### Issue 4: CORS error in browser console
**Solution:**
- Check if backend is running: `sudo supervisorctl status backend`
- Restart backend: `sudo supervisorctl restart backend`

### Issue 5: MongoDB connection error
**Solution:**
- Check MongoDB status: `sudo supervisorctl status mongodb`
- Restart MongoDB: `sudo supervisorctl restart mongodb`

### Issue 6: Token not storing in backend
**Solution:**
1. Check backend logs:
   ```bash
   tail -100 /var/log/supervisor/backend.err.log
   ```
2. Verify CORS is allowing `localhost:3000`
3. Check MongoDB is running and accessible

## 📊 Success Criteria

Your setup is working correctly if:

- ✅ You can sign in with Google
- ✅ Your profile is displayed correctly
- ✅ Token is shown/hidden with the button
- ✅ Token can be copied to clipboard
- ✅ Backend API returns your token with correct API key
- ✅ Token is encrypted in MongoDB
- ✅ You can sign out and sign back in
- ✅ Multiple users can authenticate independently

## 🎉 Next Steps After Successful Testing

1. **For n8n Integration:**
   - Use the User ID in your n8n workflows
   - Store the API key (`n8n-secure-api-key-change-this`) securely
   - Create workflows that fetch user tokens dynamically

2. **For Production:**
   - Change all API keys in `.env` files
   - Update Firebase OAuth settings for production domain
   - Set up HTTPS
   - Implement token refresh logic
   - Add monitoring and alerting

3. **For Enhancement:**
   - Add more OAuth providers (Microsoft, GitHub)
   - Implement user dashboard
   - Add webhook notifications for token updates
   - Create admin panel for user management

## 📝 Testing Checklist

Print this and check off as you test:

- [ ] Backend health check passes
- [ ] Frontend loads successfully
- [ ] Google sign-in popup appears
- [ ] Authentication completes successfully
- [ ] Profile displays correctly
- [ ] Token can be shown/hidden
- [ ] Token can be copied
- [ ] Backend stores token correctly
- [ ] API authentication works
- [ ] Invalid credentials are rejected
- [ ] Sign out works
- [ ] Re-authentication works
- [ ] Token is encrypted in MongoDB
- [ ] n8n can fetch the token
- [ ] Google API calls work with the token

---

**Happy Testing! 🎉**

If you encounter any issues not covered here, check the logs:
```bash
tail -100 /var/log/supervisor/backend.err.log
tail -100 /var/log/supervisor/frontend.err.log
```
