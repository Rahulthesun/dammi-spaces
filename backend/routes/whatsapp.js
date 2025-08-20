// routes/whatsapp.js
const express = require('express');
const axios = require('axios');
const queryPinecone = require('../services/queryPinecone');
const { generateAnswer } = require('../services/llmService');
const router = express.Router();

// WhatsApp API configuration
const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

/**
 * GET /whatsapp/webhook - Webhook verification
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified successfully!');
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Verification failed');
    }
  } else {
    res.status(400).send('Bad request');
  }
});

/**
 * POST /whatsapp/webhook - Handle incoming messages
 */
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      body.entry.forEach(async (entry) => {
        const changes = entry.changes;
        
        changes.forEach(async (change) => {
          if (change.field === 'messages') {
            const messages = change.value.messages;
            
            if (messages) {
              for (const message of messages) {
                await handleIncomingMessage(message, change.value);
              }
            }
          }
        });
      });
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

/**
 * Handle incoming WhatsApp message
 */
async function handleIncomingMessage(message, messageData) {
  try {
    const from = message.from;
    const messageText = message.text?.body;
    
    if (!messageText) {
      console.log('Non-text message received, skipping...');
      return;
    }

    console.log(`Received message from ${from}: ${messageText}`);

    // Send typing indicator
    await sendTypingIndicator(from);

    // Default business ID - you might want to map phone numbers to businesses
    const businessId = process.env.DEFAULT_BUSINESS_ID || 'default-business';

    // Query Pinecone and generate answer
    const relevantChunks = await queryPinecone(messageText, businessId, 3);
    
    let responseText;
    
    if (relevantChunks.length === 0) {
      responseText = "I don't have enough information to answer that question. Please make sure your documents have been uploaded and processed.";
    } else {
      const context = relevantChunks
        .map((chunk, index) => `Context ${index + 1}:\n${chunk.text}`)
        .join('\n\n');
      
      responseText = await generateAnswer(messageText, context);
    }

    // Send response back to WhatsApp
    await sendMessage(from, responseText);

  } catch (error) {
    console.error('Error handling message:', error);
    await sendMessage(message.from, "Sorry, I encountered an error while processing your message. Please try again.");
  }
}

/**
 * Send typing indicator
 */
async function sendTypingIndicator(to) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'typing',
        typing: { action: 'typing_on' }
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error sending typing indicator:', error);
  }
}

/**
 * Send message to WhatsApp
 */
async function sendMessage(to, text) {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: { body: text }
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Message sent successfully:', response.data);
  } catch (error) {
    console.error('Error sending message:', error.response?.data || error.message);
  }
}

module.exports = router;