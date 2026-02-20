const TABS = [
  {
    key: 'keypad',
    label: 'Keypad',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        {[
          [7, 4], [12, 4], [17, 4],
          [7, 9], [12, 9], [17, 9],
          [7, 14], [12, 14], [17, 14],
          [12, 19],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="1.8" fill={active ? '#007AFF' : '#8E8E93'} />
        ))}
      </svg>
    ),
  },
  {
    key: 'recents',
    label: 'Recents',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={active ? '#007AFF' : '#8E8E93'} strokeWidth="2" />
        <path
          d="M12 7v5l3 3"
          stroke={active ? '#007AFF' : '#8E8E93'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: 'contacts',
    label: 'Contacts',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke={active ? '#007AFF' : '#8E8E93'} strokeWidth="2" />
        <path
          d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
          stroke={active ? '#007AFF' : '#8E8E93'}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function BottomNav({ activeTab, setActiveTab }) {
  return (
    <div
      className="flex border-t"
      style={{
        borderColor: 'var(--ios-sep)',
        backdropFilter: 'blur(20px)',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        flexShrink: 0,
      }}
    >
      {TABS.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 flex flex-col items-center py-2 gap-0.5 transition-opacity active:opacity-60"
          >
            {tab.icon(active)}
            <span
              className="text-xs font-medium"
              style={{ color: active ? '#007AFF' : '#8E8E93' }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
