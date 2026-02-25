const FALLBACK_BG_COLORS = ['#14532d', '#0f766e', '#1d4ed8', '#7c2d12', '#7c3aed', '#be185d', '#b45309'];

const getInitials = (name) => {
  const raw = String(name || '').trim();
  if (!raw) return 'U';
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return (parts[0][0] || 'U').toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase() || 'U';
};

const getColorByName = (name) => {
  const raw = String(name || 'user');
  const hash = raw.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return FALLBACK_BG_COLORS[hash % FALLBACK_BG_COLORS.length];
};

const buildDefaultAvatarDataUrl = (name) => {
  const initials = getInitials(name);
  const bg = getColorByName(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" fill="#ffffff">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const getAvatarSrc = ({ avatarDataUrl, name }) => {
  const raw = String(avatarDataUrl || '').trim();
  if (raw) return raw;
  return buildDefaultAvatarDataUrl(name);
};

export { getInitials, getAvatarSrc };
