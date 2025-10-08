import React, { useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import ChatInterface from './components/ChatInterface';
import { tokenManager } from './utils/tokenManager';
import { storeUserToken } from './utils/api';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load tokens from localStorage
    tokenManager.loadTokens();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Get tokens from Firebase
        try {
          const token = await currentUser.getIdToken();
          
          // Calculate expiry time (1 hour from now)
          const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
          
          // Store tokens in backend
          const tokenData = {
            userId: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || 'User',
            photoURL: currentUser.photoURL,
            accessToken: token,
            refreshToken: currentUser.refreshToken || null,
            expiresAt: expiresAt,
            scopes: [
              'gmail.readonly',
              'gmail.modify',
              'calendar',
              'calendar.events',
              'drive',
              'drive.file'
            ]
          };
          
          // Try to store token, but don't fail if backend is down
          try {
            await storeUserToken(tokenData);
            console.log('✅ Tokens stored successfully in backend');
          } catch (backendError) {
            console.warn('⚠️ Backend storage failed, continuing anyway:', backendError.message);
          }
          
          // Store in token manager (localStorage)
          tokenManager.setTokens(
            token,
            currentUser.refreshToken,
            currentUser.uid,
            expiresAt
          );
          
          console.log('✅ Tokens stored in localStorage');
        } catch (error) {
          console.error('❌ Error processing tokens:', error);
          setError('Failed to process authentication tokens');
        }
      } else {
        setUser(null);
        tokenManager.clearTokens();
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      console.log('✅ User signed in:', result.user.email);
    } catch (error) {
      console.error('❌ Error signing in:', error);
      setError('Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      tokenManager.clearTokens();
      console.log('✅ User signed out');
    } catch (error) {
      console.error('❌ Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 animate-gradient">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mb-4"></div>
          <div className="text-white text-xl font-semibold">Loading NeverMiss...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 animate-gradient p-4">
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
                <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-teal-500 rounded-full animate-pulse delay-100"></div>
                <div className="w-2 h-2 bg-gradient-to-r from-teal-400 to-blue-500 rounded-full animate-pulse delay-200"></div>
              </div>
              <p className="text-gray-700 font-medium">Welcome! Sign in to get started</p>
            </div>

            <button
              onClick={handleGoogleSignIn}
              className="w-full bg-white border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-xl font-semibold flex items-center justify-center hover:shadow-xl hover:scale-105 transition-all duration-300 group"
            >
              <svg className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                By signing in, you agree to connect Gmail, Calendar, and Drive
              </p>
            </div>
          </div>

          <div className="mt-6 text-center text-white/80 text-sm">
            <p>✨ Never miss a meeting again</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <ChatInterface user={user} onSignOut={handleSignOut} />
    </div>
  );
}

export default App;