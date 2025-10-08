import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import axios from 'axios';

const ChatInterface = ({ user }) => {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

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
      
      // Auto-select first session or create new one
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
          title: 'New Chat',
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
      alert('Failed to create new chat');
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

    const userMessage = inputMessage;
    setInputMessage('');
    setSending(true);

    try {
      // Save user message to Supabase
      const { data: userMsgData, error: userMsgError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: currentSession.session_id,
          user_id: user.uid,
          message_type: 'text',
          content: userMessage,
          sender: 'user',
          timestamp: new Date().toISOString()
        })
        .select()
        .single();

      if (userMsgError) throw userMsgError;

      // Update UI immediately with user message
      setMessages([...messages, userMsgData]);

      // Update session message count and timestamp
      await supabase
        .from('chat_sessions')
        .update({
          message_count: (currentSession.message_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('session_id', currentSession.session_id);

      // Send to n8n webhook
      const webhookResponse = await axios.post(
        'https://n8n.zentraid.com/webhook/ConnectAI_KH_message',
        {
          sessionId: currentSession.session_id,
          action: 'sendMessage',
          chatInput: userMessage
        }
      );

      console.log('Webhook response:', webhookResponse.data);

      // Extract AI response
      const aiResponse = webhookResponse.data.output || 'No response from AI';

      // Save AI response to Supabase
      const { data: aiMsgData, error: aiMsgError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: currentSession.session_id,
          user_id: user.uid,
          message_type: 'text',
          content: aiResponse,
          sender: 'ai',
          timestamp: new Date().toISOString()
        })
        .select()
        .single();

      if (aiMsgError) throw aiMsgError;

      // Update UI with AI response
      setMessages([...messages, userMsgData, aiMsgData]);

      // Update session message count again
      await supabase
        .from('chat_sessions')
        .update({
          message_count: (currentSession.message_count || 0) + 2,
          updated_at: new Date().toISOString()
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Sessions List */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={createNewSession}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            ➕ New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => setCurrentSession(session)}
              className={`p-4 cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition ${
                currentSession?.id === session.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="font-medium text-gray-900 truncate">{session.title}</div>
              <div className="text-xs text-gray-500 mt-1">
                {session.message_count || 0} messages
              </div>
            </div>
          ))}
        </div>

        {/* User Info */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <img
              src={user.photoURL || 'https://via.placeholder.com/40'}
              alt="Profile"
              className="w-10 h-10 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {user.displayName}
              </div>
              <div className="text-xs text-gray-500 truncate">{user.email}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {currentSession?.title || 'Select a chat'}
          </h2>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-lg">Start a conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                    msg.sender === 'user'
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-gray-200 text-gray-900 rounded-bl-none'
                  } shadow-md`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          {sending && (
            <div className="mb-3 flex items-center justify-center space-x-2 text-blue-500">
              <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-sm">Sending...</span>
            </div>
          )}
          
          <div className="flex items-end space-x-3 max-w-4xl mx-auto">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              disabled={sending || !currentSession}
              className="flex-1 px-4 py-3 rounded-2xl border border-gray-300 bg-white text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              rows="1"
              style={{ maxHeight: '120px' }}
            />
            
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || sending || !currentSession}
              className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white transition-all hover:scale-110 active:scale-95"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;