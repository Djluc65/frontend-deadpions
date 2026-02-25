import React from 'react';
import { View } from 'react-native';

export const StripeProviderWrapper = ({ children, ...props }) => {
  // On web, we don't render StripeProvider directly to avoid native module crashes.
  // If web support for Stripe is needed, use @stripe/stripe-js and @stripe/react-stripe-js here.
  return <>{children}</>;
};
