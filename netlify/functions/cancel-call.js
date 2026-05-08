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

  let callSid;
  try {
    ({ callSid } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, headers: corsHeaders(origin), body: 'Bad Request' };
  }

  try {
    const client = twilio(process.env.TWILIO_API_KEY_SID, process.env.TWILIO_API_KEY_SECRET, {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
    });
    await client.calls(callSid).update({ status: 'completed' });
  } catch (err) {
    console.error('cancel-call error:', err);
  }

  return { statusCode: 200, headers: corsHeaders(origin), body: 'ok' };
};
