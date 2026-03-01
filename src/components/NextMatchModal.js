import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { getResponsiveSize } from '../utils/responsive';

const NextMatchModal = ({
  visible,
  title,
  message,
  initialTimer = 30,
  onConfirm,
  readOnly,
  readOnlyLabel,
  containerStyle,
  cardStyle,
  titleStyle,
  messageStyle,
  timerStyle,
  buttonStyle,
  buttonTextStyle
}) => {
  const [timer, setTimer] = useState(initialTimer);
  const [hasClicked, setHasClicked] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setTimer(initialTimer);
      setHasClicked(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Démarrer le compte à rebours uniquement si initialTimer > 0
      if (Number.isFinite(initialTimer) && initialTimer > 0) {
        intervalRef.current = setInterval(() => {
          setTimer(prev => {
            if (prev <= 1) {
              clearInterval(intervalRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [visible, initialTimer]);

  const handlePress = () => {
    if (hasClicked || readOnly) return;
    setHasClicked(true);
    if (onConfirm) onConfirm();
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View
        style={[
          {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: getResponsiveSize(20)
          },
          containerStyle
        ]}
      >
        <View
          style={[
            {
              alignSelf: 'center',
              width: '90%',
              backgroundColor: '#041c55',
              borderColor: '#f1c40f',
              borderWidth: getResponsiveSize(2),
              shadowColor: '#000',
              shadowOffset: { width: 0, height: getResponsiveSize(2) },
              shadowOpacity: 0.25,
              shadowRadius: getResponsiveSize(4),
              elevation: 5,
              padding: getResponsiveSize(20),
              borderRadius: getResponsiveSize(10),
              alignItems: 'center'
            },
            cardStyle
          ]}
        >
          <Text style={titleStyle}>{title}</Text>
          <Text style={messageStyle}>{message}</Text>
          {(Number.isFinite(initialTimer) && initialTimer > 0) ? (
            <Text style={timerStyle}>
              {timer > 0 ? `Temps restant: ${timer}s` : 'Temps écoulé'}
            </Text>
          ) : null}
          <TouchableOpacity
            style={[
              buttonStyle,
              (hasClicked || readOnly) && { opacity: 0.5, backgroundColor: '#555' }
            ]}
            disabled={hasClicked || readOnly}
            onPress={handlePress}
          >
            <Text style={buttonTextStyle}>
              {readOnly ? (readOnlyLabel || "En attente de la décision de l'hôte...") : (hasClicked ? 'En attente...' : 'Match Suivant')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default NextMatchModal;
