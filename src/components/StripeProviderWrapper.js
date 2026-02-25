import React from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';

export const StripeProviderWrapper = ({ children, ...props }) => {
  return <StripeProvider {...props}>{children}</StripeProvider>;
};
