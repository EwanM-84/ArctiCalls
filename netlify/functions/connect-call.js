function getSiteUrl() {
  return (
    process.env.SITE_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    'https://arcticalls.netlify.app'
  ).replace(/\/$/, '');
}

exports.handler = async (event) => {
  const params = new URLSearchParams(event.body || '');
  const to = event.queryStringParameters?.to || params.get('To') || '';
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
  const siteUrl = getSiteUrl();

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
  <Dial callerId="${twilioNumber}" timeout="25" answerOnBridge="true" action="${siteUrl}/.netlify/functions/dial-complete" method="POST">
    <Number statusCallback="${siteUrl}/.netlify/functions/call-events" statusCallbackEvent="initiated ringing answered completed" statusCallbackMethod="POST">${to}</Number>
  </Dial>
</Response>`,
  };
};
