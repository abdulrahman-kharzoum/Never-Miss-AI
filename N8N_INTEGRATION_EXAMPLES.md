# 🔗 n8n Integration Examples

This guide provides ready-to-use n8n workflow examples for integrating with your Google OAuth authentication system.

---

## 📋 Prerequisites

Before creating n8n workflows, make sure you have:

1. ✅ Successfully signed in via http://localhost:3000
2. ✅ Copied your **User ID** from the profile page
3. ✅ Your **n8n API Key**: `n8n-secure-api-key-change-this`
4. ✅ Backend running at: `http://localhost:8001`

---

## 🎯 Example 1: Get User Token (Basic)

### Node Configuration

**Node Type:** HTTP Request  
**Node Name:** Get User Token

**Settings:**
- **Method:** `GET`
- **URL:** `http://localhost:8001/api/auth/get-token/YOUR_USER_ID`
- **Authentication:** Generic Credential Type
- **Generic Auth Type:** Header Auth
- **Credential for Header Auth:**
  - **Name:** `Authorization`
  - **Value:** `Bearer n8n-secure-api-key-change-this`

**Expected Output:**
```json
{
  "userId": "firebase-user-id-here",
  "email": "user@gmail.com",
  "displayName": "User Name",
  "photoURL": "https://...",
  "accessToken": "ya29.a0AfB_...",
  "expiresAt": "2024-01-01T12:00:00Z",
  "scopes": ["userinfo.profile", "userinfo.email", ...]
}
```

---

## 📧 Example 2: Read Gmail Messages

### Workflow: Webhook → Get Token → Get Gmail Messages

#### Node 1: Webhook
**Node Type:** Webhook  
**Path:** `gmail-reader`  
**Method:** POST

**Body Example:**
```json
{
  "userId": "YOUR_USER_ID"
}
```

#### Node 2: Get User Token
Same as Example 1, but use dynamic User ID:

**URL:** `http://localhost:8001/api/auth/get-token/{{ $json.body.userId }}`

#### Node 3: Get Gmail Messages
**Node Type:** HTTP Request  
**Method:** GET  
**URL:** `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10`

**Authentication:** Generic Credential Type  
**Generic Auth Type:** Header Auth

**Headers:**
- **Name:** `Authorization`
- **Value:** `Bearer {{ $node["Get User Token"].json.accessToken }}`

**Expected Output:**
```json
{
  "messages": [
    {
      "id": "18c1234...",
      "threadId": "18c1234..."
    },
    ...
  ],
  "resultSizeEstimate": 10
}
```

---

## 📅 Example 3: Create Calendar Event

### Workflow: Manual Trigger → Get Token → Create Event

#### Node 1: Manual Trigger
Start workflow manually or with webhook

#### Node 2: Get User Token
**URL:** `http://localhost:8001/api/auth/get-token/YOUR_USER_ID`  
**Auth:** Bearer token (n8n API key)

#### Node 3: Create Calendar Event
**Node Type:** HTTP Request  
**Method:** POST  
**URL:** `https://www.googleapis.com/calendar/v3/calendars/primary/events`

**Authentication:** Header Auth  
**Authorization:** `Bearer {{ $node["Get User Token"].json.accessToken }}`

**Body (JSON):**
```json
{
  "summary": "Meeting with Team",
  "description": "Discuss project updates",
  "start": {
    "dateTime": "2024-01-15T10:00:00-07:00",
    "timeZone": "America/Los_Angeles"
  },
  "end": {
    "dateTime": "2024-01-15T11:00:00-07:00",
    "timeZone": "America/Los_Angeles"
  },
  "attendees": [
    {"email": "colleague@example.com"}
  ]
}
```

---

## 📁 Example 4: Upload File to Google Drive

### Workflow: Upload → Get Token → Create File

#### Node 1: Read Binary File
**Node Type:** Read Binary File  
**File Path:** `/path/to/file.pdf`

#### Node 2: Get User Token
Standard token fetch (see Example 1)

#### Node 3: Upload to Drive
**Node Type:** HTTP Request  
**Method:** POST  
**URL:** `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`

**Authentication:** Header Auth  
**Authorization:** `Bearer {{ $node["Get User Token"].json.accessToken }}`

**Body Type:** Multipart Form Data

**Form Data:**
- **metadata:** 
  ```json
  {
    "name": "uploaded-file.pdf",
    "mimeType": "application/pdf"
  }
  ```
- **file:** Binary data from Node 1

---

## 🔄 Example 5: Multi-User Email Processor

### Workflow: Schedule → Get All Users → Process Each User's Emails

#### Node 1: Schedule Trigger
**Trigger:** Cron  
**Expression:** `0 9 * * *` (Daily at 9 AM)

#### Node 2: Get All Users
**Node Type:** HTTP Request  
**Method:** GET  
**URL:** `http://localhost:8001/api/auth/users`  
**Auth:** Bearer token (n8n API key)

#### Node 3: Split Out
**Node Type:** Split Out  
**Field to Split:** `users`

This creates one workflow execution per user.

#### Node 4: Get User Token
**URL:** `http://localhost:8001/api/auth/get-token/{{ $json.userId }}`

#### Node 5: Get Unread Emails
**URL:** `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=50`  
**Auth:** Use token from Node 4

#### Node 6: Process Emails
Add your business logic here (send notifications, save to database, etc.)

---

## 📊 Example 6: Gmail + Calendar Integration

### Workflow: New Email → Extract Meeting → Create Calendar Event

#### Node 1: Webhook
**Path:** `process-email`  
**Method:** POST  
**Body:**
```json
{
  "userId": "YOUR_USER_ID",
  "messageId": "gmail-message-id"
}
```

#### Node 2: Get User Token
Standard token fetch

#### Node 3: Get Email Content
**URL:** `https://gmail.googleapis.com/gmail/v1/users/me/messages/{{ $json.body.messageId }}`  
**Auth:** Bearer token from Node 2

#### Node 4: IF Node (Check for Meeting Keywords)
**Condition:** 
```javascript
{{ $json.snippet.toLowerCase().includes('meeting') }}
```

#### Node 5: Create Calendar Event (True Branch)
Use extracted date/time from email to create event  
**URL:** `https://www.googleapis.com/calendar/v3/calendars/primary/events`

---

## 🔔 Example 7: Send Email via Gmail

### Workflow: Trigger → Get Token → Send Email

#### Node 1: Manual/Webhook Trigger
**Body:**
```json
{
  "userId": "YOUR_USER_ID",
  "to": "recipient@example.com",
  "subject": "Hello from n8n",
  "body": "This is a test email"
}
```

#### Node 2: Get User Token
Standard token fetch

#### Node 3: Create Email (Function Node)
**Function Code:**
```javascript
const email = [
  `To: ${$json.body.to}`,
  `Subject: ${$json.body.subject}`,
  '',
  $json.body.body
].join('\n');

// Base64url encode
const encodedEmail = Buffer.from(email)
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');

return {
  raw: encodedEmail
};
```

#### Node 4: Send Email
**Method:** POST  
**URL:** `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`  
**Auth:** Bearer token  
**Body:** Output from Node 3

---

## 🎯 Example 8: Search Google Drive

### Workflow: Search → Get Token → Query Drive

#### Node 1: Webhook
**Body:**
```json
{
  "userId": "YOUR_USER_ID",
  "searchQuery": "type:pdf modified > '2024-01-01'"
}
```

#### Node 2: Get User Token
Standard token fetch

#### Node 3: Search Drive
**Method:** GET  
**URL:** `https://www.googleapis.com/drive/v3/files`

**Query Parameters:**
- **q:** `{{ $json.body.searchQuery }}`
- **fields:** `files(id,name,mimeType,modifiedTime,webViewLink)`
- **pageSize:** `100`

**Auth:** Bearer token from Node 2

**Expected Output:**
```json
{
  "files": [
    {
      "id": "1abc...",
      "name": "document.pdf",
      "mimeType": "application/pdf",
      "modifiedTime": "2024-01-15T10:30:00.000Z",
      "webViewLink": "https://drive.google.com/file/d/..."
    }
  ]
}
```

---

## 🔐 Example 9: Token Validation Before Processing

### Workflow: Validate Token → Process → Error Handler

#### Node 1: Webhook
Start workflow with user ID

#### Node 2: Validate Token
**Method:** POST  
**URL:** `http://localhost:8001/api/auth/validate-token`  
**Body:**
```json
{
  "userId": "{{ $json.body.userId }}"
}
```

#### Node 3: IF Node
**Condition:** `{{ $json.valid === true }}`

#### Node 4a: Continue Processing (True Branch)
Get token and proceed with Google API calls

#### Node 4b: Error Response (False Branch)
Return error asking user to re-authenticate

---

## 🚀 Example 10: Batch Operations

### Workflow: Process Multiple Users' Drive Files

#### Node 1: Schedule Trigger
Daily at midnight

#### Node 2: Get All Users
Fetch all authenticated users

#### Node 3: Loop Over Users
For each user:

1. Get user token
2. List files in Drive
3. Process each file
4. Store results in database

**Error Handling:**
- Add error branches for expired tokens
- Send notification to user to re-authenticate
- Log errors for debugging

---

## 🛠️ Common Patterns & Best Practices

### Pattern 1: Token Expiry Handling
```javascript
// In an IF node, check token expiry
{{ 
  new Date($node["Get User Token"].json.expiresAt) > new Date() 
}}
```

### Pattern 2: Error Handler for 401 Unauthorized
Add error branch after Google API calls:
```javascript
{{ $json.statusCode === 401 }}
```
Then notify user to re-authenticate.

### Pattern 3: Rate Limiting
Add delay between API calls:
**Wait Node:** 1 second between requests

### Pattern 4: Pagination
For large result sets, implement pagination:
```javascript
// Check for nextPageToken
{{ $json.nextPageToken ? true : false }}
```

---

## 📝 Testing Your Workflows

### Quick Test Endpoints

**Test Token Fetch:**
```bash
curl http://localhost:8001/api/auth/get-token/YOUR_USER_ID \
  -H "Authorization: Bearer n8n-secure-api-key-change-this"
```

**Test Gmail API with Token:**
```bash
curl https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Test Calendar API:**
```bash
curl https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Test Drive API:**
```bash
curl https://www.googleapis.com/drive/v3/files?pageSize=10 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🐛 Troubleshooting n8n Workflows

### Issue: "Invalid credentials"
**Solution:** Check that you're using the correct n8n API key in the "Get Token" node

### Issue: "User token not found"
**Solution:** Verify the user has authenticated via http://localhost:3000

### Issue: "Token expired"
**Solution:** User needs to re-authenticate. Current tokens expire after 1 hour.

### Issue: "Insufficient permission"
**Solution:** Check that the required scope was granted during authentication

### Issue: "Rate limit exceeded"
**Solution:** Add delays between API calls or implement exponential backoff

---

## 💡 Pro Tips

1. **Store User IDs:** Keep a mapping of user IDs to user identities in your n8n database
2. **Cache Tokens:** n8n can cache API responses to reduce backend calls
3. **Error Logging:** Always log errors for debugging multi-user workflows
4. **Webhook Security:** Add authentication to your webhook endpoints
5. **Test with One User First:** Validate workflow logic before scaling to multiple users

---

## 🎓 Advanced Use Cases

### Use Case 1: Email Automation Platform
- Users authenticate once
- n8n processes their emails automatically
- Creates tasks, calendar events, or sends responses

### Use Case 2: Document Management System
- Users connect their Drive
- n8n organizes, tags, and backs up files
- Generates reports on file usage

### Use Case 3: Calendar Assistant
- Sync events across multiple users
- Auto-schedule meetings based on availability
- Send reminders via Gmail

### Use Case 4: CRM Integration
- Pull emails and calendar events
- Update CRM with customer interactions
- Automate follow-up emails

---

## 📚 Resources

### Google API Documentation
- **Gmail API:** https://developers.google.com/gmail/api
- **Calendar API:** https://developers.google.com/calendar/api
- **Drive API:** https://developers.google.com/drive/api

### n8n Documentation
- **HTTP Request Node:** https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/
- **Webhook Node:** https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
- **Credentials:** https://docs.n8n.io/credentials/

### Your Backend API
- **Root:** http://localhost:8001/
- **API Docs:** http://localhost:8001/docs
- **Health Check:** http://localhost:8001/

---

## ✅ Workflow Checklist

Before deploying your n8n workflow:

- [ ] Tested token fetch successfully
- [ ] Verified Google API scopes are sufficient
- [ ] Added error handling for expired tokens
- [ ] Implemented rate limiting if needed
- [ ] Tested with multiple users
- [ ] Added logging for debugging
- [ ] Secured webhook endpoints
- [ ] Documented the workflow purpose

---

## 🎉 Ready to Build!

You now have everything you need to create powerful n8n workflows with Google OAuth authentication!

**Start with Example 2** (Read Gmail Messages) - it's the simplest and most useful!

---

*Happy automating with n8n! 🚀*
