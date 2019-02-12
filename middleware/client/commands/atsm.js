const direction = require('../../helpers/direction');

const findBestObjects = (current, objects, goal, expandProbingDistance, step = 0) => {
 if (step > 0) {
  objects = objects.map(object => {
   return { ...object, distance: Math.max(Math.abs(current.x - object.x), Math.abs(current.y - object.y)) };
  }).sort((a, b) => a.distance - b.distance);
  const scoopedObject = objects.shift();
  if (objects.length === 0 || goal <= 0) return scoopedObject;
 }
 else if (goal <= 1) return objects[0];
 goal--;
 step++;
 let objectsToProbe = [];
 const maxProbingDistance = objects[0].distance + expandProbingDistance;
 for (let i=0; i<objects.length; i++) {
  if (objects[i].distance <= maxProbingDistance) objectsToProbe.push({...objects[i]});
  else break;
 }
 return objectsToProbe.map(object => {
  object.next = findBestObjects(object, objects, goal, expandProbingDistance, step);
  object.totalCount = object.count + (object.next.totalCount || object.next.count);
  object.totalDistance = object.distance + (object.next.totalDistance || 0);
  object.ratio = object.totalCount / object.totalDistance;
  return object;
 }).sort((a, b) => a.ratio !== b.ratio ? b.ratio - a.ratio : a.distance - b.distance)[0];
};

const getNextDistances = object => {
 const distances = [];
 let next = object.next;
 while (next && next.distance) {
  distances.push(next.distance);
  next = next.next;
 }
 return distances;
};

const parseObjects = (text, currentCoordinates) => {
 try {
  const spots = {};
  text.split(')').slice(0, -1).forEach((text, index) => {
   const [x, y] = text.split('(')[1].split(', ');
   const spot = `${x}-${y}`;
   if (spot in spots) spots[spot].count++;
   else spots[spot] = { x: Number(x), y: Number(y), count: 1 };
  });
  return Object.values(spots);
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
  const scoopedObject = objects.length > 0 && objects[0].distance === 0 ? objects.shift() : undefined;
  if (scoopedObject) state.cargo += scoopedObject.count;
  state.cargoSpace = state.cargoCapacity - state.cargo;
  if (objects.length === 0) data.forward.push(scoopedObject ? 'No more objects.' : 'No objects.');
  else {
   let bestObject;
   if (state.goal !== undefined || (powerForScooping > objects[0].distance && state.cargo < state.cargoCapacity)) {
    if (state.goal === undefined) {
     let goal = Math.max(1, Math.min(4, state.cargoSpace));
     state.extraProbingDistance = Math.min(state.extraProbingDistance, Math.max(0, state.maxPreferredDistance - objects[0].distance));
     bestObject = findBestObjects(state.coordinates, objects, goal, state.extraProbingDistance);
     if (bestObject.distance !== objects[0].distance && objects[0].distance <= state.maxPreferredDistance && state.cargoSpace > goal && goal > 1) {
      const bestObjects = [bestObject];
      while (bestObjects.length < 3 && goal > 1) {
       goal--;
       bestObjects.push(findBestObjects(state.coordinates, objects, goal, state.extraProbingDistance));
      }
      bestObjects.sort((a, b) => a.ratio !== b.ratio ? b.ratio - a.ratio : a.distance - b.distance);
      bestObject = bestObjects[0];
     }
    }
    else bestObject = findBestObjects(state.coordinates, objects, state.goal, state.extraProbingDistance);
   }
   else bestObject = objects[0];
   data.forward.push(`${direction.calculate2d(state.coordinates, bestObject).dir}.`);
   const distances = getNextDistances(bestObject);
   if (distances.length > 0) {
    data.forward.push(`Next piece${distances.length !== 1 ? 's' : ''}: ${distances.length > 2 ? `${distances.slice(0, -1).join(', ')}, and ${distances[distances.length - 1]}` : distances.join(' and ')}.`);
   }
  }
  data.forward.push(`${powerForScooping}% power for scooping.`);
  data.forward.push(`Cargo ${state.cargo} of ${state.cargoCapacity}.`);
  data.forward.push(`Ship is ${state.distance} unit${state.distance !== 1 ? 's' : ''} distant.`);
  data.forward.push(`Total ${objects.length} object${objects.length !== 1 ? 's' : ''}.`);
 }, {
  goal: data.command.length > 1 && isFinite(data.command[1]) ? Math.max(0, Math.floor(Number(data.command[1]))) : undefined,
  extraProbingDistance: 2,
  maxPreferredDistance: 4,
 });
};

module.exports = atsm;
