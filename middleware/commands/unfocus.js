const unfocus = (data, middleware, linkedMiddleware) => {
 linkedMiddleware.setState('focus', (data, middleware, linkedMiddleware) => {
  if (data.input.length === 0) return false;
  else if (data.input.slice(0, 5) === 'Wait ' || [`I don't understand that.`, 'Invalid selection.'].includes(data.input)) return;
  else if (['Nothing is focused.', 'The current target is no longer focused.'].includes(data.input)) delete middleware.persistentStates.focus;
 });
};

module.exports = unfocus;
