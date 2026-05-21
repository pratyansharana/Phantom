import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import PhantomBackground from './PhantomBackground';
import { colors } from '../theme';

export default function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <PhantomBackground>
      <View style={styles.center}>
        <View style={styles.badge}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
        <Text style={styles.title}>Phantom</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </PhantomBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  message: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
    fontWeight: '600',
  },
});
