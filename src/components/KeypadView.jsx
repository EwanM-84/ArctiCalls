import { useRef, useEffect } from 'react';

const KEYS = [
  { digit: '1', sub: '' },
  { digit: '2', sub: 'ABC' },
  { digit: '3', sub: 'DEF' },
  { digit: '4', sub: 'GHI' },
  { digit: '5', sub: 'JKL' },
  { digit: '6', sub: 'MNO' },
  { digit: '7', sub: 'PQRS' },
  { digit: '8', sub: 'TUV' },
  { digit: '9', sub: 'WXYZ' },
  { digit: '*', sub: '' },
  { digit: '0', sub: '+' },
  { digit: '#', sub: '' },
];

export default function KeypadView({
  dialedNumber,
  setDialedNumber,
  deviceStatus,
  callStatus,
  onCall,
  onRetryDevice,
}) {
  const longPressTimer  = useRef(null);
  const longPressFired  = useRef(false);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        setDialedNumber((prev) => prev + e.key);
      } else if (e.key === '+' || e.key === '*' || e.key === '#') {
        setDialedNumber((prev) => prev + e.key);
      } else if (e.key === 'Backspace') {
        setDialedNumber((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        if (dialedNumber && deviceStatus === 'ready' && callStatus === 'idle') {
          onCall(dialedNumber);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dialedNumber, deviceStatus, callStatus, onCall, setDialedNumber]);

  const handleKey = (digit) => {
    setDialedNumber((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setDialedNumber((prev) => prev.slice(0, -1));
  };

  const handleCall = () => {
    if (dialedNumber && deviceStatus === 'ready' && callStatus === 'idle') {
      onCall(dialedNumber);
    }
  };

  // Long-press '0' → insert '+' instead
  const handleZeroStart = () => {
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setDialedNumber((prev) => prev + '+');
    }, 600);
  };

  const handleZeroEnd = () => {
    clearTimeout(longPressTimer.current);
    if (!longPressFired.current) {
      setDialedNumber((prev) => prev + '0');
    }
  };

  const statusColor =
    deviceStatus === 'ready'  ? '#34C759' :
    deviceStatus === 'error'  ? '#FF3B30' :
    '#8E8E93';

  const statusLabel =
    deviceStatus === 'ready'  ? 'Ready' :
    deviceStatus === 'error'  ? 'Connection error — tap to retry' :
    'Connecting…';

  const canCall = dialedNumber && deviceStatus === 'ready' && callStatus === 'idle';

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--ios-bg)' }}>
      {/* Header */}
      <div
        className="px-5 pt-4 pb-2 border-b"
        style={{ background: 'var(--ios-surface)', borderColor: 'var(--ios-sep)', flexShrink: 0 }}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold" style={{ color: 'var(--ios-label)' }}>
            Keypad
          </h1>
          <button
            onClick={deviceStatus === 'error' ? onRetryDevice : undefined}
            className="flex items-center gap-1.5"
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
            <span className="text-xs" style={{ color: statusColor }}>
              {statusLabel}
            </span>
          </button>
        </div>
      </div>

      {/* Number display */}
      <div className="flex items-center justify-between px-5 py-4" style={{ minHeight: 72, flexShrink: 0 }}>
        <div className="flex-1 text-center">
          <span
            className="text-4xl font-thin tracking-wider"
            style={{ color: 'var(--ios-label)' }}
          >
            {dialedNumber}
          </span>
        </div>
        {dialedNumber && (
          <button
            onClick={handleBackspace}
            onPointerDown={(e) => {
              // Long press to clear all
              const t = setTimeout(() => setDialedNumber(''), 800);
              const up = () => { clearTimeout(t); window.removeEventListener('pointerup', up); };
              window.addEventListener('pointerup', up);
            }}
            className="ml-3 p-2 transition-opacity active:opacity-50"
            style={{ color: 'var(--ios-label3)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 5H9L2 12l7 7h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"
                stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"
              />
              <path d="M15 9l-4 4m0-4l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Keypad grid */}
      <div className="flex-1 px-4 pb-2 flex flex-col overflow-hidden">
        <div
          className="flex-1 grid grid-cols-3 gap-2"
          style={{ gridTemplateRows: 'repeat(4, 1fr)' }}
        >
          {KEYS.map(({ digit, sub }) => {
            const isZero = digit === '0';
            return (
              <button
                key={digit}
                onPointerDown={isZero ? handleZeroStart : undefined}
                onPointerUp={isZero ? handleZeroEnd : undefined}
                onPointerLeave={isZero ? () => clearTimeout(longPressTimer.current) : undefined}
                onClick={!isZero ? () => handleKey(digit) : undefined}
                className="flex flex-col items-center justify-center rounded-2xl transition-transform active:scale-95 select-none"
                style={{ backgroundColor: '#E8E8ED' }}
              >
                <span className="text-2xl font-light" style={{ color: 'var(--ios-label)', lineHeight: 1.1 }}>
                  {digit}
                </span>
                {sub && (
                  <span
                    className="text-[9px] font-semibold tracking-widest"
                    style={{ color: 'var(--ios-label3)', marginTop: 1 }}
                  >
                    {sub}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Call button row */}
        <div className="flex items-center justify-center py-3">
          <button
            onClick={handleCall}
            disabled={!canCall}
            className="rounded-full flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
            style={{
              width: 72,
              height: 72,
              backgroundColor: '#34C759',
              boxShadow: canCall ? '0 0 0 10px rgba(52,199,89,0.18)' : 'none',
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.25.2 2.45.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
