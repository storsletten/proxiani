const direction = require('../../helpers/direction');

const findBestObject = (current, objects, depth, step = 0) => {
 if (step > 0) {
  objects.forEach(object => object.distance = Math.max(Math.abs(current.x - object.x), Math.abs(current.y - object.y)));
  objects.sort((a, b) => a.distance - b.distance);
  const scoopedObjects = [];
  while (objects.length > 0 && objects[0].distance === 0) scoopedObjects.push({...objects.shift()});
  if (objects.length === 0 || depth < 0) return { ...scoopedObjects[0], ratio: scoopedObjects.length };
 }
 depth--;
 step++;
 let objectsToProbe = [];
 const maxProbingDistance = objects[0].distance + 2;
 for (let i=0; i<objects.length; i++) {
  if (objects[i].distance <= maxProbingDistance) objectsToProbe.push({...objects[i]});
  else break;
 }
 return objectsToProbe.map(object => {
  object.next = findBestObject(object, [...objects], depth, step);
  object.ratio = object.next.ratio / object.distance;
  return object;
 }).sort((a, b) => a.ratio - b.ratio).pop();
};

const parseObjects = (text, currentCoordinates) => {
 try {
  return text.split(')').slice(0, -1).map((text, index) => {
   const [x, y] = text.split('(')[1].split(', ');
   return { index, x: Number(x), y: Number(y) };
  });
 }
 catch (error) {
  return [];
 }
};
const reader = (data, state) => {
 if (!state.reading) {
  if (data.input.length === 0) return true;
  else if ([`I don't understand that.`, 'Invalid selection.', 'You can only scoop from a planet.'].includes(data.input) || data.input.slice(0, 5) === 'Wait ') return false;
  const m = data.input.match(/^Atmosphere of (.+)$/);
  if (!m) return true;
  state.name = m[1];
  state.reading = true;
  state.bufferedInput = [data.forward.pop()];
  return true;
 }
 state.bufferedInput.push(data.forward.pop());
 if (data.input.length === 0) return true;
 if (state.power === undefined) {
  const m = data.input.match(/^Power Remaining\: ([0-9]{1,3})\%$/);
  if (!m) return false;
  state.power = Number(m[1]);
  return true;
 }
 if (state.cargo === undefined) {
  const m = data.input.match(/^Cargo Capacity\: ([0-9]{1,2})\/([0-9]{1,2})$/);
  if (!m) return false;
  state.cargo = Number(m[1]);
  state.cargoCapacity = Number(m[2]);
  return true;
 }
 if (state.distance === undefined) {
  const m = data.input.match(/^Distance to Ship\: ([0-9]{1,2}) units?$/);
  if (!m) return false;
  state.distance = Number(m[1]);
  return true;
 }
 if (state.coordinates === undefined) {
  const m = data.input.match(/^Current Coordinates\: ([0-9]{1,2}), ([0-9]{1,2})$/);
  if (!m) return false;
  state.coordinates = { x: Number(m[1]), y: Number(m[2]) };
  return true;
 }
 if (data.input === 'Objects:') {
  data.forward.push(`Atsm will only work if you switch to a grouped coordinate view, by using the LIST command.`);
  return false;
 }
 if (data.input === 'Objects: nothing') {
  state.objects = [];
  state.readingComplete = true;
  return;
 }
 const m = data.input.match(/^Objects: ([0-9 (,)and]+)$/);
 if (!m) return false;
 state.objects = parseObjects(m[1], state.coordinates);
 state.readingComplete = true;
 return;
};

const atsm = (data, middleware, linkedMiddleware) => {
 if (linkedMiddleware.states.atsm && linkedMiddleware.states.atsm.reading) return;
 data.forward[0] = 'sm';
 linkedMiddleware.setState('atsm', (data, middleware, linkedMiddleware) => {
  const state = middleware.states.atsm.data;
  if (reader(data, state)) return state.reading ? 1 : 0;
  if (!state.readingComplete) return 0b10;
  const powerForScooping = state.power - ((state.distance * 3) + 2);
  const objects = state.objects;
  objects.forEach(object => object.distance = Math.max(Math.abs(state.coordinates.x - object.x), Math.abs(state.coordinates.y - object.y)));
  objects.sort((a, b) => a.distance - b.distance);
  const scoopedObjects = [];
  while (objects.length > 0 && objects[0].distance === 0) scoopedObjects.push(objects.shift());
  state.cargo += scoopedObjects.length;
  if (objects.length === 0) data.forward.push(scoopedObjects.length > 0 ? 'No more objects.' : 'No objects.');
  else {
   const depth = Math.max(0, state.requestedDepth !== undefined ? state.requestedDepth : Math.min(3, state.cargoCapacity - state.cargo));
   const bestObject = findBestObject(state.coordinates, objects, depth);
   data.forward.push(`${direction.calculate2d(state.coordinates, bestObject).dir}.`);
   const distances = [];
   if (state.requestedDepth !== undefined || state.cargo < state.cargoCapacity) {
    let next = bestObject.next;
    while (next && next.distance) {
     distances.push(next.distance);
     next = next.next;
    }
    if (distances.length > 0) {
     data.forward.push(`Next ${distances.length === 1 ? 'piece' : `${distances.length} pieces`}: ${distances.length > 2 ? `${distances.slice(0, -1).join(', ')}, and ${distances[distances.length - 1]}` : distances.join(' and ')}.`);
    }
   }
  }
  data.forward.push(`${powerForScooping}% power for scooping.`);
  data.forward.push(`Cargo ${state.cargo} of ${state.cargoCapacity}.`);
  data.forward.push(`Ship is ${state.distance} unit${state.distance !== 1 ? 's' : ''} distant.`);
  data.forward.push(`Total ${objects.length} object${objects.length !== 1 ? 's' : ''}.`);
 }, {
  requestedDepth: data.command.length > 1 && isFinite(data.command[1]) ? Math.max(0, Math.floor(Number(data.command[1]))) : undefined,
 });
};

module.exports = atsm;
