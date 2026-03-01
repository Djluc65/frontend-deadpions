import React, { useState } from 'react';
import { TextInput, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getResponsiveSize } from '../../utils/responsive';

const Input = ({ value, onChangeText, placeholder, secureTextEntry, style, keyboardType, autoCapitalize, ...props }) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  // Si secureTextEntry est true, on utilise l'état local pour gérer la visibilité
  // Si secureTextEntry est false (champ normal), isSecure est toujours false
  const isSecure = secureTextEntry && !isPasswordVisible;

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, style, secureTextEntry && styles.passwordInput]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(3, 3, 3, 0.6)"
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity 
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeIcon}
          >
            <Ionicons 
              name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
              size={getResponsiveSize(24)} 
              color="#666" 
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: getResponsiveSize(10),
  },
  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: getResponsiveSize(15),
    borderRadius: getResponsiveSize(8),
    fontSize: getResponsiveSize(16),
    color: '#000',
    width: '100%',
  },
  passwordInput: {
    paddingRight: getResponsiveSize(50), // Espace pour l'icône
  },
  eyeIcon: {
    position: 'absolute',
    right: getResponsiveSize(15),
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default Input;
