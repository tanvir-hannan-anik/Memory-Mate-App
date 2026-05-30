// Memora design tokens — colors, type, spacing, icons
// 3 color themes × 3 font sets × 2 layouts × 2 icon styles

const THEMES = {
  teal: {
    name: 'Calm Teal',
    bg:        '#FAFAF7',
    bgWarm:    '#F4EFE6',
    surface:   '#FFFFFF',
    ink:       '#1F2A2E',
    inkSoft:   '#506068',
    inkMute:   '#8A9499',
    border:    '#E8E1D3',
    accent:    '#1E6E72',   // deep teal
    accentSoft:'#D6E7E5',
    accentInk: '#0E4145',
    good:      '#3F8A5C',
    goodSoft:  '#DBEAD6',
    warn:      '#B8731F',
    warnSoft:  '#F4E2BF',
    danger:    '#A53A2B',
    dangerSoft:'#F2D5CF',
  },
  indigo: {
    name: 'Warm Indigo',
    bg:        '#FAF7F2',
    bgWarm:    '#EFE9DD',
    surface:   '#FFFFFF',
    ink:       '#231F2E',
    inkSoft:   '#534F66',
    inkMute:   '#8C879D',
    border:    '#E5DECE',
    accent:    '#4C4FA8',
    accentSoft:'#DDDDF0',
    accentInk: '#2E3076',
    good:      '#4F8A4F',
    goodSoft:  '#DCEAD3',
    warn:      '#B8731F',
    warnSoft:  '#F4E2BF',
    danger:    '#A53A2B',
    dangerSoft:'#F2D5CF',
  },
  sage: {
    name: 'Soft Sage',
    bg:        '#F7F6F1',
    bgWarm:    '#E9EBE0',
    surface:   '#FFFFFF',
    ink:       '#23291F',
    inkSoft:   '#576052',
    inkMute:   '#8A9382',
    border:    '#DFE0D2',
    accent:    '#4F7A4E',
    accentSoft:'#D8E5D2',
    accentInk: '#2E4D2D',
    good:      '#4F7A4E',
    goodSoft:  '#D8E5D2',
    warn:      '#B8731F',
    warnSoft:  '#F4E2BF',
    danger:    '#A53A2B',
    dangerSoft:'#F2D5CF',
  },
};

const FONTS = {
  rounded: {
    name: 'Friendly',
    body: '"Nunito", -apple-system, system-ui, sans-serif',
    display: '"Nunito", -apple-system, system-ui, sans-serif',
    googleImport: 'family=Nunito:wght@400;500;600;700;800',
  },
  classic: {
    name: 'Classic',
    body: '"Source Sans 3", -apple-system, system-ui, sans-serif',
    display: '"Lora", Georgia, serif',
    googleImport: 'family=Lora:wght@500;600;700&family=Source+Sans+3:wght@400;500;600',
  },
  modern: {
    name: 'Modern',
    body: '"Manrope", -apple-system, system-ui, sans-serif',
    display: '"Manrope", -apple-system, system-ui, sans-serif',
    googleImport: 'family=Manrope:wght@400;500;600;700;800',
  },
};

// Inject Google Font imports for all font sets so toggling is instant.
(function injectFonts() {
  if (document.getElementById('memora-fonts')) return;
  const families = Object.values(FONTS).map(f => f.googleImport).join('&');
  const link = document.createElement('link');
  link.id = 'memora-fonts';
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  document.head.appendChild(link);
})();

const SCALE = {
  cozy:    { body: 22, large: 32, huge: 44, padding: 24, gap: 18, radius: 22, touch: 64 },
  compact: { body: 18, large: 26, huge: 36, padding: 18, gap: 12, radius: 16, touch: 56 },
};

// ── Simple, calm line icons. All 24x24 viewBox. No emoji. ──
function Icon({ name, size = 28, stroke = 'currentColor', filled = false, style }) {
  const sw = filled ? 0 : 1.8;
  const fill = filled ? stroke : 'none';
  const paths = {
    sun: <g><circle cx="12" cy="12" r="4" fill={fill} stroke={stroke} strokeWidth={sw}/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></g>,
    pill: <g><rect x="3" y="9" width="18" height="6" rx="3" fill={fill} stroke={stroke} strokeWidth={sw}/><path d="M12 9v6" stroke={stroke} strokeWidth={sw}/></g>,
    phone: <path d="M5 4h3l2 5-2 1a11 11 0 005 5l1-2 5 2v3a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>,
    walk: <g><circle cx="13" cy="4.5" r="1.6" fill={fill} stroke={stroke} strokeWidth={sw}/><path d="M9 21l3-7-2-3 4-3 3 4 3 1M11 14l-2 4" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/></g>,
    heart: <path d="M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>,
    speaker: <g><path d="M4 10v4h3l4 3V7L7 10H4z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M15 9a4 4 0 010 6M18 6a8 8 0 010 12" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></g>,
    mic: <g><rect x="9" y="3" width="6" height="11" rx="3" fill={fill} stroke={stroke} strokeWidth={sw}/><path d="M5 11a7 7 0 0014 0M12 18v3" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></g>,
    chat: <path d="M4 5h16v11H8l-4 4V5z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>,
    calendar: <g><rect x="3" y="5" width="18" height="16" rx="2" fill={fill} stroke={stroke} strokeWidth={sw}/><path d="M3 10h18M8 3v4M16 3v4" stroke={stroke} strokeWidth={sw}/></g>,
    home: <path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>,
    map: <g><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M9 4v14M15 6v14" stroke={stroke} strokeWidth={sw}/></g>,
    bell: <g><path d="M6 16V11a6 6 0 0112 0v5l2 2H4l2-2z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M10 21a2 2 0 004 0" stroke={stroke} strokeWidth={sw}/></g>,
    check: <path d="M5 12l4 4 10-10" fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>,
    plus: <path d="M12 5v14M5 12h14" stroke={stroke} strokeWidth="2.2" strokeLinecap="round"/>,
    user: <g><circle cx="12" cy="8" r="4" fill={fill} stroke={stroke} strokeWidth={sw}/><path d="M4 21a8 8 0 0116 0" fill={fill} stroke={stroke} strokeWidth={sw}/></g>,
    shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>,
    coffee: <g><path d="M4 8h13v6a4 4 0 01-4 4H8a4 4 0 01-4-4V8z" fill={fill} stroke={stroke} strokeWidth={sw}/><path d="M17 10h2a2 2 0 010 4h-2M8 3v2M12 3v2" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></g>,
    book: <path d="M4 4h7a3 3 0 013 3v13a3 3 0 00-3-3H4V4zM20 4h-7a3 3 0 00-3 3v13a3 3 0 013-3h7V4z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>,
    sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>,
    settings: <g><circle cx="12" cy="12" r="3" fill={fill} stroke={stroke} strokeWidth={sw}/><path d="M19 12a7 7 0 00-.1-1.3l2-1.6-2-3.5-2.4.9a7 7 0 00-2.2-1.3L14 3h-4l-.3 2.2a7 7 0 00-2.2 1.3l-2.4-.9-2 3.5 2 1.6a7 7 0 000 2.6l-2 1.6 2 3.5 2.4-.9a7 7 0 002.2 1.3L10 21h4l.3-2.2a7 7 0 002.2-1.3l2.4.9 2-3.5-2-1.6c.1-.4.1-.9.1-1.3z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/></g>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden>
      {paths[name] || paths.sparkle}
    </svg>
  );
}

// Friendly initial-circle avatar (placeholder for real photo).
function Avatar({ name, size = 48, bg, fg }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('');
  const palette = [
    ['#F2D5CF', '#A53A2B'],
    ['#D6E7E5', '#0E4145'],
    ['#F4E2BF', '#7A4A0F'],
    ['#DDDDF0', '#2E3076'],
    ['#DCEAD3', '#2E5D2C'],
  ];
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % palette.length;
  const [b, f] = palette[idx];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg || b, color: fg || f,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, flexShrink: 0,
    }}>{initials}</div>
  );
}

// ─── Language ───
// Global context: 'en' | 'bn'. `useTr()` returns a translator that, given
// an English and Bengali string, picks the right one. Inline-friendly — no
// big dictionary needed.
const LangCtx = React.createContext({ lang: 'en', setLang: () => {} });
function useTr() {
  const { lang } = React.useContext(LangCtx);
  return (en, bn) => (lang === 'bn' ? (bn || en) : en);
}

Object.assign(window, { THEMES, FONTS, SCALE, Icon, Avatar, LangCtx, useTr });
