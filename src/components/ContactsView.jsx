import { useState, useMemo } from 'react';

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.25.2 2.45.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
    </svg>
  );
}

// Deterministic colour from name initial for avatars
const AVATAR_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#FF3B30',
  '#5856D6', '#FF2D55', '#AF52DE', '#00C7BE',
];
function avatarColor(name) {
  const code = (name || '?').charCodeAt(0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

export default function ContactsView({ contacts, onCall, onAdd, onEdit }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email || '').toLowerCase().includes(q)
    );
  }, [contacts, search]);

  // Group alphabetically
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((c) => {
      const letter = c.name[0]?.toUpperCase() || '#';
      if (!map[letter]) map[letter] = [];
      map[letter].push(c);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--ios-bg)' }}>
      {/* Header */}
      <div
        className="border-b"
        style={{ background: 'var(--ios-surface)', borderColor: 'var(--ios-sep)', flexShrink: 0 }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h1 className="text-xl font-bold" style={{ color: 'var(--ios-label)' }}>
            Contacts
          </h1>
          <button
            onClick={onAdd}
            className="font-medium text-base transition-opacity active:opacity-50"
            style={{ color: 'var(--ios-blue)' }}
          >
            + Add
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'var(--ios-bg)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="#8E8E93" strokeWidth="2" />
              <path d="M21 21l-4.35-4.35" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 outline-none text-base bg-transparent"
              style={{ color: 'var(--ios-label)' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="transition-opacity active:opacity-50"
                style={{ color: 'var(--ios-label3)' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {contacts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="#C6C6C8" strokeWidth="1.5" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#C6C6C8" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p style={{ color: 'var(--ios-label3)' }}>No contacts yet</p>
            <button
              onClick={onAdd}
              className="px-5 py-2.5 rounded-xl text-white font-medium"
              style={{ backgroundColor: 'var(--ios-blue)' }}
            >
              Add Contact
            </button>
          </div>
        )}

        {contacts.length > 0 && grouped.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <p style={{ color: 'var(--ios-label3)' }}>No results for "{search}"</p>
          </div>
        )}

        {grouped.map(([letter, group]) => (
          <div key={letter}>
            {/* Section header */}
            <div className="px-5 py-1" style={{ background: 'var(--ios-bg)' }}>
              <span className="text-xs font-semibold" style={{ color: 'var(--ios-label3)' }}>
                {letter}
              </span>
            </div>

            {/* Contacts in section */}
            <div
              className="mx-4 rounded-2xl overflow-hidden mb-2"
              style={{ background: 'var(--ios-surface)' }}
            >
              {group.map((contact, idx) => (
                <div
                  key={contact.id}
                  className="flex items-center px-4 py-3 gap-3 active:opacity-70 cursor-pointer"
                  style={
                    idx < group.length - 1
                      ? { borderBottom: '1px solid var(--ios-sep)' }
                      : undefined
                  }
                  onClick={() => onEdit(contact)}
                >
                  {/* Avatar */}
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: avatarColor(contact.name) }}
                  >
                    <span className="text-lg font-semibold text-white">
                      {contact.name[0]?.toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" style={{ color: 'var(--ios-label)' }}>
                      {contact.name}
                      {contact.is_favourite && (
                        <span className="ml-1 text-yellow-400 text-xs">★</span>
                      )}
                    </p>
                    <p className="text-sm truncate" style={{ color: 'var(--ios-label3)' }}>
                      {contact.phone}
                    </p>
                  </div>

                  {/* Call button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCall(contact.phone);
                    }}
                    className="p-2 transition-opacity active:opacity-50"
                    style={{ color: 'var(--ios-blue)' }}
                  >
                    <PhoneIcon />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="h-4" />
      </div>
    </div>
  );
}
