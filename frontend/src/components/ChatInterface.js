import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { sendMessageToN8N } from '../utils/api';

const ChatInterface = ({ user, onSignOut }) => {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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
        .order('updated_at', { ascending: false });

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
    if (!inputMessage.trim() || !currentSession) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    try {
      // Save user message to Supabase
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

      // Reload messages to show user message
      await loadMessages(currentSession.session_id);

      // Send to N8N webhook
      const n8nResponse = await sendMessageToN8N(currentSession.session_id, userMessage);
      
      // Extract AI response from markdown JSON
      let aiResponse = 'I received your message!';
      if (n8nResponse && n8nResponse.output) {
        aiResponse = n8nResponse.output;
      }

      // Save AI response to Supabase
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

      // Reload messages to show AI response
      await loadMessages(currentSession.session_id);

      // Update session
      await supabase
        .from('chat_sessions')
        .update({
          updated_at: new Date().toISOString(),
          message_count: messages.length + 2
        })
        .eq('session_id', currentSession.session_id);

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-blue-100">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'w-80' : 'w-0'} bg-white border-r border-blue-100 transition-all duration-300 overflow-hidden flex flex-col`}>
        <div className="p-4 border-b border-blue-200 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800">
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
                  : 'bg-blue-50 text-gray-700 hover:bg-blue-100 hover:scale-102'
              }`}
            >
              <div className="font-semibold truncate">{session.title}</div>
              <div className="text-xs mt-1 opacity-75">
                {new Date(session.created_at).toLocaleDateString()} • {session.message_count || 0} messages
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3 mb-3">
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="w-10 h-10 rounded-full border-2 border-blue-500"
            />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 truncate">{user.displayName}</div>
              <div className="text-xs text-gray-500 truncate">{user.email}</div>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="w-full bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-all duration-300"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            {!showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                className="text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {currentSession?.title || 'Chat'}
              </h1>
              <p className="text-xs text-gray-500">AI-powered productivity assistant</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Online</span>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mb-4"></div>
                <div className="text-gray-600">Loading messages...</div>
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
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Start a conversation</h3>
                <p className="text-gray-600 mb-4">I can help you manage emails, calendar events, and tasks. Just ask!</p>
                <div className="space-y-2 text-sm text-gray-500">
                  <p>💬 "Show me unread emails from today"</p>
                  <p>📅 "Schedule a meeting tomorrow at 2 PM"</p>
                  <p>✅ "Create a task to review the report"</p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-md ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white rounded-br-none'
                      : 'bg-white text-gray-800 rounded-bl-none border-2 border-blue-300 animate-glow'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <div className={`text-xs mt-2 ${message.sender === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex justify-start animate-slide-up">
              <div className="bg-white text-gray-800 rounded-2xl rounded-bl-none px-5 py-3 shadow-md border-2 border-blue-300 animate-glow">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-blue-700 rounded-full animate-pulse delay-100"></div>
                  <div className="w-2 h-2 bg-blue-800 rounded-full animate-pulse delay-200"></div>
                  <span className="text-gray-600 ml-2">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message... (Press Enter to send)"
                  disabled={sending}
                  className="w-full px-5 py-4 rounded-2xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none resize-none transition-all duration-300 disabled:bg-gray-50 disabled:text-gray-500"
                  rows="1"
                  style={{ maxHeight: '120px' }}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || sending}
                className="px-6 py-4 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 text-white rounded-2xl font-semibold hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>Send</span>
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center">
              Connected to AI • Token auto-refresh enabled ✅
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;