
export const validatePassword = (password) => {
  if (!password) {
    return {
      isValid: false,
      messageKey: 'validation.password_required'
    };
  }

  if (password.length < 12) {
    return {
      isValid: false,
      messageKey: 'validation.password_min_length',
      messageParams: { min: 12 }
    };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&#]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
    return {
      isValid: false,
      messageKey: 'validation.password_complexity'
    };
  }

  return {
    isValid: true,
    messageKey: '',
    messageParams: {}
  };
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return {
      isValid: false,
      messageKey: 'validation.email_invalid'
    };
  }
  return {
    isValid: true,
    messageKey: '',
    messageParams: {}
  };
};
