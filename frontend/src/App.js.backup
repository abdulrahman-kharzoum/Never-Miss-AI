import React, { useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null); // New state for token expiration
  const [showToken, setShowToken] = useState(false);
  const [tokenStored, setTokenStored] = useState(false);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Check if user is already signed in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Function to handle Google Sign In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Get Google-specific access and refresh tokens
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const googleAccessToken = credential.accessToken;
      const googleRefreshToken = credential.refreshToken; // This will be available if access_type: 'offline' is set
      const expiresIn = credential.expiresIn; // Get expires_in from credential
      const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null; // Calculate expiresAt

      // Store token in state
      setAccessToken(googleAccessToken);
      setExpiresAt(expiresAt); // Store expiresAt in state
      setUser(user);

      // Send tokens to backend API
      await storeTokenInBackend(user, googleAccessToken, googleRefreshToken, expiresAt);
      
      console.log('✅ User signed in successfully');
      console.log('User ID:', user.uid);
      console.log('Email:', user.email);
      
    } catch (error) {
      console.error('❌ Error signing in:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to check token validity and refresh if needed
  const checkAndRefreshToken = async () => {
    if (!user || !expiresAt) return true; // No user or no expiration, assume valid

    const currentTime = new Date().getTime();
    const expirationTime = new Date(expiresAt).getTime();

    // Refresh token if it expires within the next 5 minutes (300,000 ms)
    if (expirationTime - currentTime < 300000) {
      console.log('⏳ Access token expiring soon, attempting to refresh...');
      try {
        const backendUrl = BACKEND_URL || '';
        const response = await axios.post(`${backendUrl}/api/auth/refresh-token`, {
          userId: user.uid,
        });

        if (response.data.accessToken) {
          setAccessToken(response.data.accessToken);
          setExpiresAt(response.data.expiresAt); // Update with new expiration
          console.log('✅ Access token refreshed successfully');
          return true;
        }
      } catch (refreshError) {
        console.error('❌ Error refreshing token:', refreshError.response?.data || refreshError.message);
        setError('Session expired. Please sign in again.');
        handleSignOut(); // Force re-login if refresh fails
        return false;
      }
    }
    return true; // Token is still valid or successfully refreshed
  };

  // Function to store tokens in backend
  const storeTokenInBackend = async (user, accessToken, refreshToken, expiresAt) => {
    try {
      console.log('📤 Attempting to store tokens in backend...');
      console.log('Backend URL:', BACKEND_URL || '(same origin)');
      
      const backendUrl = BACKEND_URL || '';
      const response = await axios.post(`${backendUrl}/api/auth/store-token`, {
        userId: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresAt: expiresAt, // Sending expiresAt to backend
        scopes: [
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.modify',
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events',
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/drive.file'
        ]
      });

      if (response.data.success) {
        setTokenStored(true);
        console.log('✅ Tokens stored in backend successfully');
      }
    } catch (error) {
      console.error('❌ Error storing tokens in backend:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      let errorMessage = 'Tokens stored locally but failed to save to backend';
      if (error.response) {
        errorMessage += `: ${error.response.status} - ${error.response.data?.detail || error.response.statusText}`;
      } else if (error.request) {
        errorMessage += ': Network error - backend might be unreachable';
      } else {
        errorMessage += `: ${error.message}`;
      }
      
      setError(errorMessage);
      
      // Still mark as successful since user is authenticated
      // The token can be accessed from Firebase auth state
      console.log('ℹ️ User is still authenticated, token available from Firebase');
    }
  };

  // Function to handle sign out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setAccessToken(null);
      setTokenStored(false);
      setShowToken(false);
      setCopySuccess(false);
      console.log('✅ User signed out successfully');
    } catch (error) {
      console.error('❌ Error signing out:', error);
      setError(error.message);
    }
  };

  // Function to copy token to clipboard
  const copyTokenToClipboard = () => {
    if (accessToken) {
      navigator.clipboard.writeText(accessToken);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Show loading state
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl pulse-animation">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        
        {/* Header */}
        <div className="text-center mb-8 fade-in">
          <h1 className="text-4xl font-bold text-white mb-2">
            Google OAuth Authentication
          </h1>
          <p className="text-purple-200">
            Connect your Google account for n8n integration
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 fade-in">
          
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Not Signed In */}
          {!user && (
            <div className="text-center">
              <div className="mb-8">
                <svg className="w-24 h-24 mx-auto text-purple-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-gray-600 mb-2">Sign in to get started</p>
                <p className="text-sm text-gray-400">
                  Access: Gmail, Calendar, Drive, Profile
                </p>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="google-btn bg-white border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-semibold flex items-center justify-center mx-auto hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {loading ? 'Signing in...' : 'Sign in with Google'}
              </button>
            </div>
          )}

          {/* Signed In */}
          {user && (
            <div className="fade-in">
              {/* User Profile */}
              <div className="flex items-center mb-6 pb-6 border-b">
                <img
                  src={user.photoURL || 'https://via.placeholder.com/100'}
                  alt="Profile"
                  className="w-20 h-20 rounded-full mr-4 border-4 border-purple-200"
                />
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800">{user.displayName}</h2>
                  <p className="text-gray-600">{user.email}</p>
                  <p className="text-sm text-gray-400 mt-1">User ID: {user.uid}</p>
                </div>
              </div>

              {/* Token Status */}
              {tokenStored && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                  <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="text-green-800 font-semibold">Token Stored Successfully</p>
                    <p className="text-green-600 text-sm">Ready for n8n integration</p>
                  </div>
                </div>
              )}

              {/* API Information */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  n8n Integration Endpoint
                </h3>
                <div className="bg-white p-3 rounded border border-blue-300 font-mono text-sm text-gray-700 overflow-x-auto">
                  GET {BACKEND_URL}/api/auth/get-token/{user.uid}
                </div>
                <p className="text-blue-600 text-xs mt-2">
                  Use this endpoint in your n8n workflows with the API key
                </p>
              </div>

              {/* Access Token Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Access Token
                  </h3>
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    {showToken ? '🙈 Hide' : '👁️ Show'}
                  </button>
                </div>

                {showToken && accessToken && (
                  <div className="relative">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 token-text text-xs text-gray-700 max-h-40 overflow-y-auto">
                      {accessToken}
                    </div>
                    <button
                      onClick={copyTokenToClipboard}
                      className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {copySuccess ? '✓ Copied!' : 'Copy Token'}
                    </button>
                  </div>
                )}

                {!showToken && (
                  <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 text-center text-gray-500">
                    Click "Show" to reveal the access token
                  </div>
                )}
              </div>

              {/* Granted Scopes */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Granted Permissions</h3>
                <div className="grid grid-cols-2 gap-2">
                  {['Gmail', 'Google Calendar', 'Google Drive', 'Profile'].map((scope, index) => (
                    <div key={index} className="flex items-center bg-gray-50 p-2 rounded border border-gray-200">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-700">{scope}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-purple-200 text-sm">
          <p>Secure OAuth 2.0 Authentication • Token encrypted in backend</p>
        </div>
      </div>
    </div>
  );
}

export default App;
