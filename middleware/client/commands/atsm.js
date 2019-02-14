const utils = require('../../../src/utils');
const direction = require('../../helpers/direction');

const findBestObjects = (current, objects, goal, ratioBreaker = 0, expandProbingDistance = 0, step = 0) => {
 goal--;
 step++;
 if (step > 1) objects = objects.map(object => { return { ...object, distance: Math.max(Math.abs(current.x - object.x), Math.abs(current.y - object.y)) }; }).sort((a, b) => a.distance - b.distance);
 else {
  current = { ...current, totalCount: 0, totalDistance: 0 };
  objects = objects.map(object => { return { ...object }; });
 }
 const nearest = objects[0];
 if (objects.length === 1 || goal < 1) return { ...nearest, totalCount: nearest.count, totalDistance: nearest.distance, ratio: nearest.count / nearest.distance };
 const maxProbingDistance = nearest.distance + expandProbingDistance;
 const badObjectsIndex = objects.findIndex(object => object.distance > maxProbingDistance);
 return (badObjectsIndex > 0 ? objects.slice(0, badObjectsIndex) : objects).map((object, index) => {
  const totalCount = current.totalCount + object.count;
  const totalDistance = current.totalDistance + object.distance;
  const ratio = totalCount / totalDistance;
  const next = findBestObjects({ x: object.x, y: object.y, totalCount, totalDistance }, [ ...objects.slice(0, index), ...objects.slice(index + 1) ], goal, ratioBreaker, expandProbingDistance, step);
  if (next.ratio < ratioBreaker && ratio > next.ratio) return { ...object, totalCount: object.count, totalDistance: object.distance, ratio: object.count / object.distance };
  else {
   const totalCount = next.totalCount + object.count;
   const totalDistance = next.totalDistance + object.distance;
   return { ...object, totalCount, totalDistance, ratio: totalCount / totalDistance, next };
  }
 }).sort((a, b) => (b.ratio - a.ratio) || (a.distance - b.distance))[0];
};

const ratioAssessment = ratio => {
 if (ratio >= 0.5) return 'Good';
 else if (ratio > 0.33) return 'Acceptable';
 else return 'Bad';
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
  objects.sort((a, b) => a.distance !== b.distance ? a.distance - b.distance : b.count - a.count);
  const scoopedObject = objects.length > 0 && objects[0].distance === 0 ? objects.shift() : undefined;
  if (scoopedObject) state.cargo += scoopedObject.count;
  state.cargoSpace = state.cargoCapacity - state.cargo;
  if (objects.length === 0) data.forward.push(scoopedObject ? 'No more objects.' : 'No objects.');
  else if (state.cargoSpace <= 0) data.forward.push(`No more cargo space.`);
  else {
   let bestObject;
   if (state.goal !== undefined || (powerForScooping > objects[0].distance && state.cargo < state.cargoCapacity)) {
    if (state.goal === undefined) {
     const goal = Math.max(1, Math.min(6, state.cargoSpace, objects.length));
     state.extraProbingDistance = Math.min(state.extraProbingDistance, Math.max(0, state.maxPreferredDistance - objects[0].distance));
     bestObject = findBestObjects(state.coordinates, objects, goal, state.ratioBreaker, state.extraProbingDistance);
    }
    else bestObject = findBestObjects(state.coordinates, objects, state.goal, 0, state.extraProbingDistance);
   }
   else bestObject = findBestObjects(state.coordinates, objects, 1);
   if (bestObject.distance > powerForScooping) data.forward.push(`Low power!`);
   data.forward.push(`${direction.calculate2d(state.coordinates, bestObject).dir}.`);
   if (bestObject.ratio) {
    const count = bestObject.totalCount || bestObject.count;
    const distance = bestObject.totalDistance || bestObject.distance;
    if (count > 1) data.forward.push(`${bestObject.distance < 3 ? 'Good' : ratioAssessment(bestObject.ratio)}: ${utils.formatAmount(count, 'object')} in ${utils.formatAmount(distance, 'unit')}.`);
    else data.forward.push(`${ratioAssessment(bestObject.ratio)}.`);
   }
  }
  data.forward.push(`${powerForScooping}% power for ${state.cargoSpace > 0 ? 'scooping' : 'returning to the ship'}.`);
  data.forward.push(`Cargo ${state.cargo} of ${state.cargoCapacity}.`);
  data.forward.push(`Ship is ${state.distance} unit${state.distance !== 1 ? 's' : ''} distant.`);
  data.forward.push(`Total ${objects.length} object${objects.length !== 1 ? 's' : ''}.`);
 }, {
  goal: data.command.length > 1 && isFinite(data.command[1]) ? Math.max(0, Math.floor(Number(data.command[1]))) : undefined,
  ratioBreaker: 0.35,
  extraProbingDistance: 2,
  maxPreferredDistance: 4,
 });
};

module.exports = atsm;
