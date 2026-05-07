const https = require('https');
const accountSid = 'ACb054de22cf1ebb75f230120c48fb1729';
const authToken = 'f367ab588c7257a01456d52e6f4abca7';
const auth = Buffer.from(accountSid + ':' + authToken).toString('base64');

// Check TwiML App via IE1 endpoint
https.get({
  host: 'api.ie1.twilio.com',
  path: '/2010-04-01/Accounts/' + accountSid + '/Applications/APbf7777694a85654571115832bff4d0e4.json',
  headers: { Authorization: 'Basic ' + auth }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    try {
      const j = JSON.parse(d);
      console.log('IE1 API result:', j.sid ? 'FOUND - ' + j.friendly_name : 'NOT FOUND - ' + j.message);
    } catch(e) {
      console.log('Raw:', d.substring(0, 300));
    }
  });
}).on('error', e => console.error(e));
