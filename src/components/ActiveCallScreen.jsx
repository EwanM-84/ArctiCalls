import { useState } from 'react';
import { formatDuration } from '../lib/utils';

const DTMF_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

export default function ActiveCallScreen({
  callStatus,
  currentNumber,
  callDuration,
  isMuted,
  contacts,
  device,
  onHangUp,
  onToggleMute,
  onSendDtmf,
}) {
  const [showKeypad, setShowKeypad] = useState(false);
  const [speakerActive, setSpeakerActive] = useState(false);

  // Speaker is supported on desktop Chrome via selectAudioOutput or setSinkId.
  // iOS Safari cannot route web audio to the speaker — the OS controls this.
  const speakerSupported =
    typeof navigator?.mediaDevices?.selectAudioOutput === 'function' ||
    (device?.audio?.availableOutputDevices?.size > 1);

  // Try to match the number to a contact
  const contact = contacts?.find((c) => {
    const n1 = c.phone.replace(/[^\d]/g, '');
    const n2 = currentNumber.replace(/[^\d]/g, '');
    return n1 === n2 || n1.endsWith(n2) || n2.endsWith(n1);
  });

  const displayName = contact?.name || currentNumber;

  const statusText = {
    calling: 'Calling…',
    ringing: 'Ringing…',
    active:  callStatus === 'active' ? formatDuration(callDuration) : '',
  }[callStatus] ?? '';

  const handleSpeaker = async () => {
    const next = !speakerActive;
    try {
      // Twilio SDK audio device API (works on desktop Chrome)
      if (device?.audio) {
        const outputs = [...(device.audio.availableOutputDevices?.values() ?? [])];
        if (next) {
          // Pick the first non-default device (external speaker), or 'default'
          const speaker = outputs.find((d) => d.deviceId !== 'default') || outputs[0];
          if (speaker) await device.audio.speakerDevices.set(speaker.deviceId);
        } else {
          await device.audio.speakerDevices.set('default');
        }
        setSpeakerActive(next);
        return;
      }
      // Fallback: browser selectAudioOutput dialog (desktop Chrome)
      if (typeof navigator?.mediaDevices?.selectAudioOutput === 'function') {
        await navigator.mediaDevices.selectAudioOutput({});
        setSpeakerActive(next);
      }
    } catch {
      // User cancelled or not supported — ignore
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col"
      style={{ backgroundColor: '#1C1C1E' }}
    >
      {/* ── Top: contact info ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-3">
        {/* Avatar */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#3A3A3C' }}
        >
          {contact?.name ? (
            <span className="text-4xl font-medium text-white">
              {contact.name[0].toUpperCase()}
            </span>
          ) : (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" fill="rgba(255,255,255,0.35)" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="rgba(255,255,255,0.35)" />
            </svg>
          )}
        </div>

        {/* Name */}
        <h2 className="text-3xl font-semibold text-white text-center">
          {displayName}
        </h2>

        {/* Phone number if we found a contact */}
        {contact && (
          <p style={{ color: '#8E8E93' }} className="text-base">
            {currentNumber}
          </p>
        )}

        {/* Status / duration */}
        <p
          className="text-lg font-medium"
          style={{
            color:
              callStatus === 'active' ? '#34C759' :
              callStatus === 'calling' ? '#8E8E93' :
              '#8E8E93',
          }}
        >
          {statusText}
        </p>
      </div>

      {/* ── DTMF keypad (shown when keypad button is active) ─────────────── */}
      {showKeypad && (
        <div className="px-6 pb-4">
          <div className="grid grid-cols-3 gap-3">
            {DTMF_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => onSendDtmf(k)}
                className="py-3 rounded-2xl text-white text-xl font-light transition-transform active:scale-95"
                style={{ backgroundColor: '#3A3A3C' }}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Control buttons ───────────────────────────────────────────────── */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-3 gap-5 mb-8">
          {/* Mute */}
          <ControlButton
            label={isMuted ? 'Unmute' : 'Mute'}
            active={isMuted}
            onClick={onToggleMute}
            icon={
              isMuted ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M19 11a7 7 0 0 1-1.5 4.4M17 6.8A4 4 0 0 0 8 9v1M8 13a4 4 0 0 0 7.3 2.2M12 19v2m-4 0h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z" fill="currentColor" />
                  <path d="M19 11a7 7 0 0 1-14 0M12 19v2m-4 0h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )
            }
          />

          {/* Keypad toggle */}
          <ControlButton
            label="Keypad"
            active={showKeypad}
            onClick={() => setShowKeypad((v) => !v)}
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                {[
                  [7, 4.5], [12, 4.5], [17, 4.5],
                  [7, 9.5], [12, 9.5], [17, 9.5],
                  [7, 14.5], [12, 14.5], [17, 14.5],
                  [12, 19.5],
                ].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="1.6" />
                ))}
              </svg>
            }
          />

          {/* Speaker */}
          <ControlButton
            label="Speaker"
            active={speakerActive}
            disabled={!speakerSupported}
            onClick={handleSpeaker}
            title={speakerSupported ? 'Toggle speaker' : 'Speaker switching not available on iOS Safari'}
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" />
                <path
                  d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                />
              </svg>
            }
          />
        </div>

        {/* Hang up */}
        <div className="flex justify-center">
          <button
            onClick={onHangUp}
            className="rounded-full flex items-center justify-center transition-transform active:scale-95"
            style={{ width: 72, height: 72, backgroundColor: '#FF3B30' }}
          >
            {/* Rotated phone = hang-up */}
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="white"
              style={{ transform: 'rotate(135deg)' }}
            >
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.25.2 2.45.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
            </svg>
          </button>
        </div>
      </div>

      <div style={{ height: 'env(safe-area-inset-bottom, 16px)' }} />
    </div>
  );
}

function ControlButton({ label, active, disabled, onClick, title, icon }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className="w-16 h-16 rounded-full flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
        style={{
          backgroundColor: active ? '#FFFFFF' : '#3A3A3C',
          color: active ? '#000000' : '#FFFFFF',
        }}
      >
        {icon}
      </button>
      <span className="text-xs" style={{ color: '#8E8E93' }}>
        {label}
      </span>
    </div>
  );
}
