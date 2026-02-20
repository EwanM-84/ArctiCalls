import { formatDate, formatDuration } from '../lib/utils';

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.25.2 2.45.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
    </svg>
  );
}

export default function RecentsView({ recents, contacts, onCall }) {
  if (recents.length === 0) {
    return (
      <div className="flex flex-col h-full" style={{ background: 'var(--ios-bg)' }}>
        <div
          className="px-5 py-4 border-b"
          style={{ background: 'var(--ios-surface)', borderColor: 'var(--ios-sep)' }}
        >
          <h1 className="text-xl font-bold" style={{ color: 'var(--ios-label)' }}>
            Recents
          </h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#C6C6C8" strokeWidth="1.5" />
            <path d="M12 7v5l3 3" stroke="#C6C6C8" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p style={{ color: 'var(--ios-label3)' }}>No recent calls</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--ios-bg)' }}>
      {/* Header */}
      <div
        className="px-5 py-4 border-b"
        style={{ background: 'var(--ios-surface)', borderColor: 'var(--ios-sep)', flexShrink: 0 }}
      >
        <h1 className="text-xl font-bold" style={{ color: 'var(--ios-label)' }}>
          Recents
        </h1>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="mx-4 mt-4 rounded-2xl overflow-hidden"
          style={{ background: 'var(--ios-surface)' }}
        >
          {recents.map((recent, idx) => {
            const contact   = contacts.find((c) => c.id === recent.contact_id);
            const name      = recent.display_name || contact?.name || recent.phone;
            const isMissed  = recent.status === 'missed';
            const initial   = name[0]?.toUpperCase() || '?';

            return (
              <div
                key={recent.id}
                className="flex items-center px-4 py-3 gap-3"
                style={
                  idx < recents.length - 1
                    ? { borderBottom: '1px solid var(--ios-sep)' }
                    : undefined
                }
              >
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: '#E8E8ED' }}
                >
                  <span className="text-lg font-medium" style={{ color: 'var(--ios-label3)' }}>
                    {initial}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: isMissed ? '#FF3B30' : 'var(--ios-label)' }}>
                    {name}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--ios-label3)' }}>
                    {recent.direction === 'outbound' ? '↑ Outbound' : '↓ Missed'}
                    {recent.duration_seconds > 0 && ` · ${formatDuration(recent.duration_seconds)}`}
                  </p>
                </div>

                {/* Date + call button */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-sm" style={{ color: 'var(--ios-label3)' }}>
                    {formatDate(recent.started_at)}
                  </span>
                  <button
                    onClick={() => onCall(recent.phone)}
                    className="transition-opacity active:opacity-50"
                    style={{ color: 'var(--ios-blue)' }}
                  >
                    <PhoneIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="h-4" />
      </div>
    </div>
  );
}
