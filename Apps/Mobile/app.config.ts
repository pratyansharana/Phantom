import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  // Ensure the slug is a string or fallback to a default
  const cleanSlug = config.slug 
    ? config.slug.replace(/-/g, '').toLowerCase() 
    : 'template';

  const companyPrefix = 'com.yourname'; // CHANGE THIS TO YOUR ACTUAL DEV NAME/COMPANY

  // Notice the parentheses ( ) directly after return
  return {
    ...config,
    ios: {
      ...config.ios,
      bundleIdentifier: `${companyPrefix}.${cleanSlug}`,
    },
    android: {
      ...config.android,
      package: `${companyPrefix}.${cleanSlug}`,
    },
  };
};