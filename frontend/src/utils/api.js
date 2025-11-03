import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Plan / default chat webhook (used by "Plan Your Day" / main chat)
const PLAN_WEBHOOK = 'https://n8n.zentraid.com/webhook/ConnectAI_KH_message1';
// Static webhook for Study Guide tab
const STUDY_GUIDE_WEBHOOK = 'https://n8n.zentraid.com/webhook/Study_Guid';
// University guide webhook
const UNIVERSITY_GUIDE_WEBHOOK = 'https://n8n.zentraid.com/webhook/university_Guide';

// Backwards-compatible name previously used in the codebase
const N8N_WEBHOOK_URL = PLAN_WEBHOOK;

export { N8N_WEBHOOK_URL, PLAN_WEBHOOK, STUDY_GUIDE_WEBHOOK, UNIVERSITY_GUIDE_WEBHOOK };

export const storeUserToken = async (tokenData) => {
  try {
    const response = await axios.post(`${BACKEND_URL}/api/auth/store-token`, tokenData);
    return response.data;
  } catch (error) {
    console.error('Error storing token:', error);
    throw error;
  }
};

export const sendMessageToN8N = async (sessionId, chatInput, accessToken, refreshToken, userName = '', userEmail = '', userId = '', aiTimestamp = '', webhookUrl = N8N_WEBHOOK_URL) => {
  try {
    const N8N_API_KEY = process.env.REACT_APP_N8N_API_KEY || 'test_key';
    
    const response = await axios.post(
      webhookUrl,
      {
        sessionId,
        action: 'sendMessage',
        messageType: 'text',
        chatInput,
        // Provide both camelCase and snake_case keys for compatibility with different n8n workflows
        userName,
        user_name: userName,
        userEmail,
        user_email: userEmail,
        userId,
        user_id: userId,
        accessToken: accessToken || '',
        refreshToken: refreshToken || '',
        aiTimestamp: aiTimestamp // Add the AI timestamp to the payload
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

export const sendAudioToN8N = async (sessionId, audioFile, accessToken, refreshToken, userName = '', userEmail = '', userId = '', aiTimestamp = '', webhookUrl = N8N_WEBHOOK_URL) => {
  try {
    const N8N_API_KEY = process.env.REACT_APP_N8N_API_KEY || 'test_key';
    
    const response = await axios.post(
      webhookUrl,
      {
        sessionId,
        action: 'sendMessage',
        messageType: 'audio',
        audioFile: audioFile, // Base64 encoded audio
        // Provide both camelCase and snake_case keys for compatibility with different n8n workflows
        userName,
        user_name: userName,
        userEmail,
        user_email: userEmail,
        userId,
        user_id: userId,
        accessToken: accessToken || '',
        refreshToken: refreshToken || '',
        aiTimestamp: aiTimestamp // Add the AI timestamp to the payload
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