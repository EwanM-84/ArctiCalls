const twilio = require('twilio');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let to, callbackNumber;
  try {
    ({ to, callbackNumber } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: 'Bad Request' };
  }

  if (!to || !callbackNumber) return { statusCode: 400, body: 'Missing to or callbackNumber' };

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const siteUrl = 'https://arcticalls.netlify.app';

  const call = await client.calls.create({
    to: callbackNumber,
    from: process.env.TWILIO_PHONE_NUMBER,
    url: `${siteUrl}/.netlify/functions/connect-call?to=${encodeURIComponent(to)}`,
    timeout: 30,
  });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callSid: call.sid }),
  };
};
