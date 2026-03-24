import React from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';
import { Platform } from 'react-native';

export const StripeProviderWrapper = ({ children, ...props }) => {
  if (Platform.OS === 'ios') {
    return <>{children}</>;
  }
  return <StripeProvider {...props}>{children}</StripeProvider>;
};
