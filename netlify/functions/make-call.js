const twilio = require('twilio');

function getSiteUrl() {
  return (
    process.env.SITE_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    'https://arcticalls.netlify.app'
  ).replace(/\/$/, '');
}

function isE164(value) {
  return typeof value === 'string' && /^\+\d{10,15}$/.test(value);
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.referer || '*';

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(origin), body: 'Method Not Allowed' };
  }

  let to, callbackNumber;
  try {
    ({ to, callbackNumber } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, headers: corsHeaders(origin), body: 'Bad Request' };
  }

  if (!to || !callbackNumber) {
    return { statusCode: 400, headers: corsHeaders(origin), body: 'Missing to or callbackNumber' };
  }

  if (!isE164(to) || !isE164(callbackNumber)) {
    return {
      statusCode: 400,
      headers: corsHeaders(origin),
      body: 'Numbers must be in international format, for example +447... or +905...',
    };
  }

  const client = twilio(process.env.TWILIO_API_KEY_SID, process.env.TWILIO_API_KEY_SECRET, {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
  });
  const siteUrl = getSiteUrl();

  try {
    const call = await client.calls.create({
      to: callbackNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
      url: `${siteUrl}/.netlify/functions/connect-call?to=${encodeURIComponent(to)}`,
      statusCallback: `${siteUrl}/.netlify/functions/call-events`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
      timeout: 25,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      body: JSON.stringify({ callSid: call.sid }),
    };
  } catch (err) {
    console.error('make-call error:', err);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      body: JSON.stringify({
        error: err.code || 'TWILIO_CALL_FAILED',
        message: err.message || 'Twilio could not start the call.',
      }),
    };
  }
};
