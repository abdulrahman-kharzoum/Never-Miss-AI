# 🚀 Quick Start Guide

## Your Google OAuth Authentication App is Ready!

### 📱 Access Your Application

**Frontend (User Interface):** http://localhost:3000  
**Backend API:** http://localhost:8001  
**API Documentation:** http://localhost:8001/docs

---

## ⚡ Quick Actions

### Check Services Status
```bash
sudo supervisorctl status
```

### Restart All Services
```bash
sudo supervisorctl restart all
```

### Restart Individual Services
```bash
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```

### View Logs
```bash
# Backend logs
tail -f /var/log/supervisor/backend.err.log

# Frontend logs
tail -f /var/log/supervisor/frontend.out.log
```

---

## 🎯 Testing Your Setup (3 Minutes)

### Step 1: Open the Application (30 seconds)
1. Go to: http://localhost:3000
2. You should see the Google OAuth Authentication page ✅

### Step 2: Sign In with Google (1 minute)
1. Click the "Sign in with Google" button
2. Select your Google account in the popup
3. Grant the requested permissions:
   - Gmail access
   - Google Calendar access
   - Google Drive access
   - Profile information
4. Click "Allow"

### Step 3: Verify Success (1 minute)
After signing in, you should see:
- ✅ Your profile picture, name, and email
- ✅ Green success message: "Token Stored Successfully"
- ✅ n8n Integration Endpoint with your User ID
- ✅ Access Token section (hidden by default)
- ✅ Granted Permissions list
- ✅ Sign Out button

### Step 4: Test the API (30 seconds)
Copy your User ID from the page, then run:
```bash
curl http://localhost:8001/api/auth/get-token/YOUR_USER_ID_HERE \
  -H "Authorization: Bearer n8n-secure-api-key-change-this"
```

You should see your user data and token! ✅

---

## 🔑 Important Information

### Your Firebase Configuration
- **Project ID:** product-image-maker
- **API Key:** AIzaSyBjNcwo_56CaFNds5QVAqerk-JDUUEuGIo
- **Auth Domain:** product-image-maker.firebaseapp.com

### Default API Keys (⚠️ Change in Production!)
- **n8n API Key:** `n8n-secure-api-key-change-this`
- **Encryption Key:** `your-encryption-key-32-chars-long`

### Granted Google Scopes
- Gmail (read & modify)
- Google Calendar (full access)
- Google Drive (full access)
- User Profile & Email

---

## 🎨 What You Can Do Now

### 1️⃣ Test the Authentication Flow
- Sign in with your Google account
- View your profile and token
- Copy the token for testing
- Sign out and sign back in

### 2️⃣ Get Your User ID
After signing in:
1. Look under your email on the page
2. You'll see: "User ID: YOUR_USER_ID"
3. Copy this - you'll need it for n8n

### 3️⃣ Test the Backend API
```bash
# Health check
curl http://localhost:8001/

# Get your token (replace YOUR_USER_ID)
curl http://localhost:8001/api/auth/get-token/YOUR_USER_ID \
  -H "Authorization: Bearer n8n-secure-api-key-change-this"

# List all users
curl http://localhost:8001/api/auth/users \
  -H "Authorization: Bearer n8n-secure-api-key-change-this"
```

### 4️⃣ Integrate with n8n
1. Create a new workflow in n8n
2. Add an HTTP Request node
3. Configure:
   - Method: `GET`
   - URL: `http://localhost:8001/api/auth/get-token/YOUR_USER_ID`
   - Auth: Header Auth
   - Header: `Authorization: Bearer n8n-secure-api-key-change-this`
4. Execute to get the user's token
5. Use the token in subsequent Google API calls

---

## 🎯 API Endpoints Reference

### 1. Store User Token (Automatic from Frontend)
```http
POST /api/auth/store-token
```

### 2. Get User Token (For n8n)
```http
GET /api/auth/get-token/{user_id}
Authorization: Bearer n8n-secure-api-key-change-this
```

### 3. Validate Token
```http
POST /api/auth/validate-token
Body: {"userId": "user-id"}
```

### 4. List All Users (Admin)
```http
GET /api/auth/users
Authorization: Bearer n8n-secure-api-key-change-this
```

---

## 🐛 Quick Troubleshooting

### Problem: Services not running
```bash
sudo supervisorctl restart all
sudo supervisorctl status
```

### Problem: Can't access frontend
1. Check if frontend is running: `sudo supervisorctl status frontend`
2. Check logs: `tail -100 /var/log/supervisor/frontend.err.log`
3. Restart: `sudo supervisorctl restart frontend`

### Problem: Backend API not responding
1. Check if backend is running: `sudo supervisorctl status backend`
2. Check logs: `tail -100 /var/log/supervisor/backend.err.log`
3. Restart: `sudo supervisorctl restart backend`

### Problem: Google sign-in popup blocked
- Allow popups for `localhost:3000` in your browser settings

### Problem: MongoDB connection error
```bash
sudo supervisorctl restart mongodb
sudo supervisorctl status mongodb
```

---

## 📚 Documentation Files

1. **README.md** - Complete project documentation
2. **TESTING_GUIDE.md** - Step-by-step testing instructions
3. **QUICK_START.md** - This file (quick reference)

---

## ✅ Success Checklist

Before considering your setup complete:

- [ ] Frontend loads at http://localhost:3000
- [ ] Backend responds at http://localhost:8001
- [ ] You can sign in with Google
- [ ] Profile displays correctly after sign-in
- [ ] Token is stored (green success message appears)
- [ ] You can show/hide/copy the token
- [ ] Backend API returns your token with correct API key
- [ ] You have noted your User ID for n8n integration

---

## 🎉 Next Steps

### Immediate (Testing Phase)
1. ✅ Sign in with your Google account
2. ✅ Copy your User ID
3. ✅ Test the API endpoint
4. ✅ Try the token in a Google API call

### For n8n Integration
1. Create your first n8n workflow
2. Use the "Get Token" HTTP Request node
3. Test with a simple Gmail API call
4. Expand to Calendar and Drive APIs

### For Production (Before Deployment)
1. ⚠️ Change all API keys in `.env` files
2. ⚠️ Update CORS settings for your domain
3. ⚠️ Set up HTTPS
4. ⚠️ Configure Firebase for production domain
5. ⚠️ Implement token refresh mechanism
6. ⚠️ Add monitoring and logging

---

## 💡 Pro Tips

1. **Multiple Users**: Each user gets a unique User ID - use this to identify users in n8n workflows
2. **Token Security**: Tokens are encrypted in MongoDB - they're only decrypted when requested via API
3. **API Key Protection**: Never expose the n8n API key publicly - it's like a master password
4. **Token Expiry**: Current implementation expires tokens after 1 hour - implement refresh for production
5. **Scopes**: Only request the Google scopes you actually need - users trust you more

---

## 📞 Need Help?

1. **Check the logs** first: `/var/log/supervisor/`
2. **Read the guides**: README.md and TESTING_GUIDE.md
3. **Verify configuration**: Check `.env` files in backend and frontend folders
4. **Test step-by-step**: Use the TESTING_GUIDE.md checklist

---

## 🎊 You're All Set!

Your Google OAuth authentication system is ready to use!

**Start by visiting:** http://localhost:3000

**Happy coding!** 🚀

---

*Built for testing Google OAuth integration with n8n workflows*
