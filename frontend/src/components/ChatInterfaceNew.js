import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { sendMessageToN8N, sendAudioToN8N } from '../utils/api';
import { tokenManager } from '../utils/tokenManager';
import VoiceRecorder from './VoiceRecorder';
import AudioPlayer from './AudioPlayer';
import MarkdownRenderer from './MarkdownRenderer';
import DashboardTab from './DashboardTab';
import SettingsTab from './SettingsTab';
import '../ChatInterfaceNew.css';

const ChatInterfaceNew = ({ user, onSignOut }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false); // Mobile drawer state
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Resolve user identification fields
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
      setShowSidebar(false); // Close mobile drawer after creating
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

      const accessToken = tokenManager.getAccessToken();
      const refreshToken = localStorage.getItem('refreshToken');
      
      const n8nResponse = await sendMessageToN8N(
        currentSession.session_id,
        userMessage,
        accessToken,
        refreshToken,
        resolvedUserName,
        resolvedUserEmail,
        resolvedUserId
      );
      
      let aiResponse = 'I received your message!';
      if (n8nResponse) {
        if (Array.isArray(n8nResponse) && n8nResponse.length > 0 && n8nResponse[0].output) {
          aiResponse = n8nResponse[0].output;
        } else if (n8nResponse.output) {
          aiResponse = n8nResponse.output;
        }
      }

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
        
        await loadSessions();
      } else {
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
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64AudioDataUrl = reader.result;
        
        const { error: userMsgError } = await supabase
          .from('chat_messages')
          .insert({
            session_id: currentSession.session_id,
            user_id: user.uid,
            message_type: 'audio',
            content: base64AudioDataUrl,
            sender: 'user',
            timestamp: new Date().toISOString()
          });

        if (userMsgError) throw userMsgError;
        await loadMessages(currentSession.session_id);

        const accessToken = tokenManager.getAccessToken();
        const refreshToken = localStorage.getItem('refreshToken');
        const base64AudioForN8N = base64AudioDataUrl.split(',')[1];

        const n8nResponseText = await sendAudioToN8N(
          currentSession.session_id,
          base64AudioForN8N,
          accessToken,
          refreshToken,
          resolvedUserName,
          resolvedUserEmail,
          resolvedUserId
        );
        
        let aiResponseContent;
        let messageType = 'text';
        let isAiAudio = false;

        // Handle response parsing (keeping original logic)
        const raw = typeof n8nResponseText === 'string' ? n8nResponseText.trim() : '';
        let parsed = null;
        try {
          parsed = JSON.parse(raw);
        } catch (e) {
          // Not JSON
        }

        if (typeof parsed === 'string') {
          try {
            const double = JSON.parse(parsed);
            parsed = double;
          } catch (e) {
            // Still string
          }
        }

        const trySetAudioFromBase64 = (b64) => {
          if (!b64) return false;
          if (String(b64).startsWith('data:audio')) {
            aiResponseContent = String(b64);
            return true;
          }
          let cleaned = String(b64).replace(/^"|"$/g, '').trim();
          cleaned = cleaned.replace(/\s+/g, '');
          if (cleaned.indexOf(' ') !== -1) cleaned = cleaned.replace(/ /g, '+');
          const prefix = cleaned.slice(0, 40);
          if (/^[A-Za-z0-9+/=]+$/.test(prefix)) {
            aiResponseContent = `data:audio/mpeg;base64,${cleaned}`;
            return true;
          }
          return false;
        };

        if (parsed) {
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
            }
          }
        }

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

  // Handle delete session
  const handleDeleteSession = async () => {
    if (!currentSession) return;
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
  };

  // Dashboard Tab
  if (activeTab === 'dashboard') {
    return (
      <div className="chat-interface-container">
        {renderSidebar()}
        <div className="main-chat-area">
          <DashboardTab user={user} onSwitchToChat={() => setActiveTab('chat')} />
        </div>
      </div>
    );
  }

  // Settings Tab
  if (activeTab === 'settings') {
    return (
      <div className="chat-interface-container">
        {renderSidebar()}
        <div className="main-chat-area">
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
            <SettingsTab user={user} onSignOut={onSignOut} />
          </div>
        </div>
      </div>
    );
  }

  // Sidebar Component
  function renderSidebar() {
    return (
      <>
        {/* Desktop Sidebar - Always visible on desktop */}
        <div className="sidebar">
          <div className="sidebar-header">
            <div className="app-title">
              <div className="app-logo">
                <img src="https://customer-assets.emergentagent.com/job_webauth-helper/artifacts/ksik3suf_nevermiss_logo-removebg-preview.png" alt="NeverMiss Logo" />
              </div>
              NeverMiss
            </div>
            
            {/* Navigation Tabs */}
            <div className="sidebar-navigation">
              <button
                className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => { setActiveTab('chat'); setShowSidebar(false); }}
              >
                <span className="nav-tab-icon">💬</span>
                Chat
              </button>
              <button
                className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => { setActiveTab('dashboard'); setShowSidebar(false); }}
              >
                <span className="nav-tab-icon">📊</span>
                Dashboard
              </button>
              <button
                className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => { setActiveTab('settings'); setShowSidebar(false); }}
              >
                <span className="nav-tab-icon">⚙️</span>
                Settings
              </button>
            </div>

            {/* New Chat Button */}
            <button onClick={createNewSession} className="new-chat-button">
              <span className="new-chat-button-icon">+</span>
              New Chat
            </button>
          </div>

          {/* Conversation List */}
          <div className="conversation-list">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => { setCurrentSession(session); setShowSidebar(false); }}
                className={`conversation-item ${currentSession?.id === session.id ? 'active' : ''}`}
              >
                <div className="conversation-title">{session.title}</div>
                <div className="conversation-meta">
                  <span>{new Date(session.created_at).toLocaleDateString()}</span>
                  <span>{session.message_count || 0} msgs</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Drawer Overlay */}
        <div
          className={`sidebar-backdrop ${showSidebar ? 'visible' : ''}`}
          onClick={() => setShowSidebar(false)}
        />
        <div className={`sidebar-drawer ${showSidebar ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="app-title">
              <div className="app-logo">💬</div>
              NeverMiss
            </div>
            
            {/* Navigation Tabs */}
            <div className="sidebar-navigation">
              <button
                className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => { setActiveTab('chat'); setShowSidebar(false); }}
              >
                <span className="nav-tab-icon">💬</span>
                Chat
              </button>
              <button
                className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => { setActiveTab('dashboard'); setShowSidebar(false); }}
              >
                <span className="nav-tab-icon">📊</span>
                Dashboard
              </button>
              <button
                className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => { setActiveTab('settings'); setShowSidebar(false); }}
              >
                <span className="nav-tab-icon">⚙️</span>
                Settings
              </button>
            </div>

            {/* New Chat Button */}
            <button onClick={createNewSession} className="new-chat-button">
              <span className="new-chat-button-icon">+</span>
              New Chat
            </button>
          </div>

          {/* Conversation List */}
          <div className="conversation-list">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => { setCurrentSession(session); setShowSidebar(false); }}
                className={`conversation-item ${currentSession?.id === session.id ? 'active' : ''}`}
              >
                <div className="conversation-title">{session.title}</div>
                <div className="conversation-meta">
                  <span>{new Date(session.created_at).toLocaleDateString()}</span>
                  <span>{session.message_count || 0} msgs</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  // Calculate if message is last AI message for breathing glow
  const getLastAIMessageIndex = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'ai') {
        return i;
      }
    }
    return -1;
  };

  const lastAIMessageIndex = getLastAIMessageIndex();

  // Chat Tab - Main UI
  return (
    <div className="chat-interface-container">
      {renderSidebar()}

      {/* Main Chat Area */}
      <div className="main-chat-area">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <button
              className="hamburger-button"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <div className="chat-header-title">
                {currentSession?.title || 'Chat'}
              </div>
              <div className="chat-header-subtitle">AI-powered assistant</div>
            </div>
          </div>
          <div className="chat-header-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="status-indicator"></div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Online</span>
            </div>
            {currentSession && (
              <button onClick={handleDeleteSession} className="delete-button" title="Delete conversation">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="chat-messages-container">
          {loading ? (
            <div className="loading-container">
              <div style={{ textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                <div style={{ color: 'var(--text-secondary)' }}>Loading messages...</div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-state-container">
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg style={{ width: '40px', height: '40px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="empty-state-title">Start a conversation</div>
                <div className="empty-state-description">
                  I can help you manage emails, calendar events, and tasks.
                </div>
                <div className="empty-state-suggestions">
                  <div className="suggestion-item">💬 "Show me unread emails from today"</div>
                  <div className="suggestion-item">📅 "Schedule a meeting tomorrow at 2 PM"</div>
                  <div className="suggestion-item">✅ "Create a task to review the report"</div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const isLastAIMessage = message.sender === 'ai' && index === lastAIMessageIndex;
                const shouldAutoplay = message.sender === 'ai' &&
                                     message.message_type === 'audio' &&
                                     message.metadata?.autoplay &&
                                     index === messages.length - 1;

                return (
                  <div
                    key={message.id || index}
                    className={`message-wrapper ${message.sender}`}
                  >
                    <div className={`${message.sender}-message ${isLastAIMessage ? 'last-ai-message' : ''}`}>
                      {message.message_type === 'audio' ? (
                        <AudioPlayer audioUrl={message.content} autoplay={shouldAutoplay} />
                      ) : message.sender === 'ai' ? (
                        <div className="message-text">
                          <MarkdownRenderer content={message.content} />
                        </div>
                      ) : (
                        <div className="message-text">{message.content}</div>
                      )}
                      <div className="timestamp">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              {sending && (
                <div className="message-wrapper ai">
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="input-area">
          <div className="input-container-wrapper">
            <div className="message-input-container">
              <div className="message-input-inner">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                  disabled={sending}
                  className="message-input"
                  rows="1"
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || sending}
                  className="send-button"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
                <VoiceRecorder onRecordingComplete={handleVoiceRecording} disabled={sending} />
              </div>
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              Connected to AI • Token auto-refresh enabled ✅
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterfaceNew;
