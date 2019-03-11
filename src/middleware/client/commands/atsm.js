const utils = require('../../../utils');
const direction = require('../../helpers/direction');

const findBestObjects = (current, objects, goal, expandProbingDistance = 0, step = 0, gettingWorse = 0) => {
 goal--;
 step++;
 if (step > 1) objects = objects.map(object => { return { ...object, distance: Math.max(Math.abs(current.x - object.x), Math.abs(current.y - object.y)) }; }).sort((a, b) => a.distance - b.distance);
 else {
  current = { ...current, totalCount: 0, totalDistance: 0, ratio: 0 };
  objects = objects.map(object => { return { ...object }; });
 }
 const nearest = objects[0];
 if (objects.length === 1 || goal < 1 || gettingWorse > 2 || (gettingWorse > 0 && current.totalDistance > 15)) return { ...nearest, totalCount: nearest.count, totalDistance: nearest.distance, ratio: nearest.count / nearest.distance };
 const maxProbingDistance = step < 2 ? nearest.distance + expandProbingDistance : nearest.distance;
 const badObjectsIndex = objects.findIndex(object => object.distance > maxProbingDistance);
 const bestObject = (badObjectsIndex > 0 ? objects.slice(0, badObjectsIndex) : objects).map((object, index) => {
  let totalCount = current.totalCount + object.count;
  let totalDistance = current.totalDistance + object.distance;
  const ratio = totalCount / totalDistance;
  const next = findBestObjects({
   x: object.x,
   y: object.y,
   totalCount,
   totalDistance,
  }, [
   ...objects.slice(0, index),
   ...objects.slice(index + 1),
  ], goal, expandProbingDistance, step, ratio < current.ratio ? gettingWorse + 1 : 0);
  totalCount = next.totalCount + object.count;
  totalDistance = next.totalDistance + object.distance;
  return {
   ...object,
   totalCount,
   totalDistance,
   ratio: totalCount / totalDistance,
   next,
  };
 }).sort((a, b) => (b.ratio - a.ratio) || (a.distance - b.distance))[0];
 return bestObject;
};

const getAssessment = (object, max = 0) => {
 const assessmentLabels = ['Good', 'Acceptable', 'Bad'];
 const assess = ratio => {
  if (ratio >= 0.5) return 0;
  else if (ratio > 0.33) return 1;
  else return 2;
 };
 let totalCount = object.count;
 let totalDistance = object.distance;
 let ratio = totalCount / totalDistance;
 let assessment = assess(ratio);
 while (max !== 1 && object.next) {
  const next = object.next;
  const latestTotalCount = totalCount + next.count;
  const latestTotalDistance = totalDistance + next.distance;
  const latestRatio = latestTotalCount / latestTotalDistance;
  const latestAssessment = assess(latestRatio);
  if (latestAssessment > assessment) break;
  assessment = latestAssessment;
  totalCount = latestTotalCount;
  totalDistance = latestTotalDistance;
  ratio = latestRatio;
  object = next;
  max--;
 }
 return { totalCount, totalDistance, ratio, label: assessmentLabels[assessment], level: assessment };
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
 const args = data.input.match(/^\s*\w+\s+(\d+)/);
 linkedMiddleware.setState('atsm', {
  data: {
   goal: args ? Number(args[1]) : undefined,
   extraProbingDistance: 2,
   maxPreferredDistance: 4,
  },
 }, (data, middleware, linkedMiddleware) => {
  const state = middleware.states.atsm.data;
  if (reader(data, state)) return state.reading ? 1 : 0;
  if (!state.readingComplete) return 0b10;
  const sparePower = state.power - ((state.distance - 1) * 3);
  const powerForScooping = sparePower - 5;
  const objects = state.objects;
  objects.forEach(object => object.distance = Math.max(Math.abs(state.coordinates.x - object.x), Math.abs(state.coordinates.y - object.y)));
  objects.sort((a, b) => a.distance !== b.distance ? a.distance - b.distance : b.count - a.count);
  const scoopedObject = objects.length > 0 && objects[0].distance === 0 ? objects.shift() : undefined;
  if (scoopedObject) state.cargo += scoopedObject.count;
  state.cargoSpace = state.cargoCapacity - state.cargo;
  if (sparePower <= 0) data.forward.push(`Critical power level: Currently ${sparePower}% power for returning to the ship.`);
  if (objects.length === 0) data.forward.push(scoopedObject ? 'No more objects.' : 'No objects.');
  else if (state.cargoSpace <= 0) data.forward.push(`No more cargo space.`);
  else {
   let bestObject;
   if (state.goal !== undefined || (powerForScooping > objects[0].distance && state.cargo < state.cargoCapacity)) {
    if (state.goal === undefined) {
     const goal = Math.max(1, Math.min(10, state.cargoSpace, objects.length));
     state.extraProbingDistance = Math.min(state.extraProbingDistance, Math.max(0, state.maxPreferredDistance - objects[0].distance));
     bestObject = findBestObjects(state.coordinates, objects, goal, state.extraProbingDistance);
    }
    else bestObject = findBestObjects(state.coordinates, objects, state.goal, state.extraProbingDistance);
   }
   else bestObject = findBestObjects(state.coordinates, objects, 1);
   if (sparePower > 0 && bestObject.distance > powerForScooping) data.forward.push(`Low power!`);
   const assessment = getAssessment(bestObject);
   const nearestAssessment = getAssessment(bestObject, 3);
   if (nearestAssessment.label === 'Bad' && assessment.label !== 'Good') {
    const dir = (state.distance === 1 && powerForScooping > 6 && powerForScooping >= bestObject.distance) || ((powerForScooping / state.distance) > 6 && (state.distance === 1 || (state.cargoSpace / 3) >= state.distance)) ? 'down' : 'up';
    data.forward.push(`${assessment.label === 'Bad' ? 'Go' : 'Could go'} ${dir}.`);
   }
   data.forward.push(`${nearestAssessment.label}: ${direction.calculate2d(state.coordinates, bestObject).dir}.`);
   if (assessment.totalCount > 1) {
    data.forward.push(`${assessment.label !== nearestAssessment.label ? `${assessment.label}: ` : ''}${utils.formatAmount(assessment.totalCount, 'object')} in ${utils.formatAmount(assessment.totalDistance, 'unit')}.`);
   }
  }
  if (state.cargoSpace > 0) data.forward.push(`${powerForScooping}% power for scooping.`);
  else if (sparePower > 0) data.forward.push(`${sparePower}% excess power.`);
  data.forward.push(`Cargo ${state.cargo} of ${state.cargoCapacity}.`);
  data.forward.push(`Ship is ${state.distance} unit${state.distance !== 1 ? 's' : ''} distant.`);
  data.forward.push(`Total ${objects.length} object${objects.length !== 1 ? 's' : ''}.`);
 });
};

module.exports = atsm;
