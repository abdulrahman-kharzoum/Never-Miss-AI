import React, { useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import ChatInterfaceNew from './components/ChatInterfaceNew';
import PricingTab from './components/PricingTab';
import AboutTab from './components/AboutTab';
import { tokenManager } from './utils/tokenManager';
import { storeUserToken } from './utils/api';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [landingTab, setLandingTab] = useState('home');
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Load tokens from localStorage
    tokenManager.loadTokens();

    const loadingTimeout = setTimeout(() => {
      console.log('⏱️ Loading timeout - Firebase auth check complete');
      setLoading(false);
    }, 15000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(loadingTimeout);
      if (currentUser) {
        setUser(currentUser);
        const existingAccessToken = localStorage.getItem('accessToken');
        const existingUserId = localStorage.getItem('userId');
        if (existingAccessToken && existingUserId === currentUser.uid) {
          console.log('🔄 Page refresh detected - loading tokens from localStorage');
          tokenManager.loadTokens();
        } else {
          console.log('🆕 New session detected - tokens should be set by handleGoogleSignIn');
        }
      } else {
        setUser(null);
        // Correct the function call from clearTokens to clearAllTokens
        tokenManager.clearAllTokens();
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);

  const handleGoogleAuth = async (isSignUp = false) => {
    setLoading(true);
    setError(null);
    try {
      // Use the globally configured googleProvider from firebase.js
      // No need to create a new one or add scopes here.
      if (isSignUp) {
        // For Sign Up, we ensure the consent screen is always shown to get a refresh token.
        googleProvider.setCustomParameters({
          prompt: 'consent',
        });
      } else {
        // For Login, we don't need to force the consent screen.
        googleProvider.setCustomParameters({
          prompt: 'select_account',
        });
      }

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const googleAccessToken = credential?.accessToken;
      // A refresh token is usually only provided on the very first authorization
      const googleRefreshToken = user.refreshToken || credential?.refreshToken;
      
      console.log("✅ Google Auth Successful!");
      console.log("🔑 Access Token:", googleAccessToken);
      console.log("🔄 Refresh Token:", googleRefreshToken);
      console.log("👤 User Object:", user);

      if (!googleAccessToken) {
        throw new Error('Failed to get Google access token');
      }
      
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
      setUser(user);
      
      const tokenData = {
        userId: user.uid,
        email: user.email,
        displayName: user.displayName || 'User',
        photoURL: user.photoURL,
        accessToken: googleAccessToken,
        // Only send the refresh token if we get a new one
        refreshToken: googleRefreshToken || '',
        expiresAt: expiresAt,
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
      };
      
      await storeUserToken(tokenData);
      
      // Use the correct refresh token from the database if one isn't provided by Google
      const storedRefreshToken = localStorage.getItem('refreshToken');
      tokenManager.setTokens(googleAccessToken, googleRefreshToken || storedRefreshToken || '', user.uid, expiresAt);

    } catch (error) {
      console.error('❌ Error during Google authentication:', error);
      setError('Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      // Use the new function to only clear session-specific tokens
      tokenManager.clearSessionTokens();
      console.log('✅ User signed out, session tokens cleared');
    } catch (error) {
      console.error('❌ Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center animate-gradient" style={{background: 'linear-gradient(135deg, #3a2766 0%, #6f5c99 50%, #00d4ff 100%)'}}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mb-4"></div>
          <div className="text-white text-xl font-semibold mb-4">Loading NeverMiss...</div>
          <p className="text-white/70 text-sm mb-6">This is taking longer than usual...</p>
          <button onClick={() => { setLoading(false); setUser(null); tokenManager.clearAllTokens(); }}
            className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-300 backdrop-blur-sm">
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
        {/* Navigation Header */}
        <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 backdrop-blur-lg rounded-full">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <span className="text-2xl font-bold text-white">NeverMiss AI</span>
              </div>
              <div className="hidden md:flex items-center space-x-2">
                <button
                  onClick={() => setLandingTab('home')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                    landingTab === 'home'
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => setLandingTab('pricing')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                    landingTab === 'pricing'
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Pricing
                </button>
                <button
                  onClick={() => setLandingTab('about')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                    landingTab === 'about'
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  About
                </button>
                <button
                  onClick={() => handleGoogleAuth(false)} // Login
                  className="ml-4 px-6 py-2 bg-white/20 text-white rounded-lg font-semibold hover:bg-white/30 transition-all duration-300"
                >
                  Login
                </button>
                <button
                  onClick={() => handleGoogleAuth(true)} // Sign Up
                  className="ml-2 px-6 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  Sign Up
                </button>
              </div>
              <div className="md:hidden flex items-center">
                <button
                  onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                >
                  <span className="sr-only">Open main menu</span>
                  {isMobileMenuOpen ? (
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
          {isMobileMenuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <button
                  onClick={() => { setLandingTab('home'); setMobileMenuOpen(false); }}
                  className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                    landingTab === 'home' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => { setLandingTab('pricing'); setMobileMenuOpen(false); }}
                  className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                    landingTab === 'pricing' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Pricing
                </button>
                <button
                  onClick={() => { setLandingTab('about'); setMobileMenuOpen(false); }}
                  className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                    landingTab === 'about' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  About
                </button>
                <button
                  onClick={() => { handleGoogleAuth(false); setMobileMenuOpen(false); }} // Login
                  className="block w-full text-left mt-2 px-4 py-2 bg-white/20 text-white rounded-lg font-semibold hover:bg-white/30 transition-all duration-300"
                >
                  Login
                </button>
                <button
                  onClick={() => { handleGoogleAuth(true); setMobileMenuOpen(false); }} // Sign Up
                  className="block w-full text-left mt-1 px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300"
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}
        </nav>

        {/* Content Area */}
        {landingTab === 'home' && (
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-md w-full">
              <div className="text-center mb-8 animate-fade-in">
                <div className="inline-block p-4 bg-white/20 backdrop-blur-lg rounded-full mb-4 animate-bounce-slow">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">NeverMiss</h1>
                <p className="text-xl text-white/90 font-medium">Your AI-Powered Productivity Assistant</p>
                <p className="text-white/70 mt-2">Manage emails, calendar, and tasks with AI</p>
              </div>
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 animate-slide-up">
                {error && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center space-x-2 mb-4">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full animate-pulse delay-100"></div>
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-700 to-blue-800 rounded-full animate-pulse delay-200"></div>
                  </div>
                  <p className="text-gray-700 font-medium">Welcome! Sign in to get started</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={() => handleGoogleAuth(false)} // Login
                    className="w-full bg-white border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-xl font-semibold flex items-center justify-center hover:shadow-lg hover:scale-105 transition-all duration-300 group">
                    <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Login with Google
                  </button>
                  <button onClick={() => handleGoogleAuth(true)} // Sign Up
                    className="w-full bg-purple-600 text-white px-8 py-4 rounded-xl font-semibold flex items-center justify-center hover:shadow-xl hover:scale-105 transition-all duration-300 group">
                    <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign Up with Google
                  </button>
                </div>
                <div className="mt-6 text-center">
                  <p className="text-xs text-gray-500">
                    By signing up, you agree to connect Gmail, Calendar, and Drive
                  </p>
                </div>
              </div>
              <div className="mt-6 text-center text-white/80 text-sm">
                <p>✨ Never miss a meeting again</p>
              </div>
            </div>
          </div>
        )}

        {landingTab === 'pricing' && <PricingTab />}
        {landingTab === 'about' && <AboutTab />}
      </div>
    );
  }

  return (
    <ThemeProvider userId={user?.uid}>
      <div className="h-screen">
        <ChatInterfaceNew user={user} onSignOut={handleSignOut} />
      </div>
    </ThemeProvider>
  );
}

export default App;