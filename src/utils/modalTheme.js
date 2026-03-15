import { getResponsiveSize } from './responsive';

export const modalTheme = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    width: '80%',
    backgroundColor: '#041c55',
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(20),
    alignItems: 'center',
    shadowColor: '#f1c40f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 3,
    shadowRadius: getResponsiveSize(3),
    elevation: 5,
    borderWidth: getResponsiveSize(1),
    borderColor: '#f1c40f'
  },
  title: {
    fontSize: getResponsiveSize(24),
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(20),
    color: '#fff',
    textAlign: 'center'
  },
  message: {
    fontSize: getResponsiveSize(16),
    color: '#fff',
    marginBottom: getResponsiveSize(20),
    textAlign: 'center'
  },
  text: {
    fontSize: getResponsiveSize(18),
    color: '#fff'
  },
  button: {
    padding: getResponsiveSize(10),
    borderRadius: getResponsiveSize(10),
    borderWidth: getResponsiveSize(1),
    borderColor: '#f1c40f',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonActive: {
    backgroundColor: '#f1c40f',
    borderColor: '#f1c40f'
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: getResponsiveSize(16),
    textAlign: 'center'
  },
  buttonTextActive: {
    color: '#041c55'
  },
  buttonBase: {
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(10),
    paddingHorizontal: getResponsiveSize(30),
    minWidth: getResponsiveSize(120),
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonPrimary: {
    backgroundColor: '#f1c40f'
  },
  buttonCancel: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: getResponsiveSize(1),
    borderColor: '#f1c40f'
  },
  buttonDestructive: {
    backgroundColor: '#eb4141ff'
  },
  buttonTextBase: {
    fontWeight: 'bold',
    textAlign: 'center'
  },
  buttonTextPrimary: {
    color: '#041c55',
    fontSize: getResponsiveSize(16)
  },
  buttonTextOnDark: {
    color: '#fff',
    fontSize: getResponsiveSize(16)
  }
};
