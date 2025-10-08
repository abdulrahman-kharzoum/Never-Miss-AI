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

export const sendMessageToN8N = async (sessionId, chatInput) => {
  try {
    const response = await axios.post(N8N_WEBHOOK_URL, {
      sessionId,
      action: 'sendMessage',
      chatInput
    });
    return response.data;
  } catch (error) {
    console.error('Error sending message to N8N:', error);
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