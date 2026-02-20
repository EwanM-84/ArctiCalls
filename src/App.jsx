import { useState, useEffect, useRef } from 'react';
import { Device } from '@twilio/voice-sdk';
import { supabase } from './lib/supabase';
import { normalizePhone } from './lib/utils';
import AuthGate from './components/AuthGate';
import StatusBar from './components/StatusBar';
import BottomNav from './components/BottomNav';
import KeypadView from './components/KeypadView';
import RecentsView from './components/RecentsView';
import ContactsView from './components/ContactsView';
import ActiveCallScreen from './components/ActiveCallScreen';
import ContactModal from './components/ContactModal';

export default function App() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user, setUser]             = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Twilio Device ─────────────────────────────────────────────────────────
  const [deviceStatus, setDeviceStatus] = useState('loading'); // loading | ready | error
  const deviceRef = useRef(null);

  // ── Call state ────────────────────────────────────────────────────────────
  const [callStatus, setCallStatus]   = useState('idle'); // idle | calling | ringing | active
  const [dialedNumber, setDialedNumber] = useState('');
  const [currentNumber, setCurrentNumber] = useState('');
  const [callDuration, setCallDuration]   = useState(0);
  const [isMuted, setIsMuted]             = useState(false);
  const callRef      = useRef(null);
  const timerRef     = useRef(null);
  const callStartRef = useRef(null);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('keypad');
  const [contacts, setContacts]   = useState([]);
  const [recents, setRecents]     = useState([]);
  const [contactModal, setContactModal] = useState({ open: false, contact: null });

  // ── Auth listener ─────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Init when user logs in ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    loadContacts();
    loadRecents();
    initDevice();

    return () => {
      if (deviceRef.current) {
        deviceRef.current.destroy();
        deviceRef.current = null;
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user]); // eslint-disable-line

  // ── Token fetch with exponential backoff ──────────────────────────────────
  const fetchToken = async (retries = 3) => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const res = await fetch('/.netlify/functions/token', {
          credentials: 'same-origin',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return data.token;
      } catch (err) {
        if (attempt === retries - 1) throw err;
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  };

  // ── Twilio Device init ────────────────────────────────────────────────────
  const initDevice = async () => {
    setDeviceStatus('loading');
    try {
      const token = await fetchToken();

      const device = new Device(token, {
        edge: ['dublin', 'ashburn'],
        closeProtection: true,
        enableImprovedSignalingErrorPrecision: true,
      });

      device.on('registered', () => setDeviceStatus('ready'));

      device.on('error', (err) => {
        console.error('Twilio Device error:', err);
        setDeviceStatus('error');
      });

      device.on('tokenWillExpire', async () => {
        try {
          const newToken = await fetchToken();
          device.updateToken(newToken);
        } catch (err) {
          console.error('Token refresh failed:', err);
        }
      });

      await device.register();
      deviceRef.current = device;
    } catch (err) {
      console.error('Device init failed:', err);
      setDeviceStatus('error');
    }
  };

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

  // ── Make call ─────────────────────────────────────────────────────────────
  const makeCall = async (number) => {
    if (deviceStatus !== 'ready' || callStatus !== 'idle') return;

    const normalized = normalizePhone(number);
    if (!normalized) return;

    setCurrentNumber(normalized);
    setCallStatus('calling');
    setCallDuration(0);
    setIsMuted(false);

    try {
      const call = await deviceRef.current.connect({ params: { To: normalized } });
      callRef.current = call;

      call.on('ringing', () => setCallStatus('ringing'));

      call.on('accept', () => {
        setCallStatus('active');
        callStartRef.current = Date.now();
        timerRef.current = setInterval(() => {
          setCallDuration(Math.floor((Date.now() - callStartRef.current) / 1000));
        }, 1000);
      });

      call.on('disconnect', () => handleCallEnd('completed'));
      call.on('cancel',     () => handleCallEnd('failed'));
      call.on('reject',     () => handleCallEnd('failed'));
      call.on('error', (err) => {
        console.error('Call error:', err);
        handleCallEnd('failed');
      });
    } catch (err) {
      console.error('makeCall failed:', err);
      setCallStatus('idle');
    }
  };

  // ── End call + log to recents ─────────────────────────────────────────────
  const handleCallEnd = async (status = 'completed') => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const duration = callStartRef.current
      ? Math.floor((Date.now() - callStartRef.current) / 1000)
      : 0;
    const number = currentNumber;

    setCallStatus('idle');
    setCurrentNumber('');
    setCallDuration(0);
    setIsMuted(false);
    callRef.current    = null;
    callStartRef.current = null;

    if (number && user) {
      const contact = contacts.find(
        (c) => normalizePhone(c.phone) === number
      );
      await supabase.from('ArctiCalls_recents').insert({
        phone:            number,
        display_name:     contact?.name || null,
        contact_id:       contact?.id   || null,
        direction:        'outbound',
        duration_seconds: duration,
        started_at:       new Date(Date.now() - duration * 1000).toISOString(),
        ended_at:         new Date().toISOString(),
        status,
      });
      loadRecents();
    }
  };

  // ── Call controls ─────────────────────────────────────────────────────────
  const hangUp = () => {
    if (callRef.current) callRef.current.disconnect();
  };

  const toggleMute = () => {
    if (callRef.current) {
      const muted = !isMuted;
      callRef.current.mute(muted);
      setIsMuted(muted);
    }
  };

  const sendDtmf = (digit) => {
    if (callRef.current && callStatus === 'active') {
      callRef.current.sendDigits(digit);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (authLoading) return null;
  if (!user) return <AuthGate />;

  return (
    <div className="phone-frame">
      <StatusBar />

      {/* Main content area */}
      <div className="flex-1 overflow-hidden" style={{ background: 'var(--ios-bg)' }}>
        {activeTab === 'keypad' && (
          <KeypadView
            dialedNumber={dialedNumber}
            setDialedNumber={setDialedNumber}
            deviceStatus={deviceStatus}
            callStatus={callStatus}
            onCall={(num) => {
              makeCall(num);
              setDialedNumber('');
            }}
            onRetryDevice={initDevice}
          />
        )}
        {activeTab === 'recents' && (
          <RecentsView
            recents={recents}
            contacts={contacts}
            onCall={makeCall}
          />
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

      {/* Active call overlay */}
      {callStatus !== 'idle' && (
        <ActiveCallScreen
          callStatus={callStatus}
          currentNumber={currentNumber}
          callDuration={callDuration}
          isMuted={isMuted}
          contacts={contacts}
          onHangUp={hangUp}
          onToggleMute={toggleMute}
          onSendDtmf={sendDtmf}
        />
      )}

      {/* Contact add/edit modal */}
      {contactModal.open && (
        <ContactModal
          contact={contactModal.contact}
          onClose={() => setContactModal({ open: false, contact: null })}
          onSave={async (data) => {
            if (contactModal.contact) {
              await supabase
                .from('ArctiCalls_contacts')
                .update({ ...data, updated_at: new Date().toISOString() })
                .eq('id', contactModal.contact.id);
            } else {
              await supabase.from('ArctiCalls_contacts').insert(data);
            }
            loadContacts();
            setContactModal({ open: false, contact: null });
          }}
          onDelete={async () => {
            if (contactModal.contact) {
              await supabase
                .from('ArctiCalls_contacts')
                .delete()
                .eq('id', contactModal.contact.id);
              loadContacts();
            }
            setContactModal({ open: false, contact: null });
          }}
        />
      )}
    </div>
  );
}
