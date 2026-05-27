import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Platform } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        /* Force vertical scrollbar (scrolling slider) on the main browser window / screens */
        html {
          overflow-y: scroll !important;
        }
        
        /* Premium custom scrollbar (scrolling slider) styling */
        ::-webkit-scrollbar {
          width: 8px !important;
          height: 8px !important;
        }
        ::-webkit-scrollbar-track {
          background: #F1F5F9 !important;
          border-radius: 4px !important;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #6366F1 0%, #4F46E5 100%) !important;
          border-radius: 4px !important;
          border: 1px solid #F1F5F9 !important;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #4F46E5 0%, #3730A3 100%) !important;
        }
        /* Firefox support */
        * {
          scrollbar-width: thin !important;
          scrollbar-color: #4F46E5 #F1F5F9 !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
