const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let callSid;
  try {
    ({ callSid } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: 'Bad Request' };
  }

  if (!callSid) {
    return { statusCode: 400, body: 'Missing callSid' };
  }

  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.calls(callSid).update({
      twiml: '<Response><Dial><Client>arcticalls-agent</Client></Dial></Response>',
    });

    // Mark the pending call as accepted
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    await supabase
      .from('pending_calls')
      .update({ status: 'accepted' })
      .eq('call_sid', callSid);

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('accept-inbound error:', err);
    return { statusCode: 500, body: 'Failed to connect call' };
  }
};
