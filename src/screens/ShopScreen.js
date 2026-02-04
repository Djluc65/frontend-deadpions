import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';

const ShopScreen = () => {
  return (
    <ImageBackground 
      source={require('../../assets/images/Background2-4.png')} 
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <Text style={styles.text}>Magasin</Text>
        <Text style={styles.subText}>Coming Soon</Text>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  text: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
  },
  subText: {
    color: '#ccc',
    fontSize: 16,
    marginTop: 10,
  },
});

export default ShopScreen;
