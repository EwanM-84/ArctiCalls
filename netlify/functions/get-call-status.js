const twilio = require('twilio');

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function phaseFromCalls(parent, child) {
  const parentStatus = parent?.status || 'unknown';
  const childStatus = child?.status || null;

  if (['queued', 'initiated', 'ringing'].includes(parentStatus)) {
    return {
      phase: 'calling_callback',
      title: 'Calling your phone',
      detail: 'Answer the incoming call from the ArctiCalls number.',
      terminal: false,
    };
  }

  if (['busy', 'no-answer', 'failed', 'canceled'].includes(parentStatus)) {
    return {
      phase: parentStatus,
      title: parentStatus === 'no-answer' ? 'Your phone did not answer' : 'Could not reach your phone',
      detail: 'Check signal, roaming, and that Turkey is enabled in Twilio geo permissions.',
      terminal: true,
    };
  }

  if (parentStatus === 'completed' && !child) {
    return {
      phase: 'completed',
      title: 'Call ended',
      detail: '',
      terminal: true,
    };
  }

  if (!childStatus || ['queued', 'initiated'].includes(childStatus)) {
    return {
      phase: 'dialing_destination',
      title: 'Calling customer',
      detail: 'Stay on the line while Twilio connects the UK number.',
      terminal: false,
    };
  }

  if (childStatus === 'ringing') {
    return {
      phase: 'ringing_destination',
      title: 'Customer phone is ringing',
      detail: 'Stay on the line.',
      terminal: false,
    };
  }

  if (childStatus === 'in-progress') {
    return {
      phase: 'connected',
      title: 'Connected',
      detail: 'The customer answered.',
      terminal: false,
    };
  }

  if (['busy', 'no-answer', 'failed', 'canceled'].includes(childStatus)) {
    return {
      phase: childStatus,
      title: childStatus === 'busy' ? 'Customer line is busy' : 'Customer did not answer',
      detail: 'You can hang up or try again.',
      terminal: true,
    };
  }

  return {
    phase: parentStatus,
    title: parentStatus === 'completed' ? 'Call ended' : 'Checking call',
    detail: '',
    terminal: parentStatus === 'completed',
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

  if (!/^CA[0-9a-fA-F]{32}$/.test(callSid || '')) {
    return { statusCode: 400, headers: corsHeaders(origin), body: 'Invalid callSid' };
  }

  try {
    const client = twilio(process.env.TWILIO_API_KEY_SID, process.env.TWILIO_API_KEY_SECRET, {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
    });

    const [parent, children] = await Promise.all([
      client.calls(callSid).fetch(),
      client.calls.list({ parentCallSid: callSid, limit: 5 }),
    ]);

    const child = children
      .filter((call) => call.sid !== callSid)
      .sort((a, b) => new Date(b.dateCreated || 0) - new Date(a.dateCreated || 0))[0] || null;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      body: JSON.stringify({
        parentStatus: parent.status,
        destinationStatus: child?.status || null,
        destinationSid: child?.sid || null,
        ...phaseFromCalls(parent, child),
      }),
    };
  } catch (err) {
    console.error('get-call-status error:', err);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      body: JSON.stringify({
        phase: 'status_unavailable',
        title: 'Checking call',
        detail: 'Status is temporarily unavailable.',
        terminal: false,
      }),
    };
  }
};
