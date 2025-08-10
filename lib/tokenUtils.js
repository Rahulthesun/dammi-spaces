// utils/tokenUtils.js
import crypto from 'crypto'

const secret = process.env.WIDGET_SECRET?.trim(); // Store in env
console.log('Loaded secret:', `'${secret}'`);
console.log('Secret length:', secret?.length);

function generateWidgetToken(businessId) {
  console.log(businessId)
  const payload = Buffer.from(businessId).toString('base64');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

function verifyWidgetToken(token) {
  console.log('=== Starting token verification ===');
  console.log('Input token:', token);
  console.log('Input token length:', token.length);
  
  // Trim the token to remove any whitespace/newlines
  token = token.trim();
  console.log('Trimmed token:', token);
  console.log('Trimmed token length:', token.length);
  
  try {
    const [payload, signature] = token.split('.');
    
    if (!payload || !signature) {
      console.log(' Token format invalid - missing payload or signature');
      return null;
    }

    console.log(' Token split successful');
    console.log('Payload:', payload);
    console.log('Signature:', signature);

    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    console.log('Expected Signature:', expected);
    console.log('Received Signature:', signature);
    console.log('Expected length:', expected.length);
    console.log('Received length:', signature.length);
    console.log('Expected type:', typeof expected);
    console.log('Received type:', typeof signature);
    console.log('Signatures match:', expected === signature);
    
    // Check character by character
    console.log('Character-by-character comparison:');
    const maxLen = Math.max(expected.length, signature.length);
    for (let i = 0; i < maxLen; i++) {
      const expectedChar = expected[i] || 'undefined';
      const receivedChar = signature[i] || 'undefined';
      const expectedCode = expected.charCodeAt(i) || 'N/A';
      const receivedCode = signature.charCodeAt(i) || 'N/A';
      if (expectedChar !== receivedChar) {
        console.log(` Diff at position ${i}: expected '${expectedChar}' (${expectedCode}) vs received '${receivedChar}' (${receivedCode})`);
      }
    }

    if (expected !== signature) {
      console.log(' Signature verification failed');
      return null;
    }

    console.log(' Signature verification passed');

    // Decode the businessId
    const decoded = Buffer.from(payload, 'base64').toString('utf8');
    console.log(' Successfully decoded businessId:', decoded);
    console.log('=== Token verification complete ===');
    return decoded;
    
  } catch (err) {
    console.error(' Token verification error:', err.message);
    console.error('Stack trace:', err.stack);
    return null;
  }
}

export { generateWidgetToken, verifyWidgetToken };