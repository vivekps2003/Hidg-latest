// theme.js — HidG Light Mode Design System

export const C = {
  // Backgrounds
  bg:        '#F8FAFC',   // page background
  surface:   '#FFFFFF',   // cards, inputs
  surfaceAlt:'#F1F5F9',   // subtle alt surface
  border:    '#E2E8F0',   // dividers, input borders
  borderFocus:'#2563EB',  // focused input border

  // Text
  textPrimary:   '#0F172A',
  textSecondary: '#475569',
  textMuted:     '#94A3B8',
  textInverse:   '#FFFFFF',

  // Brand
  primary:       '#2563EB',
  primaryLight:  '#EFF6FF',
  primaryDark:   '#1D4ED8',

  // Semantic
  success:       '#16A34A',
  successLight:  '#F0FDF4',
  successBorder: '#BBF7D0',
  warning:       '#D97706',
  warningLight:  '#FFFBEB',
  warningBorder: '#FDE68A',
  danger:        '#DC2626',
  dangerLight:   '#FEF2F2',
  dangerBorder:  '#FECACA',
  info:          '#0891B2',
  infoLight:     '#ECFEFF',

  // Status colors
  pending:   '#D97706',
  accepted:  '#2563EB',
  assigned:  '#7C3AED',
  inProgress:'#0891B2',
  picked:    '#16A34A',
  completed: '#15803D',
  rejected:  '#DC2626',
};

export const S = {
  // Shadows
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardMd: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  btn: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const R = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};
