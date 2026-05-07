const https = require('https');
const querystring = require('querystring');

const accountSid = 'ACb054de22cf1ebb75f230120c48fb1729';
const authToken = 'f367ab588c7257a01456d52e6f4abca7';
const auth = Buffer.from(accountSid + ':' + authToken).toString('base64');

// Make a test call via REST API (bypasses Voice SDK entirely)
const postData = querystring.stringify({
  To: '+447426799830',   // calling the Twilio number itself as a test
  From: '+447307263285', // using the other UK number as caller ID
  Url: 'https://arcticalls.netlify.app/.netlify/functions/twiml',
  Method: 'POST',
});

const req = https.request({
  host: 'api.ie1.twilio.com',
  path: '/2010-04-01/Accounts/' + accountSid + '/Calls.json',
  method: 'POST',
  headers: {
    Authorization: 'Basic ' + auth,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData),
  }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const j = JSON.parse(d);
    console.log('Status:', res.statusCode);
    console.log('Call SID:', j.sid);
    console.log('Call status:', j.status);
    if (j.code) console.log('Error:', j.code, j.message);
  });
});

req.on('error', e => console.error(e));
req.write(postData);
req.end();
