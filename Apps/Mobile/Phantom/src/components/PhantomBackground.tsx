import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors } from '../theme';

type Variant = 'auth' | 'app';

export default function PhantomBackground({
  children,
  variant = 'app',
  style,
}: {
  children: React.ReactNode;
  variant?: Variant;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.root, style]}>
      <View style={styles.topSemicircle} />
      <View style={styles.circleOne} />
      <View style={styles.circleTwo} />
      <View style={styles.diagonalBand} />
      {variant === 'auth' && (
        <>
          <View style={styles.gridRowOne} />
          <View style={styles.gridRowTwo} />
          <View style={styles.ringAccent} />
        </>
      )}
      {variant === 'app' && <View style={styles.appGlow} />}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  topSemicircle: {
    position: 'absolute',
    top: -280,
    left: -90,
    right: -90,
    height: 560,
    borderRadius: 280,
    backgroundColor: colors.primary,
    opacity: 0.09,
  },
  circleOne: {
    position: 'absolute',
    top: 120,
    right: -50,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: colors.primaryGlow,
    opacity: 0.14,
  },
  circleTwo: {
    position: 'absolute',
    bottom: 80,
    left: -70,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: colors.accentSoft,
    opacity: 0.22,
  },
  diagonalBand: {
    position: 'absolute',
    top: '38%',
    right: -120,
    width: 280,
    height: 120,
    backgroundColor: colors.primarySoft,
    opacity: 0.35,
    transform: [{ rotate: '-18deg' }],
    borderRadius: 24,
  },
  gridRowOne: {
    position: 'absolute',
    top: 90,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: colors.primary,
    opacity: 0.06,
  },
  gridRowTwo: {
    position: 'absolute',
    top: 130,
    left: 40,
    right: 40,
    height: 1,
    backgroundColor: colors.primary,
    opacity: 0.04,
  },
  ringAccent: {
    position: 'absolute',
    bottom: 160,
    right: 30,
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: colors.primary,
    opacity: 0.12,
  },
  appGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: colors.primary,
    opacity: 0.04,
  },
});
