import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

class TokenManager {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.userId = null;
    this.expiresAt = null;
  }

  setTokens(accessToken, refreshToken, userId, expiresAt) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.userId = userId;
    this.expiresAt = expiresAt;
    
    // Store in localStorage for persistence
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    if (userId) localStorage.setItem('userId', userId);
    if (expiresAt) localStorage.setItem('expiresAt', expiresAt);
  }

  loadTokens() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
    this.userId = localStorage.getItem('userId');
    this.expiresAt = localStorage.getItem('expiresAt');
  }

  clearSessionTokens() {
    // Only clear the short-lived access token and its expiry
    this.accessToken = null;
    this.expiresAt = null;
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('expiresAt');
  }

  clearAllTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.userId = null;
    this.expiresAt = null;
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('expiresAt');
  }

  getAccessToken() {
    return this.accessToken;
  }

  getUserId() {
    return this.userId;
  }

  async ensureValidToken() {
    // 1. If we have an access token, validate it with Google's tokeninfo endpoint.
    if (this.accessToken) {
      try {
        await axios.get(`https://oauth2.googleapis.com/tokeninfo?access_token=${this.accessToken}`);
        return this.accessToken;
      } catch (error) {
        console.warn('⚠️ Current token is invalid or expired. Proceeding to refresh...');
      }
    } else {
    }

    // 2. If there's no token or if it's invalid, we must refresh it.
    if (!this.userId) {
      console.error('❌ Cannot refresh token without a user ID. User may need to log in again.');
      return null;
    }

    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/refresh-token`, {
        user_id: this.userId,
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_N8N_API_KEY}`
        }
      });

      const { accessToken, expiresAt, refreshToken } = response.data;

      // 3. As you requested, validate the NEWLY received token with Google before using it.
      await axios.get(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`);

      // 4. Store the new, verified tokens.
      this.setTokens(accessToken, refreshToken, this.userId, expiresAt);
      
      return accessToken;
    } catch (error) {
      console.error('❌ A critical error occurred during token refresh and validation:', error);
      // If the refresh process itself fails, the user's session is likely invalid.
      this.clearAllTokens();
      // Force a reload to prompt the user to log in again.
      window.location.reload();
      return null;
    }
  }
}

export const tokenManager = new TokenManager();

export default tokenManager;
