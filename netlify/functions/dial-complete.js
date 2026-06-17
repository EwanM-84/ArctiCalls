exports.handler = async (event) => {
  const params = new URLSearchParams(event.body || '');
  const dialStatus = params.get('DialCallStatus') || '';
  const dialCallSid = params.get('DialCallSid') || '';
  const callSid = params.get('CallSid') || '';
  const from = params.get('From') || '';
  const to = params.get('To') || '';

  console.log('Customer dial completed:', {
    callSid,
    dialCallSid,
    dialStatus,
    from,
    to,
    raw: Object.fromEntries(params.entries()),
  });

  const messages = {
    busy: 'The customer line is busy. Please try again later.',
    'no-answer': 'The customer did not answer. Please try again later.',
    failed: 'The customer call failed. Please check the number and try phone backup if needed.',
    canceled: 'The customer call was cancelled.',
  };

  const message = messages[dialStatus];

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: message
      ? `<?xml version="1.0" encoding="UTF-8"?><Response><Say>${message}</Say><Hangup/></Response>`
      : '<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>',
  };
};
