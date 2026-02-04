
export const validatePassword = (password) => {
  if (!password) {
    return {
      isValid: false,
      message: 'Le mot de passe est requis.'
    };
  }

  if (password.length < 12) {
    return {
      isValid: false,
      message: 'Le mot de passe doit contenir au moins 12 caractères.'
    };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&#]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
    return {
      isValid: false,
      message: 'Le mot de passe doit contenir : majuscule, minuscule, chiffre et caractère spécial (@$!%*?&#).'
    };
  }

  return {
    isValid: true,
    message: ''
  };
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return {
      isValid: false,
      message: 'Email invalide.'
    };
  }
  return {
    isValid: true,
    message: ''
  };
};
