const twilio = require('twilio');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let callSid;
  try {
    ({ callSid } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: 'Bad Request' };
  }

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.calls(callSid).update({ status: 'completed' });
  } catch (err) {
    console.error('cancel-call error:', err);
  }

  return { statusCode: 200, body: 'ok' };
};
