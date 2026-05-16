import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import AnimatedSearchBar from '../ui/AnimatedSearchBar';
import { getResponsiveSize } from '../../utils/responsive';
import { T } from '../../utils/theme';

const Input = ({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  style,
  containerStyle,
  keyboardType,
  autoCapitalize,
  iconName,
  ...props
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isSecure = secureTextEntry && !isPasswordVisible;
  const resolvedIconName =
    iconName ||
    (secureTextEntry ? 'lock-closed-outline' : keyboardType === 'email-address' ? 'mail-outline' : 'person-outline');

  return (
    <View style={[styles.container, containerStyle]}>
      <AnimatedSearchBar
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={isSecure}
        showLeftIcon={true}
        leftIconName={resolvedIconName}
        leftIconColor={T.textMuted}
        showRightIcon={!!secureTextEntry}
        rightIconName={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
        rightIconColor={T.textMuted}
        onRightIconPress={secureTextEntry ? () => setIsPasswordVisible(v => !v) : undefined}
        innerStyle={[styles.inner, isFocused && styles.innerFocused]}
        inputStyle={[styles.input, style]}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: getResponsiveSize(6),
  },
  inner: {
    backgroundColor: T.bg2,
  },
  innerFocused: {
    backgroundColor: T.bg3,
  },
  input: {
    fontSize: getResponsiveSize(15),
    color: T.text,
  },
});

export default Input;
