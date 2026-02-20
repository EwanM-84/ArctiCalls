const twilio = require('twilio');

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

// In-memory rate limiter: ip → { count, resetAt }
const rateLimit = new Map();

exports.handler = async (event) => {
  // CORS — allow only known origins
  const origin = event.headers.origin || event.headers.referer || '';
  const siteUrl = process.env.SITE_URL || process.env.URL || '';
  const originAllowed =
    (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) ||
    (siteUrl && origin.startsWith(siteUrl));
  if (!originAllowed) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  // Rate limiting: max 10 requests per minute per IP
  const ip = (event.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const entry = rateLimit.get(ip) || { count: 0, resetAt: now + 60000 };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 60000;
  }
  entry.count++;
  rateLimit.set(ip, entry);
  if (entry.count > 10) {
    return { statusCode: 429, body: 'Too many requests' };
  }

  try {
    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY_SID,
      process.env.TWILIO_API_KEY_SECRET,
      { identity: 'arcticalls-agent', ttl: 3600, region: 'ie1' }
    );

    token.addGrant(
      new VoiceGrant({
        outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
        incomingAllow: false, // v1: outbound only
      })
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
      },
      body: JSON.stringify({ token: token.toJwt() }),
    };
  } catch (err) {
    console.error('Token generation error:', err);
    return { statusCode: 500, body: 'Internal server error' };
  }
};
