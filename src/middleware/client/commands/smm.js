// Starmap metadata
const starmap = require('../../helpers/starmap');

const smmeta = (data, middleware, linkedMiddleware) => {
 if (linkedMiddleware.states.sm && !linkedMiddleware.states.sm.readingStarmap) delete linkedMiddleware.states.sm;
 data.command = data.input.trim().toLowerCase().split(/\s+/);
 const gm = data.command[0][0] === '@';
 if (gm) {
  data.command[0] = data.command[0].slice(1);
  data.forward[0] = `@map ${data.command.splice(1, data.command.length - 1).join(' ')}`.trimEnd();
 }
 else data.forward[0] = (false && linkedMiddleware.persistentStates.visualStarmapDetected) ? 'sm co' : 'sm';
 linkedMiddleware.setState('sm', {
  data: {},
 }, (data, middleware, linkedMiddleware) => {
  const state = middleware.states.sm.data;
  if (starmap.reader(data, state)) return state.readingStarmap ? 1 : 0;
  if (state.visualStarmapDetected) middleware.persistentStates.visualStarmapDetected = true;
  if (!state.readingComplete) return 0b10;
  const meta = [];
  if (state.nebula) meta.push(`Nebula`);
  if (state.unknown) meta.push(`Anomaly`);
  if (state.sensorInterference) meta.push(`Sensor Interference`);
  if (state.header.isUnexplored) meta.push(`Unexplored`);
  else if (state.header.isExplored) meta.push(`Explored`);
  if (state.header.isOutsideCommsRange) meta.push(`Out of Comms`);
  else if (state.header.isOutsideLocalSpace) meta.push(`Out of Local Space`);
  const oob = starmap.oob(state, middleware.persistentStates);
  if (linkedMiddleware.device.soundpack.name) data.forward.push(`#$#px starmap ${oob.join(' | ')}`);
  if (meta.length) data.forward.push(meta.join(', '));
  else data.forward.push(`Nothing special.`);
 });
};

module.exports = smmeta;
