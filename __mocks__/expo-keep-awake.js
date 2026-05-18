// Mock Jest pour expo-keep-awake (module natif indisponible en environnement Node)
const useKeepAwake = () => {};
const activateKeepAwake = () => {};
const deactivateKeepAwake = () => {};

module.exports = { useKeepAwake, activateKeepAwake, deactivateKeepAwake };
