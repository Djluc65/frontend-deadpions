describe('StripeProviderWrapper', () => {
  const createSut = ({ os }) => {
    jest.resetModules();
    jest.doMock('react-native', () => {
      return {
        Platform: {
          OS: os,
        },
      };
    });

    const React = require('react');
    const renderer = require('react-test-renderer');

    const StripeProviderMock = ({ children }) =>
      React.createElement(React.Fragment, null, children);
    StripeProviderMock.displayName = 'StripeProviderMock';

    jest.doMock('@stripe/stripe-react-native', () => ({
      StripeProvider: StripeProviderMock,
    }));

    const { StripeProviderWrapper } = require('../src/components/StripeProviderWrapper');

    const Child = () => React.createElement('CHILD', null, 'child');

    return { React, renderer, StripeProviderWrapper, Child, StripeProviderMock };
  };

  it('sur iOS, rend les enfants sans StripeProvider', () => {
    const { React, renderer, StripeProviderWrapper, Child, StripeProviderMock } = createSut({
      os: 'ios',
    });

    let component;
    renderer.act(() => {
      component = renderer.create(
        React.createElement(
          StripeProviderWrapper,
          { publishableKey: 'pk_test_123' },
          React.createElement(Child)
        )
      );
    });

    expect(() => component.root.findByType(StripeProviderMock)).toThrow();
    expect(component.root.findByType(Child)).toBeTruthy();
  });

  it('sur Android, encapsule les enfants dans StripeProvider', () => {
    const { React, renderer, StripeProviderWrapper, Child, StripeProviderMock } = createSut({
      os: 'android',
    });

    let component;
    renderer.act(() => {
      component = renderer.create(
        React.createElement(
          StripeProviderWrapper,
          { publishableKey: 'pk_test_123' },
          React.createElement(Child)
        )
      );
    });

    expect(component.root.findByType(StripeProviderMock)).toBeTruthy();
    expect(component.root.findByType(Child)).toBeTruthy();
  });
});
