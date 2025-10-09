import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const N8N_WEBHOOK_URL = 'https://n8n.zentraid.com/webhook/ConnectAI_KH_message';

export const storeUserToken = async (tokenData) => {
  try {
    const response = await axios.post(`${BACKEND_URL}/api/auth/store-token`, tokenData);
    return response.data;
  } catch (error) {
    console.error('Error storing token:', error);
    throw error;
  }
};

export const sendMessageToN8N = async (sessionId, chatInput, accessToken, refreshToken, userName = '', userEmail = '') => {
  try {
    const N8N_API_KEY = process.env.REACT_APP_N8N_API_KEY || 'test_key';
    
    const response = await axios.post(
      N8N_WEBHOOK_URL, 
      {
        sessionId,
        action: 'sendMessage',
        messageType: 'text',
        chatInput,
        userName,
        userEmail,
        accessToken: accessToken || '',
        refreshToken: refreshToken || ''
      },
      {
        headers: {
          'Authorization': `Bearer ${N8N_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error sending message to N8N:', error);
    throw error;
  }
};

export const sendAudioToN8N = async (sessionId, audioFile, accessToken, refreshToken, userName = '', userEmail = '') => {
  try {
    const N8N_API_KEY = process.env.REACT_APP_N8N_API_KEY || 'test_key';
    
    const response = await axios.post(
      N8N_WEBHOOK_URL,
      {
        sessionId,
        action: 'sendMessage',
        messageType: 'audio',
        audioFile: audioFile, // Base64 encoded audio
        userName,
        userEmail,
        accessToken: accessToken || '',
        refreshToken: refreshToken || ''
      },
      {
        headers: {
          'Authorization': `Bearer ${N8N_API_KEY}`,
          'Content-Type': 'application/json'
        },
        responseType: 'text' // Treat the response as plain text
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error sending audio to N8N:', error);
    throw error;
  }
};

export const validateToken = async (userId) => {
  try {
    const response = await axios.post(`${BACKEND_URL}/api/auth/validate-token`, { userId });
    return response.data;
  } catch (error) {
    console.error('Error validating token:', error);
    throw error;
  }
};