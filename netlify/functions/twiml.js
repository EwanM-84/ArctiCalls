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
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

  let to = '';
  let from = '';
  if (event.httpMethod === 'POST' && event.body) {
    const params = new URLSearchParams(event.body);
    to   = params.get('To')   || '';
    from = params.get('From') || '';
  } else {
    to   = event.queryStringParameters?.To   || '';
    from = event.queryStringParameters?.From || '';
  }

  const normalizedTo = normalizeUK(to);

  // ── Inbound call: someone calling our Twilio number ───────────────────────
  if (normalizedTo === normalizeUK(twilioNumber)) {
    const forward = process.env.TWILIO_FORWARD_NUMBER
      ? normalizeUK(process.env.TWILIO_FORWARD_NUMBER)
      : null;

    const dialBody = forward
      ? `\n    <Client>arcticalls-agent</Client>\n    <Number>${forward}</Number>`
      : `\n    <Client>arcticalls-agent</Client>`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="30" callerId="${twilioNumber}">${dialBody}
  </Dial>
</Response>`,
    };
  }

  // ── Outbound call: browser client dialling an external number ────────────
  if (!normalizedTo.match(/^\+\d{10,15}$/)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/xml' },
      body: `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid destination number.</Say></Response>`,
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${twilioNumber}" timeout="30">
    <Number>${normalizedTo}</Number>
  </Dial>
</Response>`,
  };
};
