import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { sendMessageToN8N, sendAudioToN8N } from '../utils/api';
import { tokenManager } from '../utils/tokenManager';
import VoiceRecorder from './VoiceRecorder';
import AudioPlayer from './AudioPlayer';
import MarkdownRenderer from './MarkdownRenderer';
import NavigationTabs from './NavigationTabs';
import DashboardTab from './DashboardTab';
import SettingsTab from './SettingsTab';

const ChatInterface = ({ user, onSignOut }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Resolve user identification fields commonly used by Firebase and other providers
  const resolvedUserName = user?.displayName || user?.name || (user?.email ? user.email.split('@')[0] : '');
  const resolvedUserEmail = user?.email || '';
  const resolvedUserId = user?.uid || '';

  useEffect(() => {
    loadSessions();
  }, [user]);

  useEffect(() => {
    if (currentSession) {
      loadMessages(currentSession.session_id);
    }
  }, [currentSession]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.uid)
        .order('updated_at', { ascending: false});

      if (error) throw error;

      setSessions(data || []);
      
      if (data && data.length > 0) {
        setCurrentSession(data[0]);
      } else {
        createNewSession();
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.uid,
          session_id: sessionId,
          title: 'New Conversation',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          message_count: 0
        })
        .select()
        .single();

      if (error) throw error;

      setSessions([data, ...sessions]);
      setCurrentSession(data);
      setMessages([]);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const loadMessages = async (sessionId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentSession || sending) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    try {
      // Save user message
      const { error: userMsgError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: currentSession.session_id,
          user_id: user.uid,
          message_type: 'text',
          content: userMessage,
          sender: 'user',
          timestamp: new Date().toISOString()
        });

      if (userMsgError) throw userMsgError;
      await loadMessages(currentSession.session_id);

      // Get current tokens from tokenManager
      const accessToken = tokenManager.getAccessToken();
      const refreshToken = localStorage.getItem('refreshToken');
      
      // Debug: Log tokens being sent
      console.log('🔍 Sending to N8N:');
      console.log('  Access Token:', accessToken ? accessToken.substring(0, 20) + '...' : 'EMPTY');
      console.log('  Refresh Token:', refreshToken ? refreshToken.substring(0, 20) + '...' : 'EMPTY');
      
      // Send to N8N with tokens
      const n8nResponse = await sendMessageToN8N(
        currentSession.session_id,
        userMessage,
        accessToken,
        refreshToken,
        resolvedUserName,
        resolvedUserEmail,
        resolvedUserId
      );
      
      // Parse N8N response - it returns an array with output field
      let aiResponse = 'I received your message!';
      if (n8nResponse) {
        if (Array.isArray(n8nResponse) && n8nResponse.length > 0 && n8nResponse[0].output) {
          aiResponse = n8nResponse[0].output;
        } else if (n8nResponse.output) {
          aiResponse = n8nResponse.output;
        }
      }

      // Save AI response
      const { error: aiMsgError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: currentSession.session_id,
          user_id: user.uid,
          message_type: 'text',
          content: aiResponse,
          sender: 'ai',
          timestamp: new Date().toISOString()
        });

      if (aiMsgError) throw aiMsgError;
      await loadMessages(currentSession.session_id);

      // Auto-name conversation from first message (if still "New Conversation")
      if (currentSession.title === 'New Conversation' && messages.length === 0) {
        const conversationTitle = userMessage.length > 50 
          ? userMessage.substring(0, 50) + '...' 
          : userMessage;
        
        await supabase
          .from('chat_sessions')
          .update({ 
            title: conversationTitle,
            updated_at: new Date().toISOString(),
            message_count: 2
          })
          .eq('session_id', currentSession.session_id);
        
        // Reload sessions to show new title
        await loadSessions();
      } else {
        // Just update message count and timestamp
        await supabase
          .from('chat_sessions')
          .update({
            updated_at: new Date().toISOString(),
            message_count: messages.length + 2
          })
          .eq('session_id', currentSession.session_id);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleVoiceRecording = async (audioBlob) => {
    if (!currentSession) return;
    
    setSending(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64AudioDataUrl = reader.result;
        
        // Save user audio message to Supabase
        const { error: userMsgError } = await supabase
          .from('chat_messages')
          .insert({
            session_id: currentSession.session_id,
            user_id: user.uid,
            message_type: 'audio',
            content: base64AudioDataUrl, // Keep the full data URL for Supabase
            sender: 'user',
            timestamp: new Date().toISOString()
          });

        if (userMsgError) throw userMsgError;
        await loadMessages(currentSession.session_id);

        // Get tokens
        const accessToken = tokenManager.getAccessToken();
        const refreshToken = localStorage.getItem('refreshToken');
        
        // Debug: Log tokens being sent
        console.log('🔍 Sending AUDIO to N8N:');
        console.log('  Access Token:', accessToken ? accessToken.substring(0, 20) + '...' : 'EMPTY');
        console.log('  Refresh Token:', refreshToken ? refreshToken.substring(0, 20) + '...' : 'EMPTY');
        
        // Strip the data URL prefix to send only the raw base64 string
        const base64AudioForN8N = base64AudioDataUrl.split(',')[1];

        // Send audio to N8N webhook
        const n8nResponseText = await sendAudioToN8N(
          currentSession.session_id,
          base64AudioForN8N, // Send only the base64 part
          accessToken,
          refreshToken,
          resolvedUserName,
          resolvedUserEmail,
          resolvedUserId
        );
        
        let aiResponseContent;
        let messageType = 'text'; // Default to text
        let isAiAudio = false;

        // Normalize and try to interpret the response in multiple common shapes:
        // - JSON array: [{ data: "<base64>" }]
        // - JSON object: { data: "<base64>" } or { output: "..." }
        // - Plain data URL string: "data:audio/mpeg;base64,..."
        // - Plain base64 string: "SUQz..."
        const raw = typeof n8nResponseText === 'string' ? n8nResponseText.trim() : '';
        console.debug('N8N raw response (truncated):', raw ? raw.slice(0, 300) : '<empty>');

        let parsed = null;
        try {
          parsed = JSON.parse(raw);
        } catch (e) {
          // Not JSON -> we'll handle as plain string below
        }

        // If parsed is a string, it may be double-encoded JSON like "[{\"data\":\"...\"}]"
        if (typeof parsed === 'string') {
          try {
            const double = JSON.parse(parsed);
            parsed = double;
          } catch (e) {
            // still a plain string - we'll handle below
          }
        }

        const trySetAudioFromBase64 = (b64) => {
          if (!b64) return false;
          // If it already looks like a data URL, accept it
          if (String(b64).startsWith('data:audio')) {
            aiResponseContent = String(b64);
            return true;
          }
          // Strip potential surrounding quotes
          let cleaned = String(b64).replace(/^"|"$/g, '').trim();
          // Remove all whitespace/newlines which sometimes appear in base64 payloads
          cleaned = cleaned.replace(/\s+/g, '');
          // If plus signs were turned into spaces earlier in transport, try to repair
          if (cleaned.indexOf(' ') !== -1) cleaned = cleaned.replace(/ /g, '+');
          // Basic base64 check using a portion of the string
          const prefix = cleaned.slice(0, 40);
          if (/^[A-Za-z0-9+/=]+$/.test(prefix)) {
            aiResponseContent = `data:audio/mpeg;base64,${cleaned}`;
            return true;
          }
          return false;
        };

        if (parsed) {
          // Parsed JSON - handle different structures
          if (Array.isArray(parsed) && parsed.length > 0) {
            const first = parsed[0];
            if (first && typeof first === 'object') {
              if (first.data && trySetAudioFromBase64(first.data)) {
                messageType = 'audio';
                isAiAudio = true;
              } else if (first.output && typeof first.output === 'string') {
                aiResponseContent = first.output;
                messageType = 'text';
              }
            } else if (typeof first === 'string') {
              if (trySetAudioFromBase64(first)) {
                messageType = 'audio';
                isAiAudio = true;
              } else {
                aiResponseContent = first;
                messageType = 'text';
              }
            }
          } else if (typeof parsed === 'object') {
            if (parsed.data && trySetAudioFromBase64(parsed.data)) {
              messageType = 'audio';
              isAiAudio = true;
            } else if (parsed.output && typeof parsed.output === 'string') {
              aiResponseContent = parsed.output;
              messageType = 'text';
            } else if (typeof parsed === 'string' && trySetAudioFromBase64(parsed)) {
              messageType = 'audio';
              isAiAudio = true;
            }
          } else if (typeof parsed === 'string') {
            if (trySetAudioFromBase64(parsed)) {
              messageType = 'audio';
              isAiAudio = true;
            } else {
              aiResponseContent = parsed;
              messageType = 'text';
            }
          }
        }

        // If parsing as JSON didn't yield an audio result, try the raw string
        if (!isAiAudio && raw) {
          const rawUnquoted = raw.replace(/^"|"$/g, '').trim();
          if (rawUnquoted.startsWith('data:audio')) {
            aiResponseContent = rawUnquoted;
            messageType = 'audio';
            isAiAudio = true;
          } else if (trySetAudioFromBase64(rawUnquoted)) {
            messageType = 'audio';
            isAiAudio = true;
          }
        }

        if (!isAiAudio && !aiResponseContent) {
          aiResponseContent = 'Audio received, but the response was not in the expected format.';
        }

        // Save AI response
        const { error: aiMsgError } = await supabase
          .from('chat_messages')
          .insert({
            session_id: currentSession.session_id,
            user_id: user.uid,
            message_type: messageType,
            content: aiResponseContent,
            sender: 'ai',
            timestamp: new Date().toISOString(),
            metadata: { autoplay: isAiAudio }
          });

        if (aiMsgError) throw aiMsgError;
        await loadMessages(currentSession.session_id);

        // Update session
        await supabase
          .from('chat_sessions')
          .update({
            updated_at: new Date().toISOString(),
            message_count: messages.length + 2
          })
          .eq('session_id', currentSession.session_id);
      };
    } catch (error) {
      console.error('Error sending audio:', error);
      alert('Failed to send audio message.');
    } finally {
      setSending(false);
    }
  };

  if (activeTab === 'dashboard') {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        <DashboardTab user={user} onSwitchToChat={() => setActiveTab('chat')} />
      </div>
    );
  }

  if (activeTab === 'settings') {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 overflow-y-auto">
          <SettingsTab user={user} onSignOut={onSignOut} />
        </div>
      </div>
    );
  }

  // Chat Tab
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`${showSidebar ? 'w-80' : 'w-0'} bg-white dark:bg-gray-800 border-r border-blue-100 dark:border-gray-700 transition-all duration-300 overflow-hidden flex flex-col`}>
          <div className="p-4 border-b border-blue-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">NeverMiss</h2>
              <button
                onClick={() => setShowSidebar(false)}
                className="lg:hidden text-white hover:bg-white/20 rounded-lg p-2 transition"
              >
                ✕
              </button>
            </div>
            <button
              onClick={createNewSession}
              className="w-full bg-white text-blue-600 px-4 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 group"
            >
              <span className="text-xl group-hover:rotate-90 transition-transform">+</span>
              <span>New Chat</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setCurrentSession(session)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${
                  currentSession?.id === session.id
                    ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white shadow-lg scale-105'
                    : 'bg-blue-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-gray-600'
                }`}
              >
                <div className="font-semibold truncate">{session.title}</div>
                <div className="text-xs mt-1 opacity-75">
                  {new Date(session.created_at).toLocaleDateString()} • {session.message_count || 0} messages
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3">
              {!showSidebar && (
                <button
                  onClick={() => setShowSidebar(true)}
                  className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-2 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                  {currentSession?.title || 'Chat'}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">AI-powered assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Online</span>
              </div>
              {currentSession && (
                <button
                  onClick={async () => {
                    if (window.confirm('Delete this conversation?')) {
                      try {
                        await supabase
                          .from('chat_messages')
                          .delete()
                          .eq('session_id', currentSession.session_id);
                        
                        await supabase
                          .from('chat_sessions')
                          .delete()
                          .eq('id', currentSession.id);
                        
                        await loadSessions();
                      } catch (error) {
                        console.error('Error deleting session:', error);
                      }
                    }
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                  title="Delete conversation"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
                  <div className="text-gray-600 dark:text-gray-300">Loading messages...</div>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md animate-fade-in">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-full mx-auto mb-6 flex items-center justify-center animate-bounce-slow">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">Start a conversation</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">I can help you manage emails, calendar events, and tasks.</p>
                  <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                    <p>💬 "Show me unread emails from today"</p>
                    <p>📅 "Schedule a meeting tomorrow at 2 PM"</p>
                    <p>✅ "Create a task to review the report"</p>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message, index) => {
                // Check if this is the last AI message
                const isLastAIMessage = message.sender === 'ai' && 
                  index === messages.length - 1 ||
                  (index < messages.length - 1 && messages[index + 1].sender === 'user');
                
                const shouldAutoplay = message.sender === 'ai' &&
                                     message.message_type === 'audio' &&
                                     message.metadata?.autoplay &&
                                     index === messages.length - 1;

                return (
                  <div
                    key={message.id || index}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-md ${
                        message.sender === 'user'
                          ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white rounded-br-none'
                          : `bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-bl-none border-2 border-blue-300 dark:border-blue-600 ${isLastAIMessage ? 'animate-glow' : ''}`
                      }`}
                    >
                      {message.message_type === 'audio' ? (
                        <AudioPlayer audioUrl={message.content} autoplay={shouldAutoplay} />
                      ) : message.sender === 'ai' ? (
                        <MarkdownRenderer content={message.content} />
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      )}
                      <div className={`text-xs mt-2 ${message.sender === 'user' ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {sending && (
              <div className="flex justify-start animate-slide-up">
                <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-2xl rounded-bl-none px-5 py-3 shadow-md border-2 border-blue-300 dark:border-blue-600 animate-glow">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-blue-700 rounded-full animate-pulse delay-100"></div>
                    <div className="w-2 h-2 bg-blue-800 rounded-full animate-pulse delay-200"></div>
                    <span className="text-gray-600 dark:text-gray-300 ml-2">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end space-x-3">
                <div className="flex-1 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 rounded-2xl opacity-20 blur-lg animate-pulse"></div>
                  <textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                    disabled={sending}
                    className="relative w-full px-5 py-4 rounded-2xl border-2 border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 resize-none transition-all duration-300 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 shadow-lg"
                    rows="1"
                    style={{ maxHeight: '120px' }}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || sending}
                  className="px-6 py-4 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white rounded-2xl font-semibold hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Send</span>
                </button>
                <VoiceRecorder onRecordingComplete={handleVoiceRecording} disabled={sending} />
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                Connected to AI • Token auto-refresh enabled ✅
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
