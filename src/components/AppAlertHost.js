import React, { useEffect, useMemo, useRef, useState } from 'react';
import CustomAlert from './CustomAlert';
import { setAppAlertHandler } from '../services/appAlert';

const normalizeButtons = (buttons) => {
  if (!Array.isArray(buttons) || buttons.length === 0) {
    return [{ text: 'OK' }];
  }
  return buttons.map(b => ({
    text: b?.text == null ? 'OK' : String(b.text),
    style: b?.style,
    onPress: typeof b?.onPress === 'function' ? b.onPress : undefined,
    manualClose: Boolean(b?.manualClose),
    textStyle: (b?.textStyle && typeof b.textStyle === 'object') ? b.textStyle : undefined
  }));
};

const AppAlertHost = () => {
  const queueRef = useRef([]);
  const [state, setState] = useState({ visible: false, title: '', message: '', buttons: [] });

  const show = useMemo(() => (payload) => {
    if (state.visible) {
      queueRef.current.push(payload);
      return;
    }
    setState({
      visible: true,
      title: payload?.title || '',
      message: payload?.message || '',
      buttons: normalizeButtons(payload?.buttons)
    });
  }, [state.visible]);

  useEffect(() => {
    setAppAlertHandler(show);
    return () => setAppAlertHandler(null);
  }, [show]);

  const handleClose = () => {
    setState(prev => ({ ...prev, visible: false }));
    const next = queueRef.current.shift();
    if (next) {
      setTimeout(() => show(next), 0);
    }
  };

  return (
    <CustomAlert
      visible={state.visible}
      title={state.title}
      message={state.message}
      buttons={state.buttons}
      onClose={handleClose}
    />
  );
};

export default AppAlertHost;
