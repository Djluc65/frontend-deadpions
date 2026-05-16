import React from 'react';
import renderer from 'react-test-renderer';
import { StyleSheet } from 'react-native';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('../src/utils/emojis', () => ({
  getEmojiSource: jest.fn(() => null),
}));

jest.mock('../src/components/EmojiAnimation', () => () => null);

jest.mock('../src/utils/responsive', () => ({
  getResponsiveSize: (v) => v,
  SCREEN_WIDTH: 375,
}));

const LiveChatOverlay = require('../src/components/LiveChatOverlay').default;

jest.setTimeout(20000);

describe('LiveChatOverlay', () => {
  const { act } = renderer;

  it('returns null when visible is false', async () => {
    let component;
    await act(async () => {
      component = renderer.create(
        <LiveChatOverlay
          visible={false}
          messages={[]}
          onSendMessage={() => {}}
          onSendReaction={() => {}}
        />
      );
    });
    expect(component.toJSON()).toBeNull();
  });

  it('hides the messages list when showMessages is false', async () => {
    let component;
    await act(async () => {
      component = renderer.create(
        <LiveChatOverlay
          visible={true}
          showMessages={false}
          messages={[{ id: '1', type: 'texte', auteur: 'A', contenu: 'Salut', estMoi: false }]}
          onSendMessage={() => {}}
          onSendReaction={() => {}}
        />
      );
    });

    expect(() => component.root.findByProps({ testID: 'live-chat-messages-container' })).toThrow();
    expect(component.root.findByProps({ testID: 'live-chat-input-wrapper' })).toBeTruthy();
  });

  it('applies messagesLeftOffset and inputLeftOffset styles', async () => {
    let component;
    await act(async () => {
      component = renderer.create(
        <LiveChatOverlay
          visible={true}
          showMessages={true}
          messagesLeftOffset={35}
          inputLeftOffset={100}
          bottomOffset={6}
          messages={[{ id: '1', type: 'texte', auteur: 'A', contenu: 'Salut', estMoi: false }]}
          onSendMessage={() => {}}
          onSendReaction={() => {}}
        />
      );
    });

    const messagesContainer = component.root.findByProps({ testID: 'live-chat-messages-container' });
    const inputWrapper = component.root.findByProps({ testID: 'live-chat-input-wrapper' });

    const messagesStyle = StyleSheet.flatten(messagesContainer.props.style);
    const inputStyle = StyleSheet.flatten(inputWrapper.props.style);

    expect(messagesStyle.left).toBe(35);
    expect(messagesStyle.bottom).toBe(106);

    expect(inputStyle.left).toBe(100);
    expect(inputStyle.bottom).toBe(6);
  });
});
