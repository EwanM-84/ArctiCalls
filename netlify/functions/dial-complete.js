exports.handler = async (event) => {
  const params = new URLSearchParams(event.body || '');
  const dialStatus = params.get('DialCallStatus') || '';

  const messages = {
    busy: 'The customer line is busy. Please try again later.',
    'no-answer': 'The customer did not answer. Please try again later.',
    failed: 'The customer call failed. Please try again later.',
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
