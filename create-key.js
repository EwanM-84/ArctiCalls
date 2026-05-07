const https = require('https');
const querystring = require('querystring');

const accountSid = 'ACb054de22cf1ebb75f230120c48fb1729';
const authToken = 'f367ab588c7257a01456d52e6f4abca7';
const auth = Buffer.from(accountSid + ':' + authToken).toString('base64');

const postData = querystring.stringify({
  FriendlyName: 'arcticalls-global',
});

const req = https.request({
  host: 'api.twilio.com',
  path: '/2010-04-01/Accounts/' + accountSid + '/Keys.json',
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
    console.log('Key SID:', j.sid);
    console.log('Secret:', j.secret);
    if (j.code) console.log('Error:', j.code, j.message);
  });
});

req.on('error', e => console.error(e));
req.write(postData);
req.end();
