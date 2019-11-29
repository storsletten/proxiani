const focus = (data, middleware, linkedMiddleware) => {
 if (data.input.trim().split(/\s+/).length === 1 && linkedMiddleware.persistentStates.focus && linkedMiddleware.persistentStates.focus.resendName) {
  data.forward[0] = `focus ${linkedMiddleware.persistentStates.focus.resendName}`;
  delete linkedMiddleware.persistentStates.focus.resendName;
 }
 linkedMiddleware.setState('focus', (data, middleware, linkedMiddleware) => {
  if (data.input.length === 0) return 0;
  else if (data.input === 'Select a ship:') {
   middleware.states.focus.timeout = 0;
   return 0;
  }
  else if (data.input.slice(0, 5) === 'Wait ' || [`I don't understand that.`, 'Invalid selection.', 'That object was not found.'].includes(data.input)) return 0b10;
  else if (['The focused ship is no longer in the sector.', 'Scanners report that that starship is no longer available.', 'There are no ships here.'].includes(data.input)) {
   delete middleware.persistentStates.focus;
   return;
  }
  const m = data.input.match(/^([^[(:]{2,50})\: ([0-9]{1,2}), ([0-9]{1,2}), ([0-9]{1,2})$/);
  if (!m) return 0;
  else if (['coordinates', 'current coordinates', 'current galactic coordinates', 'galactic coordinates', 'locked onto coordinates'].includes(m[1].toLowerCase())) return;
  middleware.persistentStates.focus = { name: m[1], x: Number(m[2]), y: Number(m[3]), z: Number(m[4]) };
 });
};

module.exports = focus;
