let handler = null;
let pending = [];

export function setAppAlertHandler(nextHandler) {
  handler = nextHandler;
  if (handler && pending.length) {
    const toFlush = pending;
    pending = [];
    toFlush.forEach(payload => handler(payload));
  }
}

export function appAlert(title, message, buttons) {
  const payload = {
    title: title == null ? '' : String(title),
    message: message == null ? '' : String(message),
    buttons: Array.isArray(buttons) ? buttons : null
  };

  if (handler) handler(payload);
  else pending.push(payload);
}

