import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { sendMessageToN8N, sendAudioToN8N, N8N_WEBHOOK_URL, PLAN_WEBHOOK, STUDY_GUIDE_WEBHOOK, UNIVERSITY_GUIDE_WEBHOOK } from '../utils/api';
import { tokenManager } from '../utils/tokenManager';
import VoiceRecorder from './VoiceRecorder';
import AudioPlayer from './AudioPlayer';
import MarkdownRenderer from './MarkdownRenderer';
import DashboardTab from './DashboardTab';
import SettingsTab from './SettingsTab';
import PricingTab from './PricingTab';
import AboutTab from './AboutTab';
import StudyGuideTab from './StudyGuideTab';
import NotificationBell from './NotificationBell';
import '../ChatInterfaceNew.css';
import { useTheme } from '../context/ThemeContext';

const ChatInterfaceNew = ({ user, onSignOut }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false); // Mobile drawer state
  const [isExpanded, setIsExpanded] = useState(false); // Expanded input state
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Resolve user identification fields
  const resolvedUserName = user?.displayName || user?.name || (user?.email ? user.email.split('@')[0] : '');
  const resolvedUserEmail = user?.email || '';
  const resolvedUserId = user?.uid || '';

  const { theme } = useTheme();

  const getSessionWebhook = (session) => {
    try {
      if (!session) return N8N_WEBHOOK_URL;
      if (session.webhook_url) return session.webhook_url;
      const stored = localStorage.getItem(`session_webhook_${session.session_id}`);
      if (stored) return stored;
    } catch (e) {
      // ignore
    }
    return N8N_WEBHOOK_URL;
  };

  // Create a new session and associate it with a webhook URL. We persist webhook mapping in localStorage
  const createSessionWithWebhook = useCallback(async (webhookUrl, source = 'tab') => {
    try {
      console.log('Creating session with webhook:', webhookUrl, 'source:', source);
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const insertPayload = {
        user_id: user.uid,
        session_id: sessionId,
        title: source === 'study_guide' ? 'Study Guide Chat' : source === 'university_guide' ? 'University Guide' : 'New Conversation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: 0,
      };

      // Try to include webhook_url field if table supports it (fail silently otherwise)
      try {
        insertPayload.webhook_url = webhookUrl;
      } catch (e) {
        // ignore
      }

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert(insertPayload)
        .select()
        .single();

      let createdSession = null;
      
      if (error) {
        // If insertion fails because of unknown column, retry without webhook_url
        if (error.message && error.message.includes('column')) {
          const { data: retryData, error: retryErr } = await supabase
            .from('chat_sessions')
            .insert({ ...insertPayload, webhook_url: undefined })
            .select()
            .single();
          if (retryErr) throw retryErr;
          setSessions((prev) => [retryData, ...prev]);
          setCurrentSession(retryData);
          createdSession = retryData;
        } else {
          throw error;
        }
      } else {
        setSessions((prevSessions) => [data, ...prevSessions]);
        setCurrentSession(data);
        createdSession = data;
      }

      setMessages([]);
      setShowSidebar(false);

      // Persist mapping for the session so we can look it up later without requiring DB changes
      try {
        localStorage.setItem(`session_webhook_${sessionId}`, webhookUrl);
      } catch (e) {
        console.error('Failed to persist session->webhook mapping', e);
      }

      // Update the DB row to include webhook_url and metadata if the table supports it.
      try {
        const updatePayload = {
          webhook_url: webhookUrl,
          metadata: JSON.stringify({ source })
        };
        const { error: updateErr } = await supabase
          .from('chat_sessions')
          .update(updatePayload)
          .eq('session_id', sessionId);

        if (updateErr) {
          // If the update fails because the column does not exist, ignore.
          if (!(updateErr.message && updateErr.message.includes('column'))) {
            console.warn('Failed to update session metadata:', updateErr);
          }
        }
      } catch (e) {
        // ignore errors related to missing columns or permission issues
        console.debug('Ignored error updating webhook metadata:', e);
      }

      return createdSession;
    } catch (error) {
      console.error('Error creating session with webhook:', error);
      return null;
    }
  }, [user]);

  const loadSessions = useCallback(async () => {
    try {
      // Check for webhook from file upload (Study Guide) and create session only for that case
      try {
        const params = new URLSearchParams(window.location.search || '');
        const webhookFromUrl = params.get('webhook');
        const webhookFromStorage = localStorage.getItem('chatWebhookUrl');
        const webhookToUse = webhookFromUrl || webhookFromStorage;
        
        if (webhookToUse) {
          // Only create session if webhook is from Study Guide (file upload)
          const inferSourceFromWebhook = (w) => {
            if (!w) return 'tab';
            if (w === STUDY_GUIDE_WEBHOOK) return 'study_guide';
            if (w === UNIVERSITY_GUIDE_WEBHOOK) return 'university_guide';
            if (w === PLAN_WEBHOOK || w === N8N_WEBHOOK_URL) return 'chat';
            return 'tab';
          };
          const source = inferSourceFromWebhook(webhookToUse);
          
          // Only create session for study_guide (file upload) automatically
          if (source === 'study_guide') {
            await createSessionWithWebhook(webhookToUse, source);
          }
          
          // Clean up the transient keys
          try { params.delete('webhook'); window.history.replaceState({}, '', window.location.pathname + (params.toString() ? `?${params.toString()}` : '')); } catch (e) { /* ignore */ }
          try { localStorage.removeItem('chatWebhookUrl'); } catch (e) { /* ignore */ }
        }
      } catch (e) {
        // ignore URL/localStorage parsing errors
      }

      // Load all existing sessions
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.uid)
        .order('updated_at', { ascending: false});

      if (error) throw error;

      setSessions(data || []);
      
      // Don't set currentSession or create default session
      // Let users start fresh - session will be created when they send first message
      setCurrentSession(null);
      
      // Persist any webhook_url values into localStorage for later message routing
      try {
        (data || []).forEach((s) => {
          if (s && s.session_id && s.webhook_url) {
            try { localStorage.setItem(`session_webhook_${s.session_id}`, s.webhook_url); } catch (e) { /* ignore */ }
          }
        });
      } catch (e) { /* ignore */ }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  }, [user, createSessionWithWebhook]);

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user, loadSessions]);

  // Auto-open Study Guide session when returning from file upload
  useEffect(() => {
    if (user && sessions.length > 0) {
      const autoOpen = localStorage.getItem('autoOpenStudyGuide');
      const studySessionId = localStorage.getItem('studyGuideSessionId');
      if (autoOpen === 'true' && studySessionId) {
        const session = sessions.find(s => s.session_id === studySessionId);
        if (session) {
          setActiveTab('study_guide');
          setCurrentSession(session);
          console.log('Auto-opened Study Guide session:', studySessionId);
          // Clean up flags
          try {
            localStorage.removeItem('autoOpenStudyGuide');
            localStorage.removeItem('studyGuideSessionId');
          } catch (e) { /* ignore */ }
        }
      }
    }
  }, [user, sessions]);

  // Note: Webhook handling is done inside loadSessions() to avoid duplicate session creation

  // Effect for loading messages when the session changes
  useEffect(() => {
    if (currentSession) {
      loadMessages(currentSession.session_id);
    }
  }, [currentSession]);

  // Effect for setting up the real-time subscription
  useEffect(() => {
    // Only run if we have a session ID
    if (!currentSession?.session_id) {
      return;
    }

    const sessionId = currentSession.session_id;
    console.log(`Setting up real-time subscription for session: ${sessionId}`);

    const channel = supabase.channel(`chat-messages-${sessionId}`);

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('Real-time message received:', payload.new);

          // If the incoming message contains a webhook_url (some n8n flows include it per-message),
          // persist it for the session so outgoing messages route correctly.
          try {
            const maybeWebhook = payload.new?.webhook_url || payload.new?.webhook || payload.new?.data?.webhook || payload.new?.metadata?.webhook_url || payload.new?.data?.webhook_url;
            if (maybeWebhook) {
              try { localStorage.setItem(`session_webhook_${sessionId}`, maybeWebhook); } catch (e) { /* ignore */ }
              // Try to persist to chat_sessions.webhook_url if column exists
              (async () => {
                try {
                  const { error: upErr } = await supabase
                    .from('chat_sessions')
                    .update({ webhook_url: maybeWebhook })
                    .eq('session_id', sessionId);
                  if (upErr && upErr.message && upErr.message.includes('column')) {
                    // ignore missing column
                  } else if (upErr) {
                    console.warn('Failed to update chat_sessions.webhook_url:', upErr);
                  }
                } catch (e) {
                  // ignore
                }
              })();
            }
          } catch (e) {
            // ignore
          }

          // We only care about messages from the AI, as we handle user messages optimistically
          if (payload.new.sender === 'ai') {
            setMessages((prevMessages) => {
              // Check if the message is already in the state to prevent duplicates
              if (prevMessages.some(msg => msg.id === payload.new.id)) {
                return prevMessages;
              }
              return [...prevMessages, payload.new];
            });
            // Hide the loading indicator
            setSending(false);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to channel: ${channel.topic}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('Subscription error:', err);
        }
        if (status === 'TIMED_OUT') {
          console.warn('Subscription timed out.');
        }
      });

    // Cleanup function to remove the subscription when the component unmounts or session changes
    return () => {
      console.log(`Cleaning up subscription for session: ${sessionId}`);
      supabase.removeChannel(channel);
    };
  }, [currentSession?.session_id]); // Depend only on the stable session ID

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

      // Inspect messages for a webhook_url (some flows embed it per-message). Persist mapping.
      try {
        const msgs = data || [];
        for (const m of msgs) {
          const maybe = m?.webhook_url || m?.webhook || m?.data?.webhook || m?.metadata?.webhook_url || m?.data?.webhook_url;
          if (maybe) {
            try { localStorage.setItem(`session_webhook_${sessionId}`, maybe); } catch (e) { /* ignore */ }
            // Attempt to persist into chat_sessions table
            try {
              const { error: upErr } = await supabase
                .from('chat_sessions')
                .update({ webhook_url: maybe })
                .eq('session_id', sessionId);
              if (upErr && upErr.message && upErr.message.includes('column')) {
                // ignore missing column
              }
            } catch (e) { /* ignore */ }
            break; // first found is enough
          }
        }
      } catch (e) { /* ignore */ }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || sending) return;

    // If no session exists, create one based on the active tab
    let sessionToUse = currentSession;
    if (!sessionToUse) {
      let webhookUrl;
      let source;
      if (activeTab === 'university_guide') {
        webhookUrl = UNIVERSITY_GUIDE_WEBHOOK;
        source = 'university_guide';
      } else if (activeTab === 'study_guide') {
        webhookUrl = localStorage.getItem('chatWebhookUrl') || STUDY_GUIDE_WEBHOOK;
        source = 'study_guide';
      } else {
        webhookUrl = PLAN_WEBHOOK || N8N_WEBHOOK_URL;
        source = 'chat';
      }
      const newSession = await createSessionWithWebhook(webhookUrl, source);
      sessionToUse = newSession || currentSession;
      if (!sessionToUse) {
        setSending(false);
        return;
      }
    }

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setSending(true); // Show loading indicator

    const messageObject = {
      session_id: sessionToUse.session_id,
      user_id: user.uid,
      message_type: 'text',
      content: userMessage,
      sender: 'user',
      timestamp: new Date().toISOString(),
      // Use a temporary client-side ID for the key, which will be replaced by the real ID on reload
      id: `temp_${Date.now()}` 
    };

    // Optimistic UI update: show the user's message immediately
    setMessages((prevMessages) => [...prevMessages, messageObject]);

    try {
      // Now, save the actual message to Supabase in the background
      const { error: userMsgError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: messageObject.session_id,
          user_id: messageObject.user_id,
          message_type: messageObject.message_type,
          content: messageObject.content,
          sender: messageObject.sender,
          timestamp: messageObject.timestamp,
        });

      if (userMsgError) {
        // If saving fails, you might want to mark the message as "failed to send"
        console.error(userMsgError);
        throw userMsgError;
      }

      // Do NOT block on token refresh; proceed even if we don't have a fresh token.
      // N8N can fetch tokens server-side via backend when needed.
      const accessToken = tokenManager.getAccessToken() || localStorage.getItem('accessToken') || '';
      const refreshToken = localStorage.getItem('refreshToken') || '';
      
      // Generate a timestamp for the AI's eventual response
      const aiTimestamp = new Date().toISOString();

      // Asynchronously send to n8n
      try {
        const sessionWebhook = getSessionWebhook(sessionToUse);
        sendMessageToN8N(
          sessionToUse.session_id,
          userMessage,
          accessToken,
          refreshToken,
          resolvedUserName,
          resolvedUserEmail,
          resolvedUserId,
          aiTimestamp, // Pass the timestamp to the API call
          sessionWebhook
        );
      } catch (e) {
        console.error('Failed to send message to N8N with session webhook', e);
        // fallback to default
        sendMessageToN8N(
          sessionToUse.session_id,
          userMessage,
          accessToken,
          refreshToken,
          resolvedUserName,
          resolvedUserEmail,
          resolvedUserId,
          aiTimestamp
        );
      }

      // Update session metadata
  if (currentSession?.title === 'New Conversation' && messages.length === 1) {
        const conversationTitle = userMessage.length > 50 
          ? userMessage.substring(0, 50) + '...' 
          : userMessage;
        
        const updated_at = new Date().toISOString();

        // Update the session in the database
        await supabase
          .from('chat_sessions')
          .update({ 
            title: conversationTitle,
            updated_at: updated_at,
            message_count: 2 // User and eventual AI message
          })
          .eq('session_id', currentSession.session_id);
        
        // Instead of re-fetching all sessions, update the local state directly
        const updatedSessions = sessions.map(session =>
          session.id === currentSession.id
            ? { ...session, title: conversationTitle, updated_at: updated_at, message_count: 2 }
            : session
        );
        setSessions(updatedSessions);
        
      } else {
        await supabase
          .from('chat_sessions')
          .update({
            updated_at: new Date().toISOString(),
            message_count: messages.length + 1
          })
          .eq('session_id', currentSession.session_id);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Show user-friendly error message
      const errorMessage = error.message || 'Failed to send message. Please try again.';
      alert(`❌ Error: ${errorMessage}\n\nPlease check:\n1. N8N service is running\n2. Webhook URL is correct\n3. Network connection is stable`);
      
      setSending(false); // Stop loading on error
    } finally {
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
    
    setSending(true); // Start loading indicator
    
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64AudioDataUrl = reader.result;

      const messageObject = {
        session_id: currentSession.session_id,
        user_id: user.uid,
        message_type: 'audio',
        content: base64AudioDataUrl,
        sender: 'user',
        timestamp: new Date().toISOString(),
        id: `temp_${Date.now()}`
      };

      // Optimistic UI update
      setMessages((prevMessages) => [...prevMessages, messageObject]);

      try {
        // Save to Supabase in the background
        const { error: userMsgError } = await supabase
          .from('chat_messages')
          .insert({
            session_id: messageObject.session_id,
            user_id: messageObject.user_id,
            message_type: messageObject.message_type,
            content: messageObject.content,
            sender: messageObject.sender,
            timestamp: messageObject.timestamp,
          });

        if (userMsgError) throw userMsgError;

        // Proceed without blocking on token refresh
        const accessToken = tokenManager.getAccessToken() || localStorage.getItem('accessToken') || '';
        const refreshToken = localStorage.getItem('refreshToken') || '';
        const base64AudioForN8N = base64AudioDataUrl.split(',')[1];

        // Generate a timestamp for the AI's eventual response
        const aiTimestamp = new Date().toISOString();

        // Asynchronously send to n8n
          try {
            const sessionWebhook = getSessionWebhook(currentSession);
            sendAudioToN8N(
              currentSession.session_id,
              base64AudioForN8N,
              accessToken,
              refreshToken,
              resolvedUserName,
              resolvedUserEmail,
              resolvedUserId,
              aiTimestamp,
              sessionWebhook
            );
          } catch (e) {
            console.error('Failed to send audio to N8N with session webhook', e);
            sendAudioToN8N(
              currentSession.session_id,
              base64AudioForN8N,
              accessToken,
              refreshToken,
              resolvedUserName,
              resolvedUserEmail,
              resolvedUserId,
              aiTimestamp
            );
          }
        
        await supabase
          .from('chat_sessions')
          .update({
            updated_at: new Date().toISOString(),
            message_count: messages.length + 1
          })
          .eq('session_id', currentSession.session_id);

      } catch (error) {
        console.error('Error sending audio:', error);
        alert('Failed to send audio message.');
        setSending(false); // Stop loading on error
      }
    };
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

  // Pricing Tab
  if (activeTab === 'pricing') {
    return (
      <div className="chat-interface-container">
        {renderSidebar()}
        <div className="main-chat-area">
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <PricingTab />
          </div>
        </div>
      </div>
    );
  }

  // Study Guide Tab
  if (activeTab === 'study_guide') {
    // If a Study Guide Chat session is selected, show the chat interface
    if (currentSession?.title === 'Study Guide Chat') {
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
                    {currentSession?.title || 'Study Guide Chat'}
                  </div>
                  <div className="chat-header-subtitle">RAG-powered study assistant</div>
                </div>
              </div>
              <div className="chat-header-right">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="status-indicator"></div>
                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Online</span>
                </div>
                <div style={{ marginLeft: '12px' }}>
                  <NotificationBell />
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747S17.5 6.253 12 6.253z" />
                      </svg>
                    </div>
                    <div className="empty-state-title">Start learning</div>
                    <div className="empty-state-description">
                      Ask questions about your uploaded study materials
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => {
                    const isLastAIMessage = message.sender === 'ai' && index === messages.length - 1;
                    return (
                      <div
                        key={message.id || index}
                        className={`message-wrapper ${message.sender}`}
                      >
                        <div className={`${message.sender}-message ${isLastAIMessage ? 'last-ai-message' : ''}`}>
                          {message.sender === 'ai' ? (
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
            <div className={`input-area ${isExpanded ? 'expanded' : ''}`}>
              <div className="input-container-wrapper">
                <div className="message-input-container">
                  <div className="message-input-inner">
                    <textarea
                      ref={textareaRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask about your study materials... (Enter to send)"
                      disabled={sending}
                      className="message-input"
                      rows="1"
                    />
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="expand-button"
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isExpanded ? "M4 8h4V4m-4 4l-4-4m16 0h-4v4m4-4l4-4M4 16h4v4m-4-4l-4 4m16 0h-4v-4m4 4l4 4" : "M4 8V4h4m0 0l-4-4m16 0v4h-4m0 0l4-4M4 16v4h4m0 0l-4 4m16 0v-4h-4m0 0l4 4"} />
                      </svg>
                    </button>
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
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Otherwise show the file upload interface
    return (
      <div className="chat-interface-container">
        {renderSidebar()}
        <div className="main-chat-area">
          <StudyGuideTab />
        </div>
      </div>
    );
  }

  // About Tab
  if (activeTab === 'about') {
    return (
      <div className="chat-interface-container">
        {renderSidebar()}
        <div className="main-chat-area">
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <AboutTab />
          </div>
        </div>
      </div>
    );
  }

  // Unified, Responsive Sidebar Component
  function renderSidebar() {
    const sidebarContent = (
      <>
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
              onClick={() => {
                setActiveTab('chat');
                // Clear current session so tab starts fresh
                setCurrentSession(null);
                setMessages([]);
                setShowSidebar(false);
              }}
            >
              <span className="nav-tab-icon small-icon">📅</span>
              Plan Your Day
            </button>
            <button
              className={`nav-tab ${activeTab === 'university_guide' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('university_guide');
                // Clear current session so tab starts fresh
                setCurrentSession(null);
                setMessages([]);
                setShowSidebar(false);
              }}
            >
              <span className="nav-tab-icon small-icon">🎓</span>
              University Guide
            </button>
            <button
              className={`nav-tab ${activeTab === 'study_guide' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('study_guide');
                // Clear current session so tab starts fresh
                setCurrentSession(null);
                setMessages([]);
                setShowSidebar(false);
              }}
            >
              <span className="nav-tab-icon small-icon">📚</span>
              Study Guide
            </button>
            <button
              className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setActiveTab('dashboard'); setShowSidebar(false); }}
            >
              <span className="nav-tab-icon small-icon">📊</span>
              Dashboard
            </button>
            <button
              className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => { setActiveTab('settings'); setShowSidebar(false); }}
            >
              <span className="nav-tab-icon small-icon">⚙️</span>
              Settings
            </button>
            <button
              className={`nav-tab ${activeTab === 'pricing' ? 'active' : ''}`}
              onClick={() => { setActiveTab('pricing'); setShowSidebar(false); }}
            >
              <span className="nav-tab-icon small-icon">💳</span>
              Pricing
            </button>
            <button
              className={`nav-tab ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => { setActiveTab('about'); setShowSidebar(false); }}
            >
              <span className="nav-tab-icon small-icon">ℹ️</span>
              About
            </button>
          </div>

          {/* New Chat removed from drawer — use header button instead */}
        </div>

        {/* Conversation List */}
        <div className="conversation-list">
          {sessions
            .filter((session) => {
              // Filter sessions based on active tab
              if (activeTab === 'chat') {
                return session.title === 'New Conversation' || session.title === 'Plan Your Day';
              } else if (activeTab === 'university_guide') {
                return session.title === 'University Guide';
              } else if (activeTab === 'study_guide') {
                return session.title === 'Study Guide Chat';
              }
              return true; // Show all for other tabs
            })
            .map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  // Auto-switch tab based on session title
                  if (session.title === 'Study Guide Chat') {
                    setActiveTab('study_guide');
                  } else if (session.title === 'University Guide') {
                    setActiveTab('university_guide');
                  } else {
                    setActiveTab('chat');
                  }
                  setCurrentSession(session);
                  setShowSidebar(false);
                }}
                className={`conversation-item ${currentSession?.id === session.id ? 'active' : ''}`}
              >
                <div className="conversation-title">{session.title}</div>
              </div>
            ))}
        </div>
      </>
    );

    return (
      <>
        {/* A single, responsive sidebar component */}
        <div className={`sidebar ${showSidebar ? 'open' : ''}`}>
          {sidebarContent}
        </div>

        {/* Mobile backdrop */}
        <div
          className={`sidebar-backdrop ${showSidebar ? 'visible' : ''}`}
          onClick={() => setShowSidebar(false)}
        />
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
            {/* New Chat Button - NOT available for Study Guide (only via file upload) */}
            {activeTab !== 'study_guide' && (
              <button
                onClick={async () => {
                  // Create new session based on current active tab
                  let webhookUrl = N8N_WEBHOOK_URL;
                  let source = 'chat';
                  
                  if (activeTab === 'university_guide') {
                    webhookUrl = UNIVERSITY_GUIDE_WEBHOOK;
                    source = 'university_guide';
                  } else if (activeTab === 'chat') {
                    webhookUrl = PLAN_WEBHOOK || N8N_WEBHOOK_URL;
                    source = 'chat';
                  }
                  
                  await createSessionWithWebhook(webhookUrl, source);
                }}
                className="new-chat-header-button"
                style={{
                  padding: '8px 16px',
                  backgroundColor: theme === 'light' ? '#000' : 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  marginRight: '12px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = theme === 'light' ? '#111' : 'var(--primary-hover)';
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                e.target.style.backgroundColor = theme === 'light' ? '#000' : 'var(--primary-color)';
                e.target.style.transform = 'scale(1)';
              }}
              title="Start a new conversation"
              >
                <span style={{ fontSize: '16px' }}>➕</span>
                New Chat
              </button>
            )}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="status-indicator"></div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Online</span>
            </div>
            <div style={{ marginLeft: '12px' }}>
              <NotificationBell />
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
                  <div className="suggestion-item" onClick={() => setInputMessage('Show me unread emails from today')}>
                    💬 "Show me unread emails from today"
                  </div>
                  <div className="suggestion-item" onClick={() => setInputMessage('Schedule a meeting tomorrow at 2 PM')}>
                    📅 "Schedule a meeting tomorrow at 2 PM"
                  </div>
                  <div className="suggestion-item" onClick={() => setInputMessage('Create a task to review the report')}>
                    ✅ "Create a task to review the report"
                  </div>
                  <div className="suggestion-item" onClick={() => setInputMessage('Get a summary of my last meeting')}>
                    📝 "Get a summary of my last meeting"
                  </div>
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
        <div className={`input-area ${isExpanded ? 'expanded' : ''}`}>
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
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="expand-button"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isExpanded ? "M4 8h4V4m-4 4l-4-4m16 0h-4v4m4-4l4-4M4 16h4v4m-4-4l-4 4m16 0h-4v-4m4 4l4 4" : "M4 8V4h4m0 0l-4-4m16 0v4h-4m0 0l4-4M4 16v4h4m0 0l-4 4m16 0v-4h-4m0 0l4 4"} />
                  </svg>
                </button>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterfaceNew;
