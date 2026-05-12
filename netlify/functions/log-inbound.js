const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let from, callSid;
  try {
    ({ from, callSid } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: 'Bad Request' };
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get all users so inbound call appears in everyone's recents
    const { data: { users } } = await supabase.auth.admin.listUsers();

    const now = new Date().toISOString();
    const records = (users || []).map((u) => ({
      user_id:          u.id,
      phone:            from || 'Unknown',
      display_name:     null,
      direction:        'inbound',
      duration_seconds: 0,
      started_at:       now,
      ended_at:         null,
      status:           'completed',
    }));

    if (records.length > 0) {
      await supabase.from('ArctiCalls_recents').insert(records);
    }
  } catch (err) {
    console.error('log-inbound error:', err);
  }

  return { statusCode: 200, body: 'ok' };
};
