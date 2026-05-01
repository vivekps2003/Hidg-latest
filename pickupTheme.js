// pickupTheme.js — Pickup Agent Green-White Design System

export const P = {
  bg:           '#F0FDF4',  // green-50 page background
  surface:      '#FFFFFF',  // cards
  surfaceAlt:   '#DCFCE7',  // green-100 subtle tint
  border:       '#BBF7D0',  // green-200 border
  borderFocus:  '#16A34A',  // green-600 focus

  primary:      '#16A34A',  // green-600
  primaryDark:  '#15803D',  // green-700
  primaryLight: '#DCFCE7',  // green-100
  primaryText:  '#14532D',  // green-900

  textPrimary:   '#1C1917',
  textSecondary: '#57534E',
  textMuted:     '#A8A29E',
  textInverse:   '#FFFFFF',

  // Earnings accent — teal
  accent:       '#0891B2',
  accentLight:  '#ECFEFF',
  accentBorder: '#A5F3FC',

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
  purple:        '#7C3AED',
  purpleLight:   '#EDE9FE',
  purpleBorder:  '#DDD6FE',
  blue:          '#2563EB',
  blueLight:     '#EFF6FF',
  blueBorder:    '#BFDBFE',
};

export const PS = {
  card: {
    shadowColor: '#14532D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardMd: {
    shadowColor: '#14532D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  btn: {
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const PR = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };

export const STATUS = {
  assigned:    { label: 'Assigned',    color: P.warning,  bg: P.warningLight,  border: P.warningBorder, icon: 'person-outline' },
  accepted:    { label: 'Accepted',    color: P.blue,     bg: P.blueLight,     border: P.blueBorder,    icon: 'checkmark-circle-outline' },
  in_progress: { label: 'In Progress', color: P.purple,   bg: P.purpleLight,   border: P.purpleBorder,  icon: 'car-outline' },
  picked_up:   { label: 'Picked Up',   color: P.primary,  bg: P.primaryLight,  border: P.border,        icon: 'cube-outline' },
};

export const NEXT_ACTION = {
  assigned:    { label: 'Accept Pickup',      next: 'accepted',    color: P.blue,        textColor: '#fff' },
  accepted:    { label: 'Start Trip',         next: 'in_progress', color: P.purple,      textColor: '#fff' },
  in_progress: { label: 'Mark Picked Up',     next: 'picked_up',   color: P.primary,     textColor: '#fff' },
  picked_up:   { label: 'Delivery Complete',  next: null,          color: P.primaryDark, textColor: '#fff' },
};
