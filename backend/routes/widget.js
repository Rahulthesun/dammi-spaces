// routes/widget.js
import express from 'express';
import { verifyWidgetToken } from '../utils/tokenUtils.js';
const router = express.Router();

// Hardcoded map of businessId need to replace with db
const allowedDomainsMap = {
  'abc123': ['https://example.com', 'http://localhost:3000'],
  'xyz456': ['https://another.com']
};

router.get('/widget.js', async (req, res) => {
  const token = req.query.token;
  const referer = req.get('referer') || '';
  const origin = req.headers.origin;

  if (!token) {
    return res.status(400).send('Missing token');
  }

  const businessId = verifyWidgetToken(token);
  console.log('[widget.js] Incoming token:', token);
  console.log('[widget.js] Decoded businessId:', businessId);
  if (!businessId) {
    return res.status(401).send('// Invalid or expired token');
  }

  await isDomainAllowed(businessId, origin); 
  const isAllowed = allowedDomains.some(domain => referer.startsWith(domain));

  if (!isAllowed) {
    return res.status(403).send('// Domain not allowed for this business');
  }

  res.set('Content-Type', 'application/javascript');

  // Get the current host for API calls (works in dev and production)
  const protocol = req.protocol;
  const host = req.get('host');
  const apiBaseUrl = `${protocol}://${host}`;

  res.send(`
    (function () {
      const businessId = "${businessId}";
      const apiBaseUrl = "${apiBaseUrl}";

      const bubble = document.createElement('div');
      bubble.style = "position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; background: #1E90FF; color: white; font-size: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; cursor: pointer; z-index: 9999; box-shadow: 0 4px 12px rgba(30, 144, 255, 0.3); transition: transform 0.2s ease;";
      bubble.innerText = '💬';
      bubble.onmouseenter = () => bubble.style.transform = 'scale(1.1)';
      bubble.onmouseleave = () => bubble.style.transform = 'scale(1)';
      document.body.appendChild(bubble);

      const chatWindow = document.createElement('div');
      chatWindow.style = "display: none; position: fixed; bottom: 90px; right: 20px; width: 320px; height: 420px; background: white; border: 1px solid #ccc; border-radius: 10px; z-index: 9999; flex-direction: column; box-shadow: 0 0 20px rgba(0,0,0,0.15); overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;";
      chatWindow.innerHTML = \`
        <div style="padding: 15px; background: linear-gradient(135deg, #1E90FF, #0066CC); color: white; font-weight: 600; display: flex; justify-content: space-between; align-items: center;">
          <span>Ask Dammi</span>
          <span id="dammi-close" style="cursor: pointer; font-size: 18px; opacity: 0.8; transition: opacity 0.2s;">&times;</span>
        </div>
        <div id="dammi-messages" style="flex: 1; padding: 15px; overflow-y: auto; background: #f8f9fa;"></div>
        <div style="padding: 10px; border-top: 1px solid #eee; background: white;">
          <input id="dammi-input" placeholder="Ask something..." style="width: 100%; border: 1px solid #ddd; border-radius: 20px; padding: 10px 15px; outline: none; font-size: 14px;" />
        </div>
      \`;
      document.body.appendChild(chatWindow);

      let isOpen = false;
      
      function toggleChat() {
        isOpen = !isOpen;
        chatWindow.style.display = isOpen ? 'flex' : 'none';
        if (isOpen) {
          document.getElementById('dammi-input').focus();
        }
      }

      bubble.onclick = toggleChat;
      chatWindow.querySelector('#dammi-close').onclick = toggleChat;

      const input = chatWindow.querySelector('#dammi-input');
      const messages = chatWindow.querySelector('#dammi-messages');

      function addMessage(sender, message, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.style = \`margin-bottom: 12px; padding: 8px 12px; border-radius: 12px; max-width: 85%; word-wrap: break-word; \${sender === 'You' ? 'background: #1E90FF; color: white; margin-left: auto; text-align: right;' : \`background: white; border: 1px solid #e0e0e0; \${isError ? 'color: #d32f2f; border-color: #ffcdd2;' : ''}\`}\`;
        messageDiv.innerHTML = \`<div style="font-size: 12px; opacity: 0.7; margin-bottom: 2px;">\${sender}</div><div>\${message}</div>\`;
        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
      }

      input.addEventListener('keypress', async function (e) {
        if (e.key === 'Enter') {
          const question = input.value.trim();
          if (!question) return;

          addMessage('You', question);
          input.value = '';
          input.disabled = true;

          try {
            const res = await fetch(\`\${apiBaseUrl}/query\`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ question, businessId })
            });
            
            if (!res.ok) {
              throw new Error(\`HTTP \${res.status}: \${res.statusText}\`);
            }
            
            const data = await res.json();
            addMessage('Dammi', data.answer || 'Sorry, I couldn\'t process your request.');
          } catch (err) {
            console.error('Dammi widget error:', err);
            addMessage('Dammi', 'Sorry, I\'m having trouble connecting right now. Please try again.', true);
          }

          input.disabled = false;
          input.focus();
        }
      });

      // Add initial welcome message
      setTimeout(() => {
        addMessage('Dammi', 'Hi! I\'m here to help. What can I assist you with today?');
      }, 500);
    })();
  `);
});

export default router;