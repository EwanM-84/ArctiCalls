import { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { API_BASE } from './lib/api';
import { normalizePhone } from './lib/utils';
import AuthGate from './components/AuthGate';
import StatusBar from './components/StatusBar';
import BottomNav from './components/BottomNav';
import KeypadView from './components/KeypadView';
import RecentsView from './components/RecentsView';
import ContactsView from './components/ContactsView';
import ContactModal from './components/ContactModal';

export default function App() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user, setUser]               = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Call state ────────────────────────────────────────────────────────────
  const [callStatus, setCallStatus]     = useState('idle'); // idle | calling | ringing
  const [dialedNumber, setDialedNumber] = useState('');
  const [currentNumber, setCurrentNumber] = useState('');
  const [currentCallSid, setCurrentCallSid] = useState(null);
  const callTimerRef = useRef(null);

  // ── Callback number (user's real phone that Twilio calls first) ───────────
  const [callbackNumber, setCallbackNumber] = useState('');
  const [showSetup, setShowSetup]           = useState(false);
  const [setupInput, setSetupInput]         = useState('');

  // ── UI ────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]   = useState('keypad');
  const [contacts, setContacts]     = useState([]);
  const [recents, setRecents]       = useState([]);
  const [contactModal, setContactModal] = useState({ open: false, contact: null });

  // ── Auth listener ─────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Init when user logs in ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    loadContacts();
    loadRecents();
    const saved = localStorage.getItem(`cb_${user.id}`);
    if (saved) {
      setCallbackNumber(saved);
    } else {
      setShowSetup(true);
    }
  }, [user]); // eslint-disable-line

  // ── Auto-reset stuck call state after 5 minutes ───────────────────────────
  useEffect(() => {
    if (callStatus === 'ringing') {
      callTimerRef.current = setTimeout(() => {
        setCallStatus('idle');
        setCurrentNumber('');
        setCurrentCallSid(null);
      }, 300000);
    }
    return () => clearTimeout(callTimerRef.current);
  }, [callStatus]);

  // ── Data loaders ──────────────────────────────────────────────────────────
  const loadContacts = async () => {
    const { data } = await supabase
      .from('ArctiCalls_contacts')
      .select('*')
      .order('name');
    if (data) setContacts(data);
  };

  const loadRecents = async () => {
    const { data } = await supabase
      .from('ArctiCalls_recents')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(100);
    if (data) setRecents(data);
  };

  // ── Save callback number ──────────────────────────────────────────────────
  const saveCallbackNumber = () => {
    const normalized = normalizePhone(setupInput);
    if (!normalized) return;
    localStorage.setItem(`cb_${user.id}`, normalized);
    setCallbackNumber(normalized);
    setSetupInput('');
    setShowSetup(false);
  };

  // ── Make call (Twilio calls your phone first, then connects to destination)
  const makeCall = async (number) => {
    if (callStatus !== 'idle') return;
    const normalized = normalizePhone(number);
    if (!normalized) return;
    if (!callbackNumber) { setShowSetup(true); return; }

    setCurrentNumber(normalized);
    setCallStatus('calling');

    try {
      const res = await fetch(`${API_BASE}/.netlify/functions/make-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: normalized, callbackNumber }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { callSid } = await res.json();
      setCurrentCallSid(callSid);
      setCallStatus('ringing');

      // Log to recents
      const contact = contacts.find((c) => normalizePhone(c.phone) === normalized);
      await supabase.from('ArctiCalls_recents').insert({
        user_id:          user.id,
        phone:            normalized,
        display_name:     contact?.name || null,
        contact_id:       contact?.id   || null,
        direction:        'outbound',
        duration_seconds: 0,
        started_at:       new Date().toISOString(),
        ended_at:         null,
        status:           'initiated',
      });
      loadRecents();
    } catch (err) {
      console.error('makeCall failed:', err);
      setCallStatus('idle');
      setCurrentNumber('');
      setCurrentCallSid(null);
    }
  };

  // ── Cancel call ───────────────────────────────────────────────────────────
  const cancelCall = async () => {
    clearTimeout(callTimerRef.current);
    if (currentCallSid) {
      fetch(`${API_BASE}/.netlify/functions/cancel-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callSid: currentCallSid }),
      }).catch(() => {});
    }
    setCallStatus('idle');
    setCurrentNumber('');
    setCurrentCallSid(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (authLoading) return null;
  if (!user) return <AuthGate />;

  return (
    <div className="phone-frame">
      <StatusBar />

      {/* Callback number setup */}
      {showSetup && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.97)' }}
        >
          <p className="text-white text-xl font-semibold mb-2 text-center">Your Phone Number</p>
          <p className="text-sm text-center mb-6" style={{ color: 'var(--ios-label3)' }}>
            When you make a call, your phone will ring first. Answer it to connect to the person you dialled.
          </p>
          <input
            type="tel"
            value={setupInput}
            onChange={(e) => setSetupInput(e.target.value)}
            placeholder="+44 7xxx xxxxxx"
            className="w-full p-3 rounded-xl text-white text-center text-lg mb-4"
            style={{ background: '#1c1c1e', border: '1px solid #38383a' }}
          />
          <button
            onClick={saveCallbackNumber}
            className="w-full p-3 rounded-xl text-white font-semibold text-lg"
            style={{ background: 'var(--ios-blue)' }}
          >
            Save
          </button>
          {callbackNumber ? (
            <button
              onClick={() => setShowSetup(false)}
              className="mt-3 text-sm"
              style={{ color: 'var(--ios-label3)' }}
            >
              Cancel
            </button>
          ) : null}
        </div>
      )}

      {/* Call in progress overlay */}
      {callStatus !== 'idle' && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-between px-6 py-12"
          style={{ background: '#000' }}
        >
          <div className="flex flex-col items-center mt-16 gap-3">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold"
              style={{ background: 'var(--ios-label3)', color: '#fff' }}
            >
              {currentNumber[0] || '?'}
            </div>
            <p className="text-white text-2xl font-semibold mt-2">{currentNumber}</p>
            {callStatus === 'calling' && (
              <p className="text-sm" style={{ color: 'var(--ios-label3)' }}>Placing call…</p>
            )}
            {callStatus === 'ringing' && (
              <div className="flex flex-col items-center gap-1 mt-2">
                <p className="text-white text-base font-medium">Your phone is ringing</p>
                <p className="text-sm text-center px-4" style={{ color: 'var(--ios-label3)' }}>
                  Answer your phone to connect to {currentNumber}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--ios-label3)' }}>
                  Calling via {callbackNumber}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={cancelCall}
            className="w-16 h-16 rounded-full flex items-center justify-center mb-8"
            style={{ backgroundColor: '#FF3B30' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white" style={{ transform: 'rotate(135deg)' }}>
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.25.2 2.45.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
            </svg>
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden" style={{ background: 'var(--ios-bg)' }}>
        {activeTab === 'keypad' && (
          <KeypadView
            dialedNumber={dialedNumber}
            setDialedNumber={setDialedNumber}
            deviceStatus="ready"
            callStatus={callStatus}
            onCall={(num) => { makeCall(num); setDialedNumber(''); }}
            onRetryDevice={() => {}}
          />
        )}
        {activeTab === 'recents' && (
          <RecentsView recents={recents} contacts={contacts} onCall={makeCall} />
        )}
        {activeTab === 'contacts' && (
          <ContactsView
            contacts={contacts}
            onCall={makeCall}
            onAdd={() => setContactModal({ open: true, contact: null })}
            onEdit={(c) => setContactModal({ open: true, contact: c })}
          />
        )}
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Settings button to change callback number */}
      {callStatus === 'idle' && (
        <button
          onClick={() => { setSetupInput(callbackNumber); setShowSetup(true); }}
          className="absolute top-4 right-4 z-30 text-xs px-2 py-1 rounded"
          style={{ color: 'var(--ios-label3)', background: 'transparent' }}
        >
          {callbackNumber ? `📞 ${callbackNumber}` : 'Set number'}
        </button>
      )}

      {/* Contact modal */}
      {contactModal.open && (
        <ContactModal
          contact={contactModal.contact}
          onClose={() => setContactModal({ open: false, contact: null })}
          onSave={async (data) => {
            if (contactModal.contact) {
              await supabase.from('ArctiCalls_contacts').update({ ...data, updated_at: new Date().toISOString() }).eq('id', contactModal.contact.id);
            } else {
              await supabase.from('ArctiCalls_contacts').insert(data);
            }
            loadContacts();
            setContactModal({ open: false, contact: null });
          }}
          onDelete={async () => {
            if (contactModal.contact) {
              await supabase.from('ArctiCalls_contacts').delete().eq('id', contactModal.contact.id);
              loadContacts();
            }
            setContactModal({ open: false, contact: null });
          }}
        />
      )}
    </div>
  );
}
