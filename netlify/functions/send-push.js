const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

let firebaseApp;

function getFirebaseApp() {
  if (!firebaseApp) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      ),
    });
  }
  return firebaseApp;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let callSid, from;
  try {
    ({ callSid, from } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: 'Bad Request' };
  }

  // Fetch all registered FCM tokens from Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: rows, error } = await supabase
    .from('push_tokens')
    .select('token');

  if (error || !rows || rows.length === 0) {
    return { statusCode: 200, body: 'no tokens' };
  }

  const tokens = rows.map((r) => r.token);
  const messaging = getFirebaseApp().messaging();

  await messaging.sendEachForMulticast({
    tokens,
    android: { priority: 'high' },
    data: {
      type: 'incoming_call',
      from: from || 'Unknown',
      pending_call_sid: callSid || '',
    },
    notification: {
      title: 'Incoming Call',
      body: `From: ${from || 'Unknown'}`,
    },
  });

  return { statusCode: 200, body: 'ok' };
};
