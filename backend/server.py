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

load_dotenv()

app = FastAPI(title="Google Auth API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        encrypted_refresh_token = None
        if token_data.refreshToken:
            encrypted_refresh_token = encrypt_token(token_data.refreshToken)
        
        # Prepare document for storage
        user_doc = {
            "userId": token_data.userId,
            "email": token_data.email,
            "displayName": token_data.displayName,
            "photoURL": token_data.photoURL,
            "accessToken": encrypted_access_token,
            "refreshToken": encrypted_refresh_token,
            "expiresAt": token_data.expiresAt, # Use expiresAt from frontend
            "scopes": token_data.scopes,
            "updatedAt": datetime.utcnow().isoformat()
        }
        
        # Upsert the document
        await db.user_tokens.update_one(
            {"userId": token_data.userId},
            {"$set": user_doc},
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

@app.post("/api/auth/refresh-token", response_model=UserToken)
async def refresh_access_token(user_id: str, refresh_token_data: dict):
    """Refresh user's Google OAuth access token using the refresh token."""
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
            response.raise_for_status()
            google_tokens = response.json()

        new_access_token = google_tokens.get("access_token")
        new_expires_in = google_tokens.get("expires_in")
        new_refresh_token = google_tokens.get("refresh_token", decrypted_refresh_token) # Google might issue a new refresh token

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
    except httpx.HTTPStatusError as e:
        # If refresh token is invalid, force re-login by deleting it
        if e.response.status_code == 400 and "invalid_grant" in e.response.text:
            await db.user_tokens.update_one(
                {"userId": user_id},
                {"$set": {"refreshToken": None, "accessToken": None, "expiresAt": None}}
            )
            raise HTTPException(status_code=401, detail="Invalid refresh token. Please re-authenticate.")
        raise HTTPException(status_code=e.response.status_code, detail=f"Google OAuth error during refresh: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error refreshing token: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)