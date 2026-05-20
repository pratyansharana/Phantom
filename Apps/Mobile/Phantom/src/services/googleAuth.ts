import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential, type User } from 'firebase/auth';
import Constants from 'expo-constants';
import { auth } from '../config/firebaseconfig';

const webClientId =
  (Constants.expoConfig?.extra?.googleWebClientId as string | undefined)
  || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

let configured = false;

export const configureGoogleSignIn = () => {
  if (!webClientId || configured) return;
  GoogleSignin.configure({
    webClientId,
    offlineAccess: true,
  });
  configured = true;
};

export const signInWithGoogle = async (): Promise<User> => {
  if (!webClientId) {
    throw new Error('Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (Firebase Web client ID) in .env or app.config.ts extra.googleWebClientId.');
  }

  configureGoogleSignIn();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const result = await GoogleSignin.signIn();
  const idToken = (result as { data?: { idToken?: string | null } }).data?.idToken
    ?? (result as { idToken?: string | null }).idToken;

  if (!idToken) {
    throw new Error('Google sign-in did not return an ID token.');
  }

  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(auth, credential);
  await userCredential.user.getIdToken(true);
  return userCredential.user;
};
