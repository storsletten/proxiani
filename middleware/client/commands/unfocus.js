const unfocus = (data, middleware, linkedMiddleware) => {
 linkedMiddleware.setState('focus', (data, middleware, linkedMiddleware) => {
  if (data.input.slice(0, 5) === 'Wait ' || [`I don't understand that.`, 'Invalid selection.'].includes(data.input)) return 0b10;
  else if (['Nothing is focused.', 'The current target is no longer focused.'].includes(data.input)) delete middleware.persistentStates.focus;
  else return 0;
 });
};

module.exports = unfocus;
