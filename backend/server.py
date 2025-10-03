from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os
from dotenv import load_dotenv
from cryptography.fernet import Fernet
import base64
import hashlib

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
N8N_API_KEY = os.getenv("N8N_API_KEY", "n8n-secure-api-key-change-this")

# Pydantic models
class TokenData(BaseModel):
    userId: str
    email: str
    displayName: str
    photoURL: Optional[str] = None
    accessToken: str
    refreshToken: Optional[str] = None
    expiresAt: Optional[str] = None
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
    """Store user's Google OAuth token securely"""
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
            "expiresAt": token_data.expiresAt,
            "scopes": token_data.scopes,
            "updatedAt": datetime.utcnow().isoformat()
        }
        
        # Upsert the document
        await db.user_tokens.update_one(
            {"userId": token_data.userId},
            {"$set": user_doc},
            upsert=True
        )
        
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
        
        return UserToken(
            userId=user_doc["userId"],
            email=user_doc["email"],
            displayName=user_doc["displayName"],
            photoURL=user_doc.get("photoURL"),
            accessToken=decrypted_token,
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)