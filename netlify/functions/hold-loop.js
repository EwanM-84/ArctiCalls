exports.handler = async () => {
  const siteUrl = process.env.SITE_URL || process.env.URL || '';
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: `<?xml version="1.0" encoding="UTF-8"?><Response><Pause length="55"/><Redirect method="POST">${siteUrl}/.netlify/functions/hold-loop</Redirect></Response>`,
  };
};
