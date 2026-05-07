const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const params = new URLSearchParams(event.body || '');
  const callSid = params.get('CallSid') || event.queryStringParameters?.CallSid || '';
  const from = params.get('From') || event.queryStringParameters?.From || '';
  const dialStatus = params.get('DialCallStatus') || '';

  // Only hold the call if the browser client didn't answer
  if (dialStatus && dialStatus !== 'completed') {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      await supabase.from('pending_calls').upsert({
        call_sid: callSid,
        from_number: from,
        status: 'ringing',
      });
    } catch (err) {
      console.error('Failed to store pending call:', err);
    }
  }

  const siteUrl = process.env.SITE_URL || process.env.URL || '';
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: `<?xml version="1.0" encoding="UTF-8"?><Response><Pause length="55"/><Redirect method="POST">${siteUrl}/.netlify/functions/hold-loop</Redirect></Response>`,
  };
};
