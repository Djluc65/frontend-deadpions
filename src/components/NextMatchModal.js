import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';

const NextMatchModal = ({
  visible,
  title,
  message,
  initialTimer = 30,
  onConfirm,
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
      intervalRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
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
    if (hasClicked) return;
    setHasClicked(true);
    if (onConfirm) onConfirm();
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View
        style={[
          {
            flex: 1,
            backgroundColor: 'transparent',
            justifyContent: 'flex-end',
            paddingBottom: 20
          },
          containerStyle
        ]}
      >
        <View
          style={[
            {
              alignSelf: 'center',
              width: '90%',
              marginBottom: 20,
              top: 0,
              backgroundColor: '#041c55',
              borderColor: '#f1c40f',
              borderWidth: 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
              padding: 20,
              borderRadius: 10
            },
            cardStyle
          ]}
        >
          <Text style={titleStyle}>{title}</Text>
          <Text style={messageStyle}>{message}</Text>
          <Text style={timerStyle}>
            {timer > 0 ? `Temps restant: ${timer}s` : 'Temps écoulé'}
          </Text>
          <TouchableOpacity
            style={[
              buttonStyle,
              hasClicked && { opacity: 0.5, backgroundColor: '#555' }
            ]}
            disabled={hasClicked}
            onPress={handlePress}
          >
            <Text style={buttonTextStyle}>
              {hasClicked ? 'En attente...' : 'Match Suivant'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default NextMatchModal;
