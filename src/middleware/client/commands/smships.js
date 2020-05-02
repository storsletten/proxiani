const direction = require('../../helpers/direction');
const starmap = require('../../helpers/starmap');

const aliases = {
 sma: 'assess',
 smc: 'coords',
 smd: 'dir',
 smf: 'full',
 sms: 'name',
 smt: 'count',
};
const modes = {
 assess: (label, count) => `${count} ${label}`,
 coords: (ship, index, filter) => filter ? `${ship.x} ${ship.y} ${ship.z}, ${ship.match}` : `${ship.x} ${ship.y} ${ship.z}, ship ${ship.index + 1}, ${ship.name}`,
 count: (found, total, filter) => {
  if (filter) {
   if (total === 1) return `The single ship here ${found ? 'matches' : 'does not match'} ${filter}.`;
   else if (found === total) return `${found > 0 ? 'All' : 'None'} of the ${total} ships match ${filter}.`;
   else return `${found} of ${total} ships match ${filter}.`;
  }
  else return `${total} ${total === 1 ? 'ship' : 'ships'}.`;
 },
 dir: (ship, index, filter) => filter ? `${ship.dir || 'Here'}, ${ship.match}` : `${ship.dir || 'Here'}, ship ${ship.index + 1}`,
 full: (ship, index, filter) => `Ship ${ship.index + 1}, distance ${ship.distance}, coords ${ship.x} ${ship.y} ${ship.z}, dir ${ship.dir || 'here'}, alliance ${ship.alliance || 'unknown'}, ${filter ? `match ${ship.match}, ` : ''}name ${ship.name}`,
 name: (ship, index, filter) => filter ? `Ship ${ship.index + 1}, ${ship.dir || 'here'}, ${ship.match}` : `Ship ${ship.index + 1}, ${ship.dir || 'here'}, ${ship.name}`,
};

const additionalThreats = ['interdictors', 'proximity weapons', 'combat drones', 'blockades'];

const smships = (data, middleware, linkedMiddleware) => {
 if (linkedMiddleware.states.sm && linkedMiddleware.states.sm.readingStarmap) {
  data.forward.pop();
  return;
 }
 const command = data.input.trim().toLowerCase().split(/\s+/);
 const gm = command[0][0] === '@';
 if (gm) {
  command[0] = command[0].slice(1);
  data.forward[0] = `@map ${command.splice(1, command.length - 1).join(' ')}`.trimEnd();
 }
 else data.forward[0] = (false && linkedMiddleware.persistentStates.visualStarmapDetected) ? 'sm co' : 'sm';
 linkedMiddleware.setState('sm', { data: { command } }, (data, middleware, linkedMiddleware) => {
  const state = middleware.states.sm.data;
  if (starmap.reader(data, state)) return state.readingStarmap ? 1 : 0;
  if (state.visualStarmapDetected) middleware.persistentStates.visualStarmapDetected = true;
  if (!state.readingComplete) return 0b10;
  if (state.command[0] !== 'smships') state.command.splice(1, 0, aliases[state.command[0]] || 'name');
  if (state.command.length === 1 || isFinite(state.command[1])) state.command.splice(1, 0, 'name');
  const mode = state.command[1] in modes ? state.command[1] : 'name';
  if (!state.starships) {
   const oob = starmap.oob(state, middleware.persistentStates);
   if (linkedMiddleware.device.soundpack.name) data.forward.push(`#$#px starmap ${oob.join(' | ')}`);
   if (mode === 'assess') additionalThreats.forEach(objectType => state[objectType] && data.forward.push(`${state[objectType].split('(').length - 1} ${objectType}`));
   data.forward.push(`No ships.`);
   return;
  }
  let ships = starmap.parseObjects('starships', state.starships, state.currentCoordinates);
  const oob = starmap.oob(state, middleware.persistentStates, ships);
  if (mode === 'count') {
   const filter = state.command.length > 2 ? state.command.slice(2).join(' ') : undefined;
   if (linkedMiddleware.device.soundpack.name) data.forward.push(`#$#px starmap ${oob.join(' | ')}`);
   data.forward.push(modes[mode](filter ? ships.filter(ship => ship.name.toLowerCase().indexOf(filter) !== -1).length : ships.length, ships.length, filter));
  }
  else if (mode === 'assess') {
   const maxDistance = state.command.length > 2 ? Math.min(19, Math.max(1, Number(state.command[2]))) : undefined;
   const shipsTotal = ships.length;
   let filteredShips = 0;
   const prioShips = {};
   if (maxDistance) {
    ships = ships.filter(ship => ship.distance <= maxDistance);
    if (ships.length === 0) {
     if (linkedMiddleware.device.soundpack.name) data.forward.push(`#$#px starmap ${oob.join(' | ')}`);
     data.forward.push(`No ships ${maxDistance === 1 ? 'one unit away' : `${maxDistance} units or less away`}.`);
     return;
    }
    else filteredShips = shipsTotal - ships.length;
   }
   ships.forEach(ship => {
    const { label, priority } = starmap.calculateShipPriority(ship, state.header);
    if (label in prioShips) prioShips[label].count++;
    else prioShips[label] = { label, priority, count: 1 };
   });
   const list = [];
   for (let label in prioShips) list.push(prioShips[label]);
   list.sort((a, b) => a.priority - b.priority);
   if (linkedMiddleware.device.soundpack.name) data.forward.push(`#$#px starmap ${oob.join(' | ')}`);
   if (maxDistance && filteredShips) {
    data.forward.push(`${ships.length} of ${shipsTotal} ${shipsTotal === 1 ? 'ship' : 'ships'}:`);
   }
   additionalThreats.forEach(objectType => state[objectType] && data.forward.push(`${state[objectType].split('(').length - 1} ${objectType}`));
   list.forEach(item => data.forward.push(modes[mode](item.label, item.count)));
  }
  else {
   if (state.command.length === 2 || isNaN(state.command[2])) state.command.splice(2, 0, mode === 'name' ? '5' : '1');
   const maxNumberOfShips = Math.max(1, Number(state.command[2]));
   const filter = state.command.length > 3 ? state.command.slice(3).join(' ') : undefined;
   if (filter) {
    ships = ships.filter(ship => ship.name.toLowerCase().indexOf(filter) !== -1);
    if (ships.length === 0) {
     if (linkedMiddleware.device.soundpack.name) data.forward.push('#$#px starmap');
     data.forward.push(`No ships matching ${filter}.`);
     return;
    }
    ships.forEach((ship, index) => ship.match = `${index + 1}.${filter}`);
   }
   ships.forEach(ship => ship.priority = starmap.calculateShipPriority(ship).priority, state.header);
   let focusedShip;
   if (middleware.persistentStates.focus) {
    focusedShip = ships.find(ship => ship.name === middleware.persistentStates.focus.name);
    if (focusedShip) focusedShip.priority = middleware.persistentStates.focus.implicitFocus ? -1 : -3;
    else delete middleware.persistentStates.focus;
   }
   const aimedShip = middleware.persistentStates.aim && ships.find(ship => direction.here3d(ship, middleware.persistentStates.aim));
   const scannedShip = middleware.persistentStates.scan && middleware.persistentStates.scan.objectType === 'starship' && ships.find(ship => ship.name === middleware.persistentStates.scan.name);
   if (aimedShip) aimedShip.priority = -2;
   if (scannedShip) scannedShip.priority = -4;
   ships.sort((a, b) => a.distance !== b.distance ? a.distance - b.distance : a.priority - b.priority);
   if (mode === 'dir') {
    if (!focusedShip && ships[0].distance <= 1) {
     focusedShip = ships[0];
     middleware.persistentStates.focus = { implicitFocus: true, name: focusedShip.name, x: focusedShip.x, y: focusedShip.y, z: focusedShip.z };
    }
    else if (focusedShip && focusedShip !== ships[0]) {
     for (let i=1; i<ships.length; i++) {
      if (focusedShip === ships[i]) {
       ships.splice(i, 1);
       ships.unshift(focusedShip);
       break;
      }
     }
    }
   }
   else {
    let indexPastZeroDistance = 0;
    if (ships[ships.length - 1].distance !== 0) {
     while (ships[indexPastZeroDistance].distance === 0) indexPastZeroDistance++;
    }
    if (indexPastZeroDistance > 0 && ships[indexPastZeroDistance].distance === 1) {
     const cuddledShips = ships.splice(0, indexPastZeroDistance);
     let indexForInsertingCuddledShips = 1;
     if (ships[ships.length - 1].distance > 1) {
      while (ships[indexForInsertingCuddledShips].distance === 1) indexForInsertingCuddledShips++;
     }
     else indexForInsertingCuddledShips = ships.length - 1;
     ships.splice(indexForInsertingCuddledShips, 0, ...cuddledShips);
    }
   }
   if (linkedMiddleware.device.soundpack.name) data.forward.push(`#$#px starmap nearest ${ships[0].distance} | ${oob.join(' | ')}`);
   if (ships.length > maxNumberOfShips) ships = ships.slice(0, maxNumberOfShips);
   data.forward.push(...ships.map((ship, index) => modes[mode](ship, index, filter)));
  }
 });
};

module.exports = smships;
