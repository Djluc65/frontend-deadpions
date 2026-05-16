import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { playButtonSound } from '../../utils/soundManager';
import { getResponsiveSize } from '../../utils/responsive';
import { T } from '../../utils/theme';

const Button = ({ title, onPress, loading, style, textStyle, tone = 'gold', size = 'md', disabled, icon }) => {
  const handlePress = async () => {
    await playButtonSound();
    if (onPress) onPress();
  };

  const sizeStyle = size === 'sm' ? styles.buttonSm : size === 'lg' ? styles.buttonLg : styles.buttonMd;
  const textSizeStyle = size === 'sm' ? styles.textSm : size === 'lg' ? styles.textLg : styles.textMd;

  const toneStyle = tone === 'ghost'
    ? styles.toneGhost
    : tone === 'red'
    ? styles.toneRed
    : tone === 'dark'
    ? styles.toneDark
    : styles.toneGold;

  const textToneStyle = tone === 'ghost'
    ? styles.textGhost
    : tone === 'dark'
    ? styles.textDark
    : tone === 'red'
    ? styles.textLight
    : styles.textOnGold;

  return (
    <TouchableOpacity
      style={[styles.button, sizeStyle, toneStyle, disabled && styles.disabled, style]}
      onPress={handlePress}
      disabled={loading || disabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={tone === 'gold' ? '#1B1305' : '#ECE6D6'} />
      ) : (
        <View style={styles.inner}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={[styles.text, textSizeStyle, textToneStyle, textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: T.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: getResponsiveSize(6),
    width: '100%',
    borderWidth: 1,
    ...T.shadowBtn,
  },
  buttonSm: {
    paddingVertical: getResponsiveSize(8),
    paddingHorizontal: getResponsiveSize(14),
    minHeight: getResponsiveSize(36),
  },
  buttonMd: {
    paddingVertical: getResponsiveSize(13),
    paddingHorizontal: getResponsiveSize(20),
    minHeight: getResponsiveSize(48),
  },
  buttonLg: {
    paddingVertical: getResponsiveSize(15),
    paddingHorizontal: getResponsiveSize(24),
    minHeight: getResponsiveSize(56),
  },
  toneGold: {
    backgroundColor: T.gold,
    borderColor: T.gold,
  },
  toneRed: {
    backgroundColor: T.red,
    borderColor: T.red,
  },
  toneDark: {
    backgroundColor: T.bg2,
    borderColor: T.borderSoft,
  },
  toneGhost: {
    backgroundColor: 'transparent',
    borderColor: T.border,
  },
  disabled: {
    opacity: 0.45,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  textSm: {
    fontSize: getResponsiveSize(13),
  },
  textMd: {
    fontSize: getResponsiveSize(15),
  },
  textLg: {
    fontSize: getResponsiveSize(17),
  },
  textOnGold: {
    color: '#1B1305',
  },
  textLight: {
    color: '#ECE6D6',
  },
  textGhost: {
    color: T.text,
  },
  textDark: {
    color: T.text,
  },
});

export default Button;
