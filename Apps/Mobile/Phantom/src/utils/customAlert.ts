import { Alert, Platform } from 'react-native';

export const customAlert = {
  alert: (
    title: string,
    message?: string,
    buttons?: Array<{ text?: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>
  ) => {
    if (Platform.OS === 'web') {
      const text = [title, message].filter(Boolean).join('\n');
      if (!buttons || buttons.length === 0) {
        window.alert(text);
        return;
      }

      if (buttons.length === 1) {
        window.alert(text);
        buttons[0].onPress?.();
        return;
      }

      const result = window.confirm(text);
      if (result) {
        const confirmButton = buttons.find(b => b.style !== 'cancel') || buttons[0];
        confirmButton.onPress?.();
      } else {
        const cancelButton = buttons.find(b => b.style === 'cancel');
        cancelButton?.onPress?.();
      }
    } else {
      Alert.alert(title, message, buttons);
    }
  }
};
