// agencyTheme.js — Agency Yellow-White Design System

export const A = {
  // Backgrounds
  bg:          '#FFFBEB',   // warm white page background
  surface:     '#FFFFFF',   // cards
  surfaceAlt:  '#FEF9C3',   // subtle yellow tint surface
  border:      '#FDE68A',   // yellow border
  borderFocus: '#F59E0B',   // amber focus

  // Brand — Amber/Yellow
  primary:      '#F59E0B',  // amber-400
  primaryDark:  '#D97706',  // amber-600
  primaryLight: '#FEF3C7',  // amber-100
  primaryText:  '#92400E',  // amber-900 (text on light bg)

  // Text
  textPrimary:   '#1C1917',  // warm black
  textSecondary: '#57534E',  // warm gray
  textMuted:     '#A8A29E',  // light warm gray
  textInverse:   '#FFFFFF',

  // Semantic
  success:       '#16A34A',
  successLight:  '#F0FDF4',
  successBorder: '#BBF7D0',
  danger:        '#DC2626',
  dangerLight:   '#FEF2F2',
  dangerBorder:  '#FECACA',
  info:          '#0891B2',
  infoLight:     '#ECFEFF',
  infoBorder:    '#A5F3FC',

  // Status
  pending:   '#F59E0B',
  accepted:  '#16A34A',
  rejected:  '#DC2626',
  assigned:  '#7C3AED',
  completed: '#0891B2',
};

export const AS = {
  card: {
    shadowColor: '#92400E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardMd: {
    shadowColor: '#92400E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  btn: {
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const AR = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };
