import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { T } from '../../utils/theme';
import { getResponsiveSize } from '../../utils/responsive';
import { Ionicons } from '@expo/vector-icons';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onHide?: () => void;
  visible: boolean;
}

const ToastNotification: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onHide,
  visible
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.spring(translateY, {
          toValue: 50,
          useNativeDriver: true,
          tension: 50,
          friction: 8
        }),
        Animated.delay(duration),
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true
        })
      ]).start(() => {
        if (onHide) onHide();
      });
    }
  }, [visible]);

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'alert-circle';
      default: return 'information-circle';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'success': return T.green;
      case 'error': return T.red;
      default: return T.gold;
    }
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <View style={[styles.content, { borderColor: getColor() }]}>
        <Ionicons name={getIcon() as any} size={24} color={getColor()} />
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.bg2,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    maxWidth: '90%'
  },
  text: {
    color: T.text,
    fontSize: getResponsiveSize(14),
    fontWeight: '600',
    marginLeft: 10
  }
});

export default ToastNotification;
