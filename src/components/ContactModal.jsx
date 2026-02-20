import { useState } from 'react';

const AVATAR_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#FF3B30',
  '#5856D6', '#FF2D55', '#AF52DE', '#00C7BE',
];
function avatarColor(name) {
  const code = (name || '?').charCodeAt(0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

export default function ContactModal({ contact, onClose, onSave, onDelete }) {
  const [name,        setName]        = useState(contact?.name        || '');
  const [phone,       setPhone]       = useState(contact?.phone       || '');
  const [email,       setEmail]       = useState(contact?.email       || '');
  const [notes,       setNotes]       = useState(contact?.notes       || '');
  const [isFavourite, setIsFavourite] = useState(contact?.is_favourite || false);
  const [loading,     setLoading]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canSave = name.trim() && phone.trim() && !loading;

  const handleSave = async () => {
    if (!canSave) return;
    setLoading(true);
    try {
      await onSave({
        name:         name.trim(),
        phone:        phone.trim(),
        email:        email.trim() || null,
        notes:        notes.trim() || null,
        is_favourite: isFavourite,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col"
      style={{ background: 'var(--ios-bg)' }}
    >
      {/* Navigation bar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'var(--ios-surface)', borderColor: 'var(--ios-sep)', flexShrink: 0 }}
      >
        <button
          onClick={onClose}
          className="text-base transition-opacity active:opacity-50"
          style={{ color: 'var(--ios-blue)' }}
        >
          Cancel
        </button>
        <h2 className="font-semibold" style={{ color: 'var(--ios-label)' }}>
          {contact ? 'Edit Contact' : 'New Contact'}
        </h2>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="text-base font-semibold transition-opacity active:opacity-50 disabled:opacity-40"
          style={{ color: 'var(--ios-blue)' }}
        >
          {loading ? 'Saving…' : 'Done'}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Avatar */}
        <div className="flex flex-col items-center py-8">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ backgroundColor: avatarColor(name) }}
          >
            <span className="text-4xl font-semibold text-white">
              {name ? name[0].toUpperCase() : '?'}
            </span>
          </div>
        </div>

        {/* Main fields */}
        <div
          className="mx-4 rounded-2xl overflow-hidden mb-4"
          style={{ background: 'var(--ios-surface)' }}
        >
          <Field label="Name">
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="flex-1 outline-none bg-transparent text-base"
              style={{ color: 'var(--ios-label)' }}
            />
          </Field>

          <Field label="Phone" border>
            <input
              type="tel"
              placeholder="+44 7xxx xxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 outline-none bg-transparent text-base"
              style={{ color: 'var(--ios-label)' }}
            />
          </Field>

          <Field label="Email" border>
            <input
              type="email"
              placeholder="Optional"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 outline-none bg-transparent text-base"
              style={{ color: 'var(--ios-label)' }}
            />
          </Field>

          <Field label="Notes" border>
            <input
              type="text"
              placeholder="Optional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex-1 outline-none bg-transparent text-base"
              style={{ color: 'var(--ios-label)' }}
            />
          </Field>
        </div>

        {/* Favourite toggle */}
        <div
          className="mx-4 rounded-2xl overflow-hidden mb-4"
          style={{ background: 'var(--ios-surface)' }}
        >
          <div className="flex items-center justify-between px-4 py-3.5">
            <span style={{ color: 'var(--ios-label)' }}>⭐ Favourite</span>
            <button
              onClick={() => setIsFavourite((f) => !f)}
              className="relative rounded-full transition-colors"
              style={{
                width: 50,
                height: 30,
                backgroundColor: isFavourite ? '#34C759' : '#E8E8ED',
              }}
            >
              <div
                className="absolute top-0.5 w-7 h-7 bg-white rounded-full shadow"
                style={{
                  left: isFavourite ? '20px' : '2px',
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </div>
        </div>

        {/* Delete */}
        {contact && (
          <div className="mx-4 mb-10">
            {confirmDelete ? (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--ios-surface)' }}
              >
                <button
                  onClick={onDelete}
                  className="w-full py-3.5 text-center font-medium transition-opacity active:opacity-50"
                  style={{ color: 'var(--ios-red)', borderBottom: '1px solid var(--ios-sep)' }}
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="w-full py-3.5 text-center transition-opacity active:opacity-50"
                  style={{ color: 'var(--ios-blue)' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full rounded-2xl py-3.5 text-center font-medium transition-opacity active:opacity-50"
                style={{ background: 'var(--ios-surface)', color: 'var(--ios-red)' }}
              >
                Delete Contact
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, border }) {
  return (
    <div
      className="flex items-center px-4 py-3.5 gap-3"
      style={border ? { borderTop: '1px solid var(--ios-sep)' } : undefined}
    >
      <span className="text-sm w-14 flex-shrink-0" style={{ color: 'var(--ios-label3)' }}>
        {label}
      </span>
      {children}
    </div>
  );
}
