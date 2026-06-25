import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';

const cleanEnv = (value) => (typeof value === 'string' ? value.trim() : undefined);

export const deriveGoogleRedirectNative = (clientId) => {
  const guid = clientId?.split('.apps.googleusercontent.com')?.[0];
  return guid ? `com.googleusercontent.apps.${guid}:/oauthredirect` : undefined;
};

export const isGoogleOAuthConfigError = (responseOrError) => {
  const errToken = [
    responseOrError?.error?.message,
    responseOrError?.error?.code,
    responseOrError?.params?.error,
    responseOrError?.params?.error_description,
    typeof responseOrError === 'string' ? responseOrError : null,
  ].filter(Boolean).join(' ');
  return /invalid_request|redirect_uri_mismatch|custom uri|access blocked/i.test(errToken);
};

export function useGoogleAuthRequest() {
  const googleWebClientId = cleanEnv(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
  const googleIosClientId = cleanEnv(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  const googleAndroidClientId = cleanEnv(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);

  // ✅ redirectUri natif passé dans le PREMIER argument (config), pas le second
  const redirectUri = Platform.select({
    ios: deriveGoogleRedirectNative(googleIosClientId),
    android: deriveGoogleRedirectNative(googleAndroidClientId),
    default: AuthSession.makeRedirectUri({ useProxy: false }),
  });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleWebClientId,
    iosClientId: googleIosClientId,
    androidClientId: googleAndroidClientId,
    redirectUri,  // ✅ ICI, dans la config
  });

  const googleConfigured = Platform.OS === 'android'
    ? Boolean(googleAndroidClientId)
    : Platform.OS === 'ios'
      ? Boolean(googleIosClientId)
      : Boolean(googleWebClientId);

  return {
    request,
    response,
    promptAsync,
    googleConfigured,
  };
}