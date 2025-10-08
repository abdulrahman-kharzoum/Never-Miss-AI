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
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userId', userId);
    localStorage.setItem('expiresAt', expiresAt);
  }

  loadTokens() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
    this.userId = localStorage.getItem('userId');
    this.expiresAt = localStorage.getItem('expiresAt');
  }

  clearTokens() {
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

  isTokenExpired() {
    if (!this.expiresAt) return true;
    
    const expiryTime = new Date(this.expiresAt).getTime();
    const currentTime = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    
    return currentTime >= (expiryTime - bufferTime);
  }

  async refreshAccessToken() {
    if (!this.refreshToken || !this.userId) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/refresh-token`, {
        user_id: this.userId,
        refresh_token: this.refreshToken
      });

      const { accessToken, expiresAt } = response.data;
      
      // Update tokens
      this.accessToken = accessToken;
      this.expiresAt = expiresAt;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('expiresAt', expiresAt);
      
      console.log('✅ Token refreshed successfully');
      return accessToken;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      this.clearTokens();
      throw error;
    }
  }
}

export const tokenManager = new TokenManager();

// Axios interceptor for automatic token refresh
axios.interceptors.request.use(
  async (config) => {
    // Check if token is expired before making request
    if (tokenManager.isTokenExpired()) {
      try {
        await tokenManager.refreshAccessToken();
      } catch (error) {
        console.error('Failed to refresh token, redirecting to login');
        window.location.href = '/';
        return Promise.reject(error);
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Axios response interceptor for 401 errors
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 error and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        await tokenManager.refreshAccessToken();
        return axios(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed, logging out');
        tokenManager.clearTokens();
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default tokenManager;