/**
 * Tests pour la logique handleBackPress de SalleAttenteLive.
 *
 * Reproduit la logique du composant sans le monter : pas de dépendances React Native,
 * pas de socket réel. Seule la logique comportementale est vérifiée.
 *
 * Scénario couvert : Wis (créateur) retourne dans la salle d'attente après que
 * Custom (invité) a quitté la partie live. Il appuie sur ← et doit pouvoir quitter.
 */

// ---------------------------------------------------------------------------
// Fabrique reproduisant la logique de handleBackPress (SalleAttenteLive.js)
// ---------------------------------------------------------------------------
/**
 * @param {object} deps
 * @param {string}   deps.userId            ID de l'utilisateur courant
 * @param {string}   deps.creatorId         ID du créateur de la salle
 * @param {string}   deps.roomId            ID de la salle
 * @param {object}   deps.socket            Mock socket (méthode emit)
 * @param {object}   deps.navigation        Mock navigation (méthode reset)
 * @param {Function} deps.setInviteModalVisible
 * @param {object}   deps.isLeavingRef      { current: boolean }
 * @param {object}   deps.detachRef         { current: Function | null }
 * @param {Function} deps.t                 Fonction de traduction
 * @param {object}   deps.Alert             Alert injectable (Alert.alert)
 */
const makeHandleBackPress = ({
  userId,
  creatorId,
  roomId,
  socket,
  navigation,
  setInviteModalVisible,
  isLeavingRef,
  detachRef,
  t,
  Alert,
}) => {
  return () => {
    const isCreatorEffective = Boolean(
      userId && creatorId && userId.toString() === creatorId.toString()
    );

    // Fermer le modal d'invitation immédiatement (évite les conflits d'animation iOS)
    setInviteModalVisible(false);

    // Attendre 400ms que l'animation de fermeture du modal se termine
    setTimeout(() => {
      if (isCreatorEffective) {
        Alert.alert(
          t('live_room.stop_live_title'),
          t('live_room.stop_live_desc'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('live_room.stop_live_btn'),
              style: 'destructive',
              onPress: () => {
                isLeavingRef.current = true;
                try { detachRef.current?.(); } catch (_) {}
                try { socket.emit('stop_live_room', { gameId: roomId, userId }); } catch (_) {}
                try { socket.emit('leave_live_room', { gameId: roomId, userId }); } catch (_) {}
                navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          t('live_room.leave_live_title'),
          t('live_room.leave_live_desc'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('live_room.leave_live_btn'),
              style: 'destructive',
              onPress: () => {
                isLeavingRef.current = true;
                try { detachRef.current?.(); } catch (_) {}
                try { socket.emit('leave_live_room', { gameId: roomId, userId }); } catch (_) {}
                navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
              },
            },
          ]
        );
      }
    }, 400);
  };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeT = () => (key) => key;

const makeDeps = (overrides = {}) => ({
  userId: 'user-wis',
  creatorId: 'user-wis',
  roomId: 'room-abc',
  socket: { emit: jest.fn() },
  navigation: { reset: jest.fn() },
  setInviteModalVisible: jest.fn(),
  isLeavingRef: { current: false },
  detachRef: { current: jest.fn() },
  t: makeT(),
  Alert: { alert: jest.fn() },
  ...overrides,
});

/** Extrait le bouton de confirmation (style: 'destructive') des arguments Alert.alert */
const getConfirmButton = (mockAlert) => {
  const buttons = mockAlert.alert.mock.calls[0][2];
  return buttons.find((b) => b.style === 'destructive');
};

/** Extrait le bouton d'annulation (style: 'cancel') des arguments Alert.alert */
const getCancelButton = (mockAlert) => {
  const buttons = mockAlert.alert.mock.calls[0][2];
  return buttons.find((b) => b.style === 'cancel');
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('SalleAttenteLive — handleBackPress', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Comportement immédiat (avant la temporisation)
  // -------------------------------------------------------------------------
  describe('comportement immédiat', () => {
    it('ferme le modal d\'invitation immédiatement sans attendre la temporisation', () => {
      const deps = makeDeps();
      const handleBackPress = makeHandleBackPress(deps);

      handleBackPress();

      expect(deps.setInviteModalVisible).toHaveBeenCalledTimes(1);
      expect(deps.setInviteModalVisible).toHaveBeenCalledWith(false);
      // Alert ne doit pas encore être apparu
      expect(deps.Alert.alert).not.toHaveBeenCalled();
    });

    it('n\'affiche pas Alert.alert avant 400 ms', () => {
      const deps = makeDeps();
      const handleBackPress = makeHandleBackPress(deps);

      handleBackPress();
      jest.advanceTimersByTime(399);

      expect(deps.Alert.alert).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Routage Alert selon le rôle (créateur vs invité)
  // -------------------------------------------------------------------------
  describe('routage Alert selon le rôle', () => {
    it('affiche la confirmation d\'arrêt pour le créateur après 400 ms', () => {
      const deps = makeDeps({ userId: 'creator-1', creatorId: 'creator-1' });
      makeHandleBackPress(deps)();
      jest.advanceTimersByTime(400);

      expect(deps.Alert.alert).toHaveBeenCalledTimes(1);
      expect(deps.Alert.alert.mock.calls[0][0]).toBe('live_room.stop_live_title');
    });

    it('affiche la confirmation de départ pour un invité après 400 ms', () => {
      const deps = makeDeps({ userId: 'guest-1', creatorId: 'creator-1' });
      makeHandleBackPress(deps)();
      jest.advanceTimersByTime(400);

      expect(deps.Alert.alert).toHaveBeenCalledTimes(1);
      expect(deps.Alert.alert.mock.calls[0][0]).toBe('live_room.leave_live_title');
    });

    it('fonctionne quand userId et creatorId sont numériques (comparison toString)', () => {
      const deps = makeDeps({ userId: 42, creatorId: 42 });
      makeHandleBackPress(deps)();
      jest.advanceTimersByTime(400);

      expect(deps.Alert.alert.mock.calls[0][0]).toBe('live_room.stop_live_title');
    });

    it('distingue correctement créateur et non-créateur même si les IDs se ressemblent', () => {
      const deps = makeDeps({ userId: 'user-1', creatorId: 'user-10' });
      makeHandleBackPress(deps)();
      jest.advanceTimersByTime(400);

      // Pas le créateur → confirmation de départ
      expect(deps.Alert.alert.mock.calls[0][0]).toBe('live_room.leave_live_title');
    });
  });

  // -------------------------------------------------------------------------
  // Confirmation créateur
  // -------------------------------------------------------------------------
  describe('créateur — confirmation', () => {
    const setupCreator = () => {
      const deps = makeDeps({ userId: 'wis', creatorId: 'wis' });
      makeHandleBackPress(deps)();
      jest.advanceTimersByTime(400);
      return deps;
    };

    it('émet stop_live_room avec le bon gameId', () => {
      const deps = setupCreator();
      getConfirmButton(deps.Alert).onPress();

      expect(deps.socket.emit).toHaveBeenCalledWith('stop_live_room', {
        gameId: 'room-abc',
        userId: 'wis',
      });
    });

    it('émet leave_live_room avec le bon gameId', () => {
      const deps = setupCreator();
      getConfirmButton(deps.Alert).onPress();

      expect(deps.socket.emit).toHaveBeenCalledWith('leave_live_room', {
        gameId: 'room-abc',
        userId: 'wis',
      });
    });

    it('émet les deux événements socket (stop ET leave)', () => {
      const deps = setupCreator();
      getConfirmButton(deps.Alert).onPress();

      const emittedEvents = deps.socket.emit.mock.calls.map((c) => c[0]);
      expect(emittedEvents).toContain('stop_live_room');
      expect(emittedEvents).toContain('leave_live_room');
      expect(deps.socket.emit).toHaveBeenCalledTimes(2);
    });

    it('navigue vers Home via navigation.reset', () => {
      const deps = setupCreator();
      getConfirmButton(deps.Alert).onPress();

      expect(deps.navigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    });

    it('met isLeavingRef.current à true', () => {
      const deps = setupCreator();
      expect(deps.isLeavingRef.current).toBe(false);
      getConfirmButton(deps.Alert).onPress();
      expect(deps.isLeavingRef.current).toBe(true);
    });

    it('appelle detachRef.current pour détacher les écouteurs socket', () => {
      const deps = setupCreator();
      getConfirmButton(deps.Alert).onPress();

      expect(deps.detachRef.current).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Confirmation invité
  // -------------------------------------------------------------------------
  describe('invité — confirmation', () => {
    const setupGuest = () => {
      const deps = makeDeps({ userId: 'custom', creatorId: 'wis' });
      makeHandleBackPress(deps)();
      jest.advanceTimersByTime(400);
      return deps;
    };

    it('émet leave_live_room avec le bon gameId', () => {
      const deps = setupGuest();
      getConfirmButton(deps.Alert).onPress();

      expect(deps.socket.emit).toHaveBeenCalledWith('leave_live_room', {
        gameId: 'room-abc',
        userId: 'custom',
      });
    });

    it('n\'émet pas stop_live_room', () => {
      const deps = setupGuest();
      getConfirmButton(deps.Alert).onPress();

      const emittedEvents = deps.socket.emit.mock.calls.map((c) => c[0]);
      expect(emittedEvents).not.toContain('stop_live_room');
      expect(deps.socket.emit).toHaveBeenCalledTimes(1);
    });

    it('navigue vers Home via navigation.reset', () => {
      const deps = setupGuest();
      getConfirmButton(deps.Alert).onPress();

      expect(deps.navigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    });

    it('met isLeavingRef.current à true', () => {
      const deps = setupGuest();
      getConfirmButton(deps.Alert).onPress();
      expect(deps.isLeavingRef.current).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Annulation (bouton Cancel)
  // -------------------------------------------------------------------------
  describe('annulation', () => {
    it('n\'émet aucun événement socket si le créateur annule', () => {
      const deps = makeDeps({ userId: 'wis', creatorId: 'wis' });
      makeHandleBackPress(deps)();
      jest.advanceTimersByTime(400);

      // Le bouton cancel n'a pas d'onPress → simuler l'absence d'action
      const cancelBtn = getCancelButton(deps.Alert);
      if (cancelBtn.onPress) cancelBtn.onPress();

      expect(deps.socket.emit).not.toHaveBeenCalled();
      expect(deps.navigation.reset).not.toHaveBeenCalled();
    });

    it('n\'émet aucun événement socket si l\'invité annule', () => {
      const deps = makeDeps({ userId: 'custom', creatorId: 'wis' });
      makeHandleBackPress(deps)();
      jest.advanceTimersByTime(400);

      const cancelBtn = getCancelButton(deps.Alert);
      if (cancelBtn.onPress) cancelBtn.onPress();

      expect(deps.socket.emit).not.toHaveBeenCalled();
      expect(deps.navigation.reset).not.toHaveBeenCalled();
    });

    it('ne modifie pas isLeavingRef si annulé', () => {
      const deps = makeDeps({ userId: 'wis', creatorId: 'wis' });
      makeHandleBackPress(deps)();
      jest.advanceTimersByTime(400);

      const cancelBtn = getCancelButton(deps.Alert);
      if (cancelBtn.onPress) cancelBtn.onPress();

      expect(deps.isLeavingRef.current).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Robustesse — detachRef null / socket qui lève une exception
  // -------------------------------------------------------------------------
  describe('robustesse', () => {
    it('ne plante pas si detachRef.current est null', () => {
      const deps = makeDeps({ userId: 'wis', creatorId: 'wis', detachRef: { current: null } });
      makeHandleBackPress(deps)();
      jest.advanceTimersByTime(400);

      expect(() => getConfirmButton(deps.Alert).onPress()).not.toThrow();
    });

    it('ne plante pas si socket.emit lance une exception', () => {
      const socket = { emit: jest.fn().mockImplementation(() => { throw new Error('réseau coupé'); }) };
      const deps = makeDeps({ userId: 'wis', creatorId: 'wis', socket });
      makeHandleBackPress(deps)();
      jest.advanceTimersByTime(400);

      expect(() => getConfirmButton(deps.Alert).onPress()).not.toThrow();
      // La navigation doit quand même avoir lieu malgré l'erreur socket
      expect(deps.navigation.reset).toHaveBeenCalled();
    });
  });
});
