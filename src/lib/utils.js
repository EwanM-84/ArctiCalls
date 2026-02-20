/**
 * Normalise a phone number to E.164 format.
 * Handles UK numbers: 07xxx → +447xxx, 01xxx → +441xxx, etc.
 * Returns null if the result doesn't look valid.
 */
export function normalizePhone(phone) {
  if (!phone) return null;

  // Strip spaces, dashes, parentheses
  let n = phone.replace(/[\s\-().]/g, '');

  // Already E.164
  if (n.match(/^\+\d{10,15}$/)) return n;

  // International dialling prefix 00 → +
  if (n.startsWith('00')) n = '+' + n.slice(2);
  // UK: 07... (11 digits) → +447...
  else if (n.startsWith('07') && n.length === 11) n = '+44' + n.slice(1);
  // Other UK numbers starting with 0
  else if (n.startsWith('0')) n = '+44' + n.slice(1);
  // Bare digits — assume UK
  else if (n.match(/^\d{10,11}$/)) n = '+44' + (n.length === 11 ? n.slice(1) : n);

  // Validate final E.164 shape
  if (!n.match(/^\+\d{10,15}$/)) return null;
  return n;
}

/**
 * Format seconds as M:SS or H:MM:SS.
 */
export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Format a date string as time (today), weekday (this week), or date.
 */
export function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now  = new Date();
  const diff = now - date;
  const oneDay = 24 * 60 * 60 * 1000;

  if (diff < oneDay && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 7 * oneDay) {
    return date.toLocaleDateString('en-GB', { weekday: 'short' });
  }
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
