const twilio = require('twilio');

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

  const client = twilio(process.env.TWILIO_API_KEY_SID, process.env.TWILIO_API_KEY_SECRET, {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
  });
  const siteUrl = 'https://arcticalls.netlify.app';

  const call = await client.calls.create({
    to: callbackNumber,
    from: process.env.TWILIO_PHONE_NUMBER,
    url: `${siteUrl}/.netlify/functions/connect-call?to=${encodeURIComponent(to)}`,
    timeout: 30,
  });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    body: JSON.stringify({ callSid: call.sid }),
  };
};
