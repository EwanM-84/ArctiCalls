exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const params = new URLSearchParams(event.body || '');
  console.log('Twilio call event:', {
    callSid: params.get('CallSid'),
    parentCallSid: params.get('ParentCallSid'),
    callStatus: params.get('CallStatus'),
    callDuration: params.get('CallDuration'),
    from: params.get('From'),
    to: params.get('To'),
  });

  return { statusCode: 204, body: '' };
};
