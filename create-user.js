// One-time script to create nicola@arctic.com in Supabase
// Usage: node create-user.js <SERVICE_ROLE_KEY>
//
// Get the service role key from:
// Supabase Dashboard → Project Settings → API → service_role (secret)

const https = require('https');

const SUPABASE_URL = 'lsmobpdykxqfvcdbdzfv.supabase.co';
const SERVICE_ROLE_KEY = process.argv[2];

if (!SERVICE_ROLE_KEY) {
  console.error('Usage: node create-user.js <SERVICE_ROLE_KEY>');
  process.exit(1);
}

const body = JSON.stringify({
  email: 'nicola@arctic.com',
  password: 'dialout2026!',
  email_confirm: true,
});

const req = https.request({
  host: SUPABASE_URL,
  path: '/auth/v1/admin/users',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'apikey': SERVICE_ROLE_KEY,
    'Content-Length': Buffer.byteLength(body),
  },
}, (res) => {
  let d = '';
  res.on('data', (c) => (d += c));
  res.on('end', () => {
    const j = JSON.parse(d);
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✓ User created:', j.email, '— ID:', j.id);
    } else {
      console.error('✗ Error:', res.statusCode, j.message || d);
    }
  });
});

req.on('error', (e) => console.error(e));
req.write(body);
req.end();
