const focus = (data, middleware, linkedMiddleware) => {
 linkedMiddleware.setState('focus', (data, middleware, linkedMiddleware) => {
  if (data.input.length === 0) return false;
  else if (data.input === 'Select a ship:') {
   middleware.states.focus.timeout = 0;
   return false;
  }
  else if (data.input.slice(0, 5) === 'Wait ' || [`I don't understand that.`, 'Invalid selection.', 'Scanners report that that starship is no longer available.', 'There are no ships here.', 'That object was not found.'].includes(data.input)) return;
  const m = data.input.match(/^([^[(:]{2,50})\: ([0-9]{1,2}), ([0-9]{1,2}), ([0-9]{1,2})$/);
  if (!m) return false;
  else if (['coordinates', 'current coordinates', 'current galactic coordinates', 'galactic coordinates', 'locked onto coordinates'].includes(m[1].toLowerCase())) return;
  middleware.persistentStates.focus = { name: m[1], x: m[2], y: m[3], z: m[4] };
 });
};

module.exports = focus;
