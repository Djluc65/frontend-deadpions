import renderer from 'react-test-renderer';
import AppAlertHost from '../src/components/AppAlertHost';
import CustomAlert from '../src/components/CustomAlert';
import { appAlert } from '../src/services/appAlert';

jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn(() => Promise.resolve({ sound: { unloadAsync: jest.fn() } })),
    },
    setAudioModeAsync: jest.fn(),
  },
}));

jest.mock('../src/utils/soundManager', () => ({
  playButtonSound: jest.fn(),
}));

describe('AppAlertHost', () => {
  it('passes button textStyle through to CustomAlert', async () => {
    const { act } = renderer;
    let component;

    await act(async () => {
      component = renderer.create(<AppAlertHost />);
    });

    await act(async () => {
      appAlert('Bonus', 'Message', [
        { text: 'Non merci', style: 'cancel', textStyle: { fontSize: 12 } },
        { text: 'Regarder', textStyle: { fontSize: 14 } }
      ]);
    });

    const alert = component.root.findByType(CustomAlert);
    expect(alert.props.buttons).toHaveLength(2);
    expect(alert.props.buttons[0].text).toBe('Non merci');
    expect(alert.props.buttons[0].textStyle).toEqual({ fontSize: 12 });
    expect(alert.props.buttons[1].text).toBe('Regarder');
    expect(alert.props.buttons[1].textStyle).toEqual({ fontSize: 14 });

    await act(async () => {
      component.unmount();
    });
  });

  it('defaults to an OK button when buttons are missing', async () => {
    const { act } = renderer;
    let component;

    await act(async () => {
      component = renderer.create(<AppAlertHost />);
    });

    await act(async () => {
      appAlert('Titre', 'Message');
    });

    const alert = component.root.findByType(CustomAlert);
    expect(alert.props.buttons).toHaveLength(1);
    expect(alert.props.buttons[0].text).toBe('OK');

    await act(async () => {
      component.unmount();
    });
  });
});
