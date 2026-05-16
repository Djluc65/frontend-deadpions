import { getResponsiveSize } from './responsive';
import { T } from './theme';

export const modalTheme = {
  overlay: {
    flex: 1,
    backgroundColor: T.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '85%',
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusLg),
    padding: getResponsiveSize(20),
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: T.gold,
    // Ombre dorée premium (HomeHeader style)
    shadowColor: T.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 14,
  },
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
  text: {
    fontSize: getResponsiveSize(15),
    color: T.text,
  },
  button: {
    padding: getResponsiveSize(10),
    borderRadius: getResponsiveSize(T.radiusMd),
    borderWidth: 1.5,
    borderColor: T.gold,
    backgroundColor: T.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: T.gold,
    borderColor: T.gold,
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
    color: '#1B1305',
  },
  buttonBase: {
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(13),
    paddingHorizontal: getResponsiveSize(28),
    minWidth: getResponsiveSize(120),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: T.gold,
    borderWidth: 1.5,
    borderColor: T.gold,
    ...T.shadowBtn,
  },
  buttonCancel: {
    backgroundColor: T.bg3,
    borderWidth: 1.5,
    borderColor: T.gold,
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
    color: '#1B1305',
    fontSize: getResponsiveSize(15),
  },
  buttonTextOnDark: {
    color: T.text,
    fontSize: getResponsiveSize(15),
  },
};
