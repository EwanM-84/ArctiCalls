exports.handler = async (event) => {
  const to = event.queryStringParameters?.to || '';
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!to.match(/^\+\d{10,15}$/)) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: `<?xml version="1.0"?><Response><Say>Invalid number.</Say></Response>`,
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${twilioNumber}" timeout="30">
    <Number>${to}</Number>
  </Dial>
</Response>`,
  };
};
