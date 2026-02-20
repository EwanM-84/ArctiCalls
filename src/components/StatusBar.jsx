import { useState, useEffect } from 'react';

export default function StatusBar() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
    };
    update();
    const id = setInterval(update, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="flex items-center justify-between px-6"
      style={{ height: 44, background: 'var(--ios-surface)', flexShrink: 0 }}
    >
      {/* Time */}
      <span className="text-sm font-semibold" style={{ color: 'var(--ios-label)' }}>
        {time}
      </span>

      {/* Right icons */}
      <div className="flex items-center gap-1.5">
        {/* Signal bars */}
        <svg width="17" height="11" viewBox="0 0 17 11" style={{ color: 'var(--ios-label)' }} fill="currentColor">
          <rect x="0"    y="7" width="3" height="4"   rx="0.5" />
          <rect x="4.5"  y="5" width="3" height="6"   rx="0.5" />
          <rect x="9"    y="2.5" width="3" height="8.5" rx="0.5" />
          <rect x="13.5" y="0" width="3" height="11"  rx="0.5" />
        </svg>

        {/* Wi-Fi */}
        <svg width="16" height="12" viewBox="0 0 16 12" style={{ color: 'var(--ios-label)' }} fill="currentColor">
          <path d="M8 9.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm0-3.5c1.6 0 3.1.7 4.1 1.8L11 9a4 4 0 0 0-6 0L3.9 7.8A5.9 5.9 0 0 1 8 6zm0-3.5c2.7 0 5.1 1.1 6.8 2.9L13.7 6.5A7.4 7.4 0 0 0 8 4 7.4 7.4 0 0 0 2.3 6.5L1.2 5.4A9 9 0 0 1 8 2.5z" />
        </svg>

        {/* Battery */}
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none" style={{ color: 'var(--ios-label)' }}>
          <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="currentColor" strokeOpacity="0.35" />
          <rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor" />
          <path d="M23 4v4a2 2 0 0 0 0-4z" fill="currentColor" fillOpacity="0.4" />
        </svg>
      </div>
    </div>
  );
}
