// Inbound calls: log caller + forward to TWILIO_FORWARD_NUMBER

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
  const forwardNumber = normalizeUK(process.env.TWILIO_FORWARD_NUMBER || '');
  const siteUrl = 'https://arcticalls.netlify.app';

  let from = '';
  if (event.httpMethod === 'POST' && event.body) {
    const params = new URLSearchParams(event.body);
    from = params.get('From') || '';
  } else {
    from = event.queryStringParameters?.From || '';
  }

  // Log the inbound call asynchronously (fire-and-forget)
  if (from) {
    fetch(`${siteUrl}/.netlify/functions/log-inbound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from }),
    }).catch(() => {});
  }

  if (!forwardNumber) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: `<?xml version="1.0"?><Response><Say>This number is currently unavailable. Please try again later.</Say></Response>`,
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="30" callerId="${from || twilioNumber}">
    <Number>${forwardNumber}</Number>
  </Dial>
</Response>`,
  };
};
