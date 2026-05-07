// Inbound calls forwarded to TWILIO_FORWARD_NUMBER

function normalizeUK(phone) {
  if (!phone) return '';
  let n = phone.replace(/[\s\-()]/g, '');
  if (n.startsWith('00')) n = '+' + n.slice(2);
  else if (n.startsWith('07') && n.length === 11) n = '+44' + n.slice(1);
  else if (n.startsWith('0')) n = '+44' + n.slice(1);
  return n;
}

exports.handler = async () => {
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
  const forwardNumber = normalizeUK(process.env.TWILIO_FORWARD_NUMBER || '');

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
  <Dial timeout="30" callerId="${twilioNumber}">
    <Number>${forwardNumber}</Number>
  </Dial>
</Response>`,
  };
};
