const starmap = require('../../helpers/starmap');

const sm = (data, middleware, linkedMiddleware) => {
 if (linkedMiddleware.states.sm && !linkedMiddleware.states.sm.readingStarmap) delete linkedMiddleware.states.sm;
 data.command = data.input.trim().toLowerCase().split(/\s+/);
 if (data.command.length > 1 && !(['basic', 'legend', 'map', 'co', 'coords'].includes(data.command[1]))) {
  const objectType = starmap.findType(data.command.slice(1).join(' '));
  if (!objectType) {
   data.forward.pop();
   data.respond.push(`Invalid argument.`);
   return;
  }
  const gm = data.command[0][0] === '@';
  if (gm) {
   data.command[0] = data.command[0].slice(1);
   data.forward[0] = `@map ${data.command.splice(1, data.command.length - 1).join(' ')}`.trimEnd();
  }
  else data.forward[0] = (false && linkedMiddleware.persistentStates.visualStarmapDetected) ? 'sm co' : 'sm';
  linkedMiddleware.setState('sm', {
   data: {
    objectType,
   },
  }, (data, middleware, linkedMiddleware) => {
   const state = middleware.states.sm.data;
   if (starmap.reader(data, state)) return state.readingStarmap ? 1 : 0;
   if (state.visualStarmapDetected) middleware.persistentStates.visualStarmapDetected = true;
   if (!state.readingComplete) return 0b10;
   const oob = starmap.oob(state, middleware.persistentStates);
   const maxNumberOfObjects = 10;
   const objectType = state.objectType.toLowerCase();
   if (!(objectType in state)) {
    if (linkedMiddleware.device.soundpack.name) data.forward.push(`#$#px starmap ${oob.join(' | ')}`);
    data.forward.push(`No ${objectType}.`);
    return;
   }
   let objects = starmap.parseObjects(objectType, state[objectType], state.currentCoordinates);
   objects.sort((a, b) => a.distance - b.distance);
   data.forward.push(`${state.objectType}:`);
   if (linkedMiddleware.device.soundpack.name) data.forward.push(`#$#px starmap nearest ${objects[0].distance} | ${oob.join(' | ')}`);
   let objectsHere = 0;
   while (objects.length > 0 && objects[0].distance === 0) {
    objects.shift();
    objectsHere++;
   }
   if (objects.length > 0) {
    if (objects.length > maxNumberOfObjects) objects = objects.slice(0, maxNumberOfObjects);
    data.forward.push(...objects.map((object, index) => `${object.dir}, at ${object.x} ${object.y} ${object.z}.`));
   }
   if (objectsHere > 0) {
    const { x, y, z } = state.currentCoordinates;
    data.forward.push(`${objects.length > 0 ? 'Also, ' : ''}${objectsHere} ${objectsHere === 1 ? objectType.slice(0, -1) : objectType} at your coordinates: ${x} ${y} ${z}.`);
   }
  });
 }
};

module.exports = sm;
