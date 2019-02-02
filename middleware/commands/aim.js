const aim = (data, middleware, linkedMiddleware) => {
 linkedMiddleware.setState('aim', (data, middleware, linkedMiddleware) => {
  const state = middleware.states.aim.data;
  if (!state.detected) {
   if (data.input.slice(0, 5) === 'Wait ' || [`I don't understand that.`, 'Invalid selection.', 'Those coordinates are already locked.', 'Those coordinates are occupied by this ship.', 'Those coordinates are too far away to establish a lock.'].includes(data.input)) return;
   const m = data.input.match(/^Locked onto coordinates\: ([0-9]{1,2}), ([0-9]{1,2}), ([0-9]{1,2})$/);
   if (!m) return false;
   middleware.persistentStates.aim = { x: m[1], y: m[2], z: m[3] };
   state.detected = true;
   return false;
  }
  else {
   const m = data.input.match(/^Target\: ([A-Z a-z]{3,30})( "([^"]{1,100})")?$/);
   if (!m) return;
   middleware.persistentStates.aim.type = m[1];
   middleware.persistentStates.aim.name = m[3];
  }
 }, {
  detected: false,
 });
};

module.exports = aim;
