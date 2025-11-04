from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from cryptography.fernet import Fernet
import base64
import hashlib
import httpx
import socketio
from socketio import ASGIApp
import asyncio

load_dotenv()

app = FastAPI(title="Google Auth API")

@app.on_event("startup")
async def startup_db_client():
    """Ping MongoDB on startup to check the connection."""
    try:
        # The ismaster command is cheap and does not require auth.
        await client.admin.command('ismaster')
        print("✅ Successfully connected to MongoDB.")
    except Exception as e:
        print("❌ Failed to connect to MongoDB.")
        print(e)

# Define the list of allowed origins (your frontend domains)
origins = [
    "http://localhost:3000",  # For local development
    "https://nevermissai.zentrad.com", # Your production frontend
    # Add your production frontend URL here when you deploy
    # e.g., "https://www.your-app-name.com"
]

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sio = socketio.AsyncServer(cors_allowed_origins=origins, async_mode="asgi")
sio_app = ASGIApp(sio, other_asgi_app=app)

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/")
DATABASE_NAME = os.getenv("DATABASE_NAME", "google_auth_db")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DATABASE_NAME]

# Encryption setup
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "default-key-please-change-this-32")
# Create a valid Fernet key from the encryption key
key = base64.urlsafe_b64encode(hashlib.sha256(ENCRYPTION_KEY.encode()).digest())
cipher_suite = Fernet(key)

# API Key for n8n
N8N_API_KEY = os.getenv("N8N_API_KEY")
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL")

# Google OAuth configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("REDIRECT_URI")

# Pydantic models
class TokenData(BaseModel):
    userId: str
    email: str
    displayName: str
    photoURL: Optional[str] = None
    accessToken: str
    refreshToken: Optional[str] = None
    expiresAt: Optional[str] = None # Add expiresAt back for frontend to send
    scopes: list[str] = []

class TokenResponse(BaseModel):
    success: bool
    message: str
    userId: Optional[str] = None

class UserToken(BaseModel):
    userId: str
    email: str
    displayName: str
    photoURL: Optional[str] = None
    accessToken: str
    refreshToken: Optional[str] = None # Make refreshToken optional
    expiresAt: Optional[str] = None
    scopes: list[str] = []

class FileProcessingStatus(BaseModel):
    sessionId: str
    userId: str
    status: str
    message: Optional[str] = None
    redirectUrl: Optional[str] = None

# Helper functions
def encrypt_token(token: str) -> str:
    """Encrypt the token for secure storage"""
    return cipher_suite.encrypt(token.encode()).decode()

def decrypt_token(encrypted_token: str) -> str:
    """Decrypt the token"""
    return cipher_suite.decrypt(encrypted_token.encode()).decode()

async def verify_n8n_api_key(authorization: str = Header(None)):
    """Verify the API key for n8n access"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    # Extract bearer token
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    api_key = authorization.replace("Bearer ", "")
    if api_key != N8N_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    return True

# API Endpoints
@app.get("/")
async def root():
    return {"message": "Google Auth API is running", "status": "healthy"}

@app.post("/api/auth/store-token", response_model=TokenResponse)
async def store_token(token_data: TokenData):
    """Store user's Google OAuth token securely and trigger n8n webhook."""
    try:
        # Encrypt the access token
        encrypted_access_token = encrypt_token(token_data.accessToken)
        
        # Prepare the fields that are always updated
        update_fields = {
            "userId": token_data.userId,
            "email": token_data.email,
            "displayName": token_data.displayName,
            "photoURL": token_data.photoURL,
            "accessToken": encrypted_access_token,
            "expiresAt": token_data.expiresAt,
            "scopes": token_data.scopes,
            "updatedAt": datetime.utcnow().isoformat()
        }
        
        # Only update the refresh token if a new one is provided
        if token_data.refreshToken:
            encrypted_refresh_token = encrypt_token(token_data.refreshToken)
            update_fields["refreshToken"] = encrypted_refresh_token
        
        # Upsert the document, using $set to avoid overwriting the refresh token
        await db.user_tokens.update_one(
            {"userId": token_data.userId},
            {"$set": update_fields},
            upsert=True
        )

        # Securely trigger n8n webhook from the backend
        if N8N_WEBHOOK_URL and N8N_API_KEY:
            headers = {"Authorization": f"Bearer {N8N_API_KEY}"}
            webhook_payload = {
                "userId": token_data.userId,
                "email": token_data.email,
                "event": "user_authenticated"
            }
            async with httpx.AsyncClient() as client:
                try:
                    await client.post(N8N_WEBHOOK_URL, json=webhook_payload, headers=headers)
                except httpx.RequestError as e:
                    # Log the error but don't fail the whole request
                    print(f"Error calling n8n webhook: {e}")

        return TokenResponse(
            success=True,
            message="Token stored successfully",
            userId=token_data.userId
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error storing token: {str(e)}")

@app.get("/api/auth/get-token/{user_id}", response_model=UserToken)
async def get_token(user_id: str, authorized: bool = Depends(verify_n8n_api_key)):
    """Get user's token for n8n workflows (requires API key)"""
    try:
        user_doc = await db.user_tokens.find_one({"userId": user_id})
        
        if not user_doc:
            raise HTTPException(status_code=404, detail="User token not found")
        
        # Decrypt the access token
        decrypted_token = decrypt_token(user_doc["accessToken"])
        
        # Decrypt the refresh token if present
        decrypted_refresh_token = None
        if user_doc.get("refreshToken"):
            decrypted_refresh_token = decrypt_token(user_doc["refreshToken"])

        return UserToken(
            userId=user_doc["userId"],
            email=user_doc["email"],
            displayName=user_doc["displayName"],
            photoURL=user_doc.get("photoURL"),
            accessToken=decrypted_token,
            refreshToken=decrypted_refresh_token, # Pass the potentially None decrypted_refresh_token
            expiresAt=user_doc.get("expiresAt"),
            scopes=user_doc.get("scopes", [])
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving token: {str(e)}")

@app.post("/api/auth/validate-token")
async def validate_token(user_id: str):
    """Check if user has a valid token stored"""
    try:
        user_doc = await db.user_tokens.find_one({"userId": user_id})
        
        if not user_doc:
            return {"valid": False, "message": "No token found"}
        
        # Check if token is expired
        if user_doc.get("expiresAt"):
            expires_at = datetime.fromisoformat(user_doc["expiresAt"].replace("Z", "+00:00"))
            if expires_at < datetime.utcnow():
                return {"valid": False, "message": "Token expired"}
        
        return {
            "valid": True,
            "message": "Token is valid",
            "email": user_doc["email"],
            "displayName": user_doc["displayName"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error validating token: {str(e)}")

@app.get("/api/auth/users")
async def list_users(authorized: bool = Depends(verify_n8n_api_key)):
    """List all authenticated users (for n8n admin)"""
    try:
        users = []
        async for user_doc in db.user_tokens.find({}):
            users.append({
                "userId": user_doc["userId"],
                "email": user_doc["email"],
                "displayName": user_doc["displayName"],
                "photoURL": user_doc.get("photoURL"),
                "scopes": user_doc.get("scopes", []),
                "updatedAt": user_doc.get("updatedAt")
            })
        
        return {"users": users, "count": len(users)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing users: {str(e)}")

class RefreshTokenRequest(BaseModel):
    user_id: Optional[str] = None
    userId: Optional[str] = None

@app.post("/api/auth/refresh-token", response_model=UserToken)
async def refresh_access_token(request: RefreshTokenRequest, authorized: bool = Depends(verify_n8n_api_key)):
    """
    Refresh user's Google OAuth access token using the refresh token.
    This endpoint is protected and can only be called by n8n.
    """
    # Accept either user_id (snake_case) or userId (camelCase)
    user_id = request.user_id or request.userId
    if not user_id:
        raise HTTPException(status_code=422, detail="Field 'user_id' or 'userId' is required.")

    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Server not configured for Google OAuth.")

    try:
        user_doc = await db.user_tokens.find_one({"userId": user_id})
        if not user_doc or not user_doc.get("refreshToken"):
            raise HTTPException(status_code=404, detail="Refresh token not found for user.")

        decrypted_refresh_token = decrypt_token(user_doc["refreshToken"])

        token_refresh_data = {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "refresh_token": decrypted_refresh_token,
            "grant_type": "refresh_token",
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data=token_refresh_data
            )
            
            # Handle Google's error response
            if response.status_code != 200:
                error_data = response.json()
                # If the refresh token is invalid, Google returns a 400 or 401 with "invalid_grant"
                if error_data.get("error") == "invalid_grant":
                    # The refresh token is no longer valid. We should clear it to force re-authentication.
                    await db.user_tokens.update_one(
                        {"userId": user_id},
                        {"$set": {"refreshToken": None, "accessToken": None, "expiresAt": None}}
                    )
                    raise HTTPException(status_code=401, detail="Invalid refresh token. User must re-authenticate.")
                # For other errors, raise a generic exception
                raise HTTPException(status_code=response.status_code, detail=f"Google OAuth error: {response.text}")

            google_tokens = response.json()

        new_access_token = google_tokens.get("access_token")
        new_expires_in = google_tokens.get("expires_in")
        # Google might issue a new refresh token, but often doesn't. Use the old one if a new one isn't provided.
        new_refresh_token = google_tokens.get("refresh_token", decrypted_refresh_token)

        if not new_access_token:
            raise HTTPException(status_code=400, detail="Failed to retrieve new access token from Google.")

        encrypted_new_access_token = encrypt_token(new_access_token)
        encrypted_new_refresh_token = encrypt_token(new_refresh_token)

        new_expires_at = None
        if new_expires_in:
            new_expires_at = (datetime.utcnow() + timedelta(seconds=new_expires_in)).isoformat()

        await db.user_tokens.update_one(
            {"userId": user_id},
            {"$set": {
                "accessToken": encrypted_new_access_token,
                "refreshToken": encrypted_new_refresh_token,
                "expiresAt": new_expires_at,
                "updatedAt": datetime.utcnow().isoformat()
            }}
        )

        return UserToken(
            userId=user_doc["userId"],
            email=user_doc["email"],
            displayName=user_doc["displayName"],
            photoURL=user_doc.get("photoURL"),
            accessToken=new_access_token,
            refreshToken=new_refresh_token,
            expiresAt=new_expires_at,
            scopes=user_doc.get("scopes", [])
        )
    except HTTPException as e:
        # Re-raise known HTTP exceptions
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during token refresh: {str(e)}")

@app.post("/api/n8n/webhook/callback", response_model=TokenResponse)
async def n8n_callback(data: dict):
    """Endpoint for n8n to send AI responses back to be saved in Supabase."""
    try:
        session_id = data.get("sessionId")
        ai_response = data.get("output")
        user_id = data.get("userId")
        
        # Get optional fields from n8n
        message_type = data.get("messageType", "text") # Default to 'text'
        timestamp = data.get("timestamp", datetime.utcnow().isoformat()) # Default to now
        metadata = data.get("metadata", {}) # Default to an empty object

        # Add a check to ensure metadata is a dictionary
        if not isinstance(metadata, dict):
            metadata = {}

        if not all([session_id, ai_response, user_id]):
            raise HTTPException(status_code=400, detail="Missing required fields in callback data.")

        # This is where you would save the message to Supabase.
        # The print statement now includes all the necessary fields.
        print({
            "session_id": session_id,
            "user_id": user_id,
            "message_type": message_type,
            "content": ai_response,
            "sender": "ai",
            "timestamp": timestamp,
            "metadata": metadata
        })

        # In a real implementation with the Supabase Python client:
        # from supabase import create_client, Client
        # supabase_url = os.getenv("SUPABASE_URL")
        # supabase_key = os.getenv("SUPABASE_KEY")
        # supabase: Client = create_client(supabase_url, supabase_key)
        # supabase.table("chat_messages").insert({
        #     "session_id": session_id,
        #     "user_id": user_id,
        #     "message_type": message_type,
        #     "content": ai_response,
        #     "sender": "ai",
        #     "timestamp": timestamp,
        #     "metadata": metadata
        # }).execute()

        return TokenResponse(
            success=True,
            message="AI response received and processed.",
            userId=user_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing n8n callback: {str(e)}")


# ============================================================================
# N8N Proxy Endpoint (to avoid CORS issues)
# ============================================================================

@app.post("/api/n8n/proxy")
async def proxy_to_n8n(data: dict):
    """Proxy endpoint to forward requests to N8N webhooks and avoid CORS issues."""
    try:
        webhook_url = data.get("webhookUrl")
        payload = data.get("payload", {})
        
        if not webhook_url:
            raise HTTPException(status_code=400, detail="webhookUrl is required")
        
        # Forward the request to N8N
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Forward Authorization to n8n if we have an API key configured
            headers = {"Content-Type": "application/json"}
            if N8N_API_KEY:
                headers["Authorization"] = f"Bearer {N8N_API_KEY}"
            response = await client.post(
                webhook_url,
                json=payload,
                headers=headers
            )
            
            # Return the N8N response
            return {
                "success": True,
                "status": response.status_code,
                "data": response.json() if response.status_code == 200 else response.text
            }
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="N8N service timeout")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to N8N: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error proxying to N8N: {str(e)}")


# ============================================================================
# File Processing Endpoint
# ============================================================================

@sio.on('connect')
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.on('disconnect')
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

"""
Deprecated: /api/file-processing-status

This endpoint previously accepted file-processing status updates from n8n and broadcasted
them over Socket.IO to connected clients. We're moving to a Supabase-first architecture:

- n8n (or any processing service) should INSERT notifications directly into the
    `notifications` table in Supabase.
- Frontend clients already subscribe to the `notifications` table (see
    `frontend/src/context/NotificationContext.jsx`) and will receive real-time INSERTs.

Why this change?
- Removes an extra hop and server maintenance responsibility.
- Leverages Supabase's realtime/postgres_changes for low-latency delivery to all
    connected clients (browser tabs, devices).

If you still need a server-side compatibility layer, you can either:
1) Keep this endpoint and have it INSERT into Supabase (using a service role key).
2) Replace it with a lightweight forwarder that validates incoming requests and
     then inserts into Supabase. But the recommended approach is to let n8n write
     to Supabase directly using a secure service role key or using a dedicated
     server-side function (not exposed in the browser).

Example notification shape to INSERT into Supabase `notifications` table:

{
    "user_id": "PdO6B3E0oOcQlYIcvC5vn1Naflz2",
    "session_id": "rag_1761600323807_ohl1nq4e",
    "status": "pending",        # or "completed"
    "message": "File processing has started for this session.",
    "data": { "redirectUrl": null }
}

See `scripts/NOTIFICATIONS_N8N.md` for instructions and examples to configure n8n
to write directly to Supabase's REST API or to use a server-side helper.
"""

if __name__ == "__main__":
    import uvicorn
    # Allow overriding the port via the PORT environment variable
    port = int(os.getenv("PORT", "8011"))
    uvicorn.run(sio_app, host="0.0.0.0", port=port)