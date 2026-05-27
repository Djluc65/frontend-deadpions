import { getResponsiveSize } from './responsive';
import { T } from './theme';

// ─── Palette cyber (miroir de HomeScreen / HomeTabNavigator) ──────────────────
const CYBER_GLASS        = 'rgba(10, 14, 28, 0.92)';
const CYBER_EDGE         = 'rgba(150, 180, 255, 0.18)';
const CYBER_CYAN         = '#5BD2FF';
const CYBER_CYAN_BORDER  = 'rgba(91, 210, 255, 0.35)';
const CYBER_TEXT_ON_CYAN = '#05060B';

export const modalTheme = {
  // ── Fond semi-opaque ────────────────────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 6, 11, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Carte principale (glassmorphisme cyber) ─────────────────────────────────
  card: {
    width: '85%',
    backgroundColor: CYBER_GLASS,
    borderRadius: getResponsiveSize(T.radiusLg),
    padding: getResponsiveSize(20),
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: CYBER_EDGE,
    shadowColor: CYBER_CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: getResponsiveSize(12),
    elevation: 14,
  },

  // ── Typographie ─────────────────────────────────────────────────────────────
  title: {
    fontSize: getResponsiveSize(22),
    fontWeight: '800',
    marginBottom: getResponsiveSize(16),
    color: T.text,
    textAlign: 'center',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  message: {
    fontSize: getResponsiveSize(15),
    color: T.textDim,
    marginBottom: getResponsiveSize(20),
    textAlign: 'center',
    lineHeight: getResponsiveSize(22),
  },
  subtitle: {
    fontSize: getResponsiveSize(14),
    color: T.textDim,
    textAlign: 'center',
    lineHeight: getResponsiveSize(20),
  },
  text: {
    fontSize: getResponsiveSize(15),
    color: T.text,
  },

  // ── Boutons ─────────────────────────────────────────────────────────────────
  button: {
    padding: getResponsiveSize(10),
    borderRadius: getResponsiveSize(T.radiusMd),
    borderWidth: 1.5,
    borderColor: CYBER_CYAN_BORDER,
    backgroundColor: T.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: CYBER_CYAN,
    borderColor: CYBER_CYAN,
    shadowColor: CYBER_CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: getResponsiveSize(8),
    elevation: 6,
  },
  buttonText: {
    color: T.text,
    fontWeight: '700',
    fontSize: getResponsiveSize(13),
    textAlign: 'center',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  buttonTextActive: {
    color: CYBER_TEXT_ON_CYAN,
  },

  // ── Variants boutons (buttonBase + modificateurs) ───────────────────────────
  buttonBase: {
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(13),
    paddingHorizontal: getResponsiveSize(28),
    minWidth: getResponsiveSize(120),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: CYBER_CYAN,
    borderWidth: 1.5,
    borderColor: CYBER_CYAN,
    shadowColor: CYBER_CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: getResponsiveSize(8),
    elevation: 6,
  },
  buttonCancel: {
    backgroundColor: T.bg3,
    borderWidth: 1.5,
    borderColor: CYBER_EDGE,
  },
  buttonDestructive: {
    backgroundColor: T.danger,
    borderWidth: 1.5,
    borderColor: T.danger,
  },
  buttonTextBase: {
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  buttonTextPrimary: {
    color: CYBER_TEXT_ON_CYAN,
    fontSize: getResponsiveSize(15),
  },
  buttonTextOnDark: {
    color: T.text,
    fontSize: getResponsiveSize(15),
  },
};
