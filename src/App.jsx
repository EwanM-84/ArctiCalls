import { useState, useEffect, useRef } from 'react';
import { Device } from '@twilio/voice-sdk';
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
import ActiveCallScreen from './components/ActiveCallScreen';

const EMPTY_PHASE = {
  title: '',
  detail: '',
  terminal: false,
};

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [deviceStatus, setDeviceStatus] = useState('connecting');
  const [deviceError, setDeviceError] = useState('');
  const [callStatus, setCallStatus] = useState('idle'); // idle | calling | ringing | active
  const [callMode, setCallMode] = useState(null); // softphone | callback
  const [dialedNumber, setDialedNumber] = useState('');
  const [currentNumber, setCurrentNumber] = useState('');
  const [currentCallSid, setCurrentCallSid] = useState(null);
  const [callPhase, setCallPhase] = useState(EMPTY_PHASE);
  const [callError, setCallError] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [lastFailedNumber, setLastFailedNumber] = useState('');

  const deviceRef = useRef(null);
  const activeCallRef = useRef(null);
  const callTimerRef = useRef(null);
  const durationTimerRef = useRef(null);

  const [callbackNumber, setCallbackNumber] = useState('');
  const [setupInput, setSetupInput] = useState('');

  const [activeTab, setActiveTab] = useState('keypad');
  const [contacts, setContacts] = useState([]);
  const [recents, setRecents] = useState([]);
  const [contactModal, setContactModal] = useState({ open: false, contact: null });
  const [showSetup, setShowSetup] = useState(false);

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

  useEffect(() => {
    if (!user) return;
    loadContacts();
    loadRecents();
    const saved = localStorage.getItem(`cb_${user.id}`);
    if (saved) setCallbackNumber(saved);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return undefined;

    let cancelled = false;

    const setupDevice = async () => {
      setDeviceStatus('connecting');
      setDeviceError('');

      try {
        const token = await fetchVoiceToken();
        if (cancelled) return;

        const nextDevice = new Device(token, {
          appName: 'ArctiCalls',
          appVersion: '1.0.0',
          closeProtection: true,
          enableImprovedSignalingErrorPrecision: true,
        });

        nextDevice.on('registered', () => {
          setDeviceStatus('ready');
          setDeviceError('');
        });
        nextDevice.on('registering', () => setDeviceStatus('connecting'));
        nextDevice.on('unregistered', () => setDeviceStatus('connecting'));
        nextDevice.on('error', (error) => {
          console.error('Twilio device error:', error);
          setDeviceStatus('error');
          setDeviceError(error.message || 'Internet calling is not available.');
        });
        nextDevice.on('tokenWillExpire', async () => {
          try {
            nextDevice.updateToken(await fetchVoiceToken());
          } catch (error) {
            console.error('Token refresh failed:', error);
          }
        });

        await nextDevice.register();
        if (cancelled) {
          nextDevice.destroy();
          return;
        }

        deviceRef.current = nextDevice;
      } catch (error) {
        console.error('Twilio setup failed:', error);
        if (!cancelled) {
          setDeviceStatus('error');
          setDeviceError(error.message || 'Internet calling is not available.');
        }
      }
    };

    setupDevice();

    return () => {
      cancelled = true;
      activeCallRef.current?.disconnect();
      deviceRef.current?.destroy();
      deviceRef.current = null;
      activeCallRef.current = null;
    };
  }, [user]);

  useEffect(() => {
    if (callStatus === 'active') {
      durationTimerRef.current = setInterval(() => {
        setCallDuration((value) => value + 1);
      }, 1000);
    }
    return () => clearInterval(durationTimerRef.current);
  }, [callStatus]);

  useEffect(() => {
    if (!currentCallSid || callMode !== 'callback' || callStatus === 'idle') return undefined;

    let cancelled = false;
    let resetTimer = null;

    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/.netlify/functions/get-call-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callSid: currentCallSid }),
        });
        if (!res.ok) return;

        const data = await res.json();
        if (cancelled) return;

        setCallPhase({
          title: data.title || 'Checking call',
          detail: data.detail || '',
          terminal: Boolean(data.terminal),
        });

        if (data.phase === 'connected') setCallStatus('active');

        if (data.terminal && !resetTimer) {
          resetTimer = setTimeout(resetCallState, 3500);
        }
      } catch (error) {
        console.error('get-call-status failed:', error);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2500);
    callTimerRef.current = setTimeout(resetCallState, 300000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(resetTimer);
      clearTimeout(callTimerRef.current);
    };
  }, [currentCallSid, callMode, callStatus]);

  const fetchVoiceToken = async () => {
    const res = await fetch(`${API_BASE}/.netlify/functions/token`);
    if (!res.ok) throw new Error(`Token request failed: HTTP ${res.status}`);
    const data = await res.json();
    if (!data.token) throw new Error('Token response did not include a token.');
    return data.token;
  };

  const requestMicrophoneAccess = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('This device does not support microphone calling in the app.');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      const denied = error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError';
      throw new Error(
        denied
          ? 'Microphone access is blocked. Allow microphone access for ArctiCalls, then try again.'
          : 'The microphone is not available. Check the phone permissions, then try again.'
      );
    }
  };

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

  const saveCallbackNumber = () => {
    const normalized = normalizePhone(setupInput);
    if (!normalized) {
      setCallError('Enter the backup mobile in international format, for example +905...');
      return;
    }
    localStorage.setItem(`cb_${user.id}`, normalized);
    setCallbackNumber(normalized);
    setSetupInput('');
    setShowSetup(false);
    setCallError('');
  };

  const logRecent = async (number) => {
    const contact = contacts.find((c) => normalizePhone(c.phone) === number);
    await supabase.from('ArctiCalls_recents').insert({
      user_id: user.id,
      phone: number,
      display_name: contact?.name || null,
      contact_id: contact?.id || null,
      direction: 'outbound',
      duration_seconds: 0,
      started_at: new Date().toISOString(),
      ended_at: null,
      status: 'completed',
    });
    loadRecents();
  };

  const resetCallState = () => {
    clearTimeout(callTimerRef.current);
    clearInterval(durationTimerRef.current);
    setCallStatus('idle');
    setCallMode(null);
    setCurrentNumber('');
    setCurrentCallSid(null);
    setCallPhase(EMPTY_PHASE);
    setCallDuration(0);
    setIsMuted(false);
    activeCallRef.current = null;
  };

  const makeCall = async (number) => {
    const normalized = normalizePhone(number);
    if (!normalized || callStatus !== 'idle') return;

    if (deviceStatus !== 'ready' || !deviceRef.current) {
      setLastFailedNumber(normalized);
      setCallError(
        deviceError ||
        'Internet calling is not ready. Allow microphone access, or use phone backup if the internet is poor.'
      );
      if (!callbackNumber) setShowSetup(true);
      return;
    }

    setCallError('');
    setLastFailedNumber('');
    setCurrentNumber(normalized);
    setCallMode('softphone');
    setCallStatus('calling');
    setCallPhase({
      title: 'Calling through the app',
      detail: 'Allow microphone access if the browser asks.',
      terminal: false,
    });

    try {
      await requestMicrophoneAccess();
      const call = await deviceRef.current.connect({
        params: { To: normalized },
      });

      activeCallRef.current = call;

      call.on('ringing', () => {
        setCallStatus('ringing');
        setCallPhase({
          title: 'Customer phone is ringing',
          detail: 'Speak through this app when they answer.',
          terminal: false,
        });
      });
      call.on('accept', () => {
        setCallStatus('active');
        setCallPhase({
          title: 'Connected',
          detail: 'You are speaking through the app.',
          terminal: false,
        });
      });
      call.on('disconnect', resetCallState);
      call.on('cancel', resetCallState);
      call.on('reject', resetCallState);
      call.on('error', (error) => {
        console.error('Softphone call error:', error);
        setLastFailedNumber(normalized);
        setCallError(error.message || 'The internet call failed. Use phone backup if needed.');
        resetCallState();
      });

      await logRecent(normalized);
    } catch (error) {
      console.error('Softphone connect failed:', error);
      setLastFailedNumber(normalized);
      setCallError(error.message || 'The internet call failed. Use phone backup if needed.');
      resetCallState();
    }
  };

  const makeCallbackCall = async (number = currentNumber || lastFailedNumber) => {
    const normalized = normalizePhone(number);
    if (!normalized || callStatus !== 'idle') return;

    if (!callbackNumber) {
      setLastFailedNumber(normalized);
      setShowSetup(true);
      setCallError('Add her mobile number first to use phone backup.');
      return;
    }

    setCallError('');
    setLastFailedNumber('');
    setCurrentNumber(normalized);
    setCallMode('callback');
    setCallStatus('calling');
    setCallPhase({
      title: 'Calling backup phone',
      detail: `Twilio will ring ${callbackNumber} first. Answer it to connect the customer.`,
      terminal: false,
    });

    try {
      const res = await fetch(`${API_BASE}/.netlify/functions/make-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: normalized, callbackNumber }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || `HTTP ${res.status}`);

      setCurrentCallSid(payload.callSid);
      setCallStatus('ringing');
      setCallPhase({
        title: 'Backup phone is ringing',
        detail: 'Answer the mobile call, then stay on the line while Twilio calls the customer.',
        terminal: false,
      });

      await logRecent(normalized);
    } catch (error) {
      console.error('Callback call failed:', error);
      setLastFailedNumber(normalized);
      setCallError(error.message || 'Phone backup could not start.');
      resetCallState();
    }
  };

  const cancelCall = async () => {
    if (callMode === 'softphone') {
      activeCallRef.current?.disconnect();
      resetCallState();
      return;
    }

    if (currentCallSid) {
      fetch(`${API_BASE}/.netlify/functions/cancel-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callSid: currentCallSid }),
      }).catch(() => {});
    }
    resetCallState();
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    activeCallRef.current?.mute(nextMuted);
    setIsMuted(nextMuted);
  };

  const sendDtmf = (digit) => {
    activeCallRef.current?.sendDigits(digit);
  };

  if (authLoading) return null;
  if (!user) return <AuthGate />;

  const canShowBackupRetry = callStatus === 'idle' && lastFailedNumber;

  return (
    <div className="phone-frame">
      <StatusBar />

      {callError && callStatus === 'idle' && (
        <div
          className="mx-4 mt-2 px-3 py-2 rounded-xl text-sm"
          style={{ background: '#FFE5E5', color: '#B00020' }}
        >
          <div className="flex items-start justify-between gap-3">
            <span>{callError}</span>
            <button onClick={() => setCallError('')} className="font-semibold">
              Dismiss
            </button>
          </div>
          {canShowBackupRetry && (
            <button
              onClick={() => makeCallbackCall(lastFailedNumber)}
              className="mt-2 w-full rounded-lg px-3 py-2 text-white font-semibold"
              style={{ background: 'var(--ios-blue)' }}
            >
              Use phone backup
            </button>
          )}
        </div>
      )}

      {showSetup && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.97)' }}
        >
          <p className="text-white text-xl font-semibold mb-2 text-center">Backup Mobile Number</p>
          <p className="text-sm text-center mb-6" style={{ color: 'var(--ios-label3)' }}>
            Internet calls happen inside the app. If internet is poor, Twilio can ring her mobile first as backup.
          </p>
          <input
            type="tel"
            value={setupInput}
            onChange={(e) => setSetupInput(e.target.value)}
            placeholder="+90 5xx xxx xxxx"
            className="w-full p-3 rounded-xl text-white text-center text-lg mb-4"
            style={{ background: '#1c1c1e', border: '1px solid #38383a' }}
          />
          <button
            onClick={saveCallbackNumber}
            className="w-full p-3 rounded-xl text-white font-semibold text-lg"
            style={{ background: 'var(--ios-blue)' }}
          >
            Save backup number
          </button>
          <button
            onClick={() => setShowSetup(false)}
            className="mt-3 text-sm"
            style={{ color: 'var(--ios-label3)' }}
          >
            Cancel
          </button>
        </div>
      )}

      {callMode === 'softphone' && callStatus !== 'idle' && (
        <ActiveCallScreen
          callStatus={callStatus}
          currentNumber={currentNumber}
          callDuration={callDuration}
          isMuted={isMuted}
          contacts={contacts}
          device={deviceRef.current}
          onHangUp={cancelCall}
          onToggleMute={toggleMute}
          onSendDtmf={sendDtmf}
        />
      )}

      {callMode === 'callback' && callStatus !== 'idle' && (
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
            <div className="flex flex-col items-center gap-1 mt-2">
              <p className="text-white text-base font-medium">
                {callPhase.title || 'Calling backup phone'}
              </p>
              <p className="text-sm text-center px-4" style={{ color: 'var(--ios-label3)' }}>
                {callPhase.detail || 'Answer the mobile call to connect.'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--ios-label3)' }}>
                Backup: {callbackNumber}
              </p>
            </div>
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
            onBackupCall={(num) => {
              makeCallbackCall(num);
              setDialedNumber('');
            }}
            onRetryDevice={() => window.location.reload()}
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

      {callStatus === 'idle' && (
        <button
          onClick={() => {
            setSetupInput(callbackNumber);
            setShowSetup(true);
          }}
          className="absolute top-4 right-4 z-30 text-xs px-2 py-1 rounded"
          style={{ color: deviceStatus === 'ready' ? 'var(--ios-label3)' : '#FF9500', background: 'transparent' }}
          title={deviceError || 'Set backup phone number'}
        >
          {callbackNumber ? `Backup: ${callbackNumber}` : 'Set backup'}
        </button>
      )}

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
