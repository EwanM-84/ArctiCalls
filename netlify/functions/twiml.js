// TwiML webhook — called by Twilio to get call instructions
// callerId is always sourced from env var, never hardcoded

function normalizeUK(phone) {
  if (!phone) return '';
  let n = phone.replace(/[\s\-()]/g, '');
  if (n.startsWith('00')) n = '+' + n.slice(2);
  else if (n.startsWith('07') && n.length === 11) n = '+44' + n.slice(1);
  else if (n.startsWith('0')) n = '+44' + n.slice(1);
  return n;
}

exports.handler = async (event) => {
  const callerId = process.env.TWILIO_PHONE_NUMBER;

  // Twilio sends params in the POST body (URL-encoded) or query string
  let to = '';
  if (event.httpMethod === 'POST' && event.body) {
    const params = new URLSearchParams(event.body);
    to = params.get('To') || '';
  } else {
    to = event.queryStringParameters?.To || '';
  }

  const normalizedTo = normalizeUK(to);

  // Safety check — must be a plausible E.164 number
  if (!normalizedTo.match(/^\+\d{10,15}$/)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/xml' },
      body: `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid destination number.</Say></Response>`,
    };
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${callerId}" timeout="30">
    <Number>${normalizedTo}</Number>
  </Dial>
</Response>`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: twiml,
  };
};
