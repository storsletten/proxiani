const direction = require('../helpers/direction');
const starmap = require('../helpers/starmap');

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

const smships = (data, middleware, linkedMiddleware) => {
 if (linkedMiddleware.states.sm && linkedMiddleware.states.sm.readingStarmap) {
  data.forward.pop();
  return;
 }
 data.forward[0] = 'sm';
 linkedMiddleware.setState('sm', (data, middleware, linkedMiddleware) => {
  const state = middleware.states.sm.data;
  if (starmap.reader(data, state)) return false;
  if (!state.readingComplete) return;
  const oob = starmap.oob(state);
  if (!state.starships) {
   data.forward.push(`#$#proxiani starmap ${oob.join(' | ')}`);
   data.forward.push(`No ships.`);
   return;
  }
  let ships = starmap.parseObjects('starships', state.starships, state.currentCoordinates);
  if (state.command.length === 1 || isFinite(state.command[1])) state.command.splice(1, 0, 'name');
  const mode = state.command[1] in modes ? state.command[1] : 'name';
  if (mode === 'count') {
   const filter = state.command.length > 2 ? state.command.slice(2).join(' ') : undefined;
   data.forward.push(`#$#proxiani starmap ${oob.join(' | ')}`);
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
     data.forward.push(`#$#proxiani starmap ${oob.join(' | ')}`);
     data.forward.push(`No ships ${maxDistance === 1 ? 'one unit away' : `${maxDistance} units or less away`}.`);
     return;
    }
    else filteredShips = shipsTotal - ships.length;
   }
   ships.forEach(ship => {
    const { label, priority } = starmap.calculateShipPriority(ship);
    if (label in prioShips) prioShips[label].count++;
    else prioShips[label] = { label, priority, count: 1 };
   });
   const list = [];
   for (let label in prioShips) list.push(prioShips[label]);
   list.sort((a, b) => a.priority - b.priority);
   data.forward.push(`#$#proxiani starmap ${oob.join(' | ')}`);
   if (maxDistance && filteredShips) {
    data.forward.push(`${ships.length} of ${shipsTotal} ${shipsTotal === 1 ? 'ship' : 'ships'}:`);
   }
   list.forEach(item => data.forward.push(modes[mode](item.label, item.count)));
  }
  else {
   if (state.command.length === 2 || isNaN(state.command[2])) state.command.splice(2, 0, mode === 'name' ? '5' : '1');
   const maxNumberOfShips = Math.max(1, Number(state.command[2]));
   const filter = state.command.length > 3 ? state.command.slice(3).join(' ') : undefined;
   if (filter) {
    ships = ships.filter(ship => ship.name.toLowerCase().indexOf(filter) !== -1);
    if (ships.length === 0) {
     data.forward.push('#$#proxiani starmap');
     data.forward.push(`No ships matching ${filter}.`);
     return;
    }
    ships.forEach((ship, index) => ship.match = `${index + 1}.${filter}`);
   }
   ships.forEach(ship => ship.priority = starmap.calculateShipPriority(ship).priority);
   let focusedShip;
   if (middleware.persistentStates.focus) {
    focusedShip = ships.find(ship => ship.name === middleware.persistentStates.focus.name);
    focusedShip.priority = middleware.persistentStates.focus.implicitFocus ? -1 : -3;
   }
   const aimedShip = middleware.persistentStates.aim && ships.find(ship => direction.here3d(ship, middleware.persistentStates.aim));
   const scannedShip = middleware.persistentStates.scan && middleware.persistentStates.scan.objectType === 'starship' && ships.find(ship => ship.name === middleware.persistentStates.scan.name);
   if (aimedShip) aimedShip.priority = -2;
   if (scannedShip) scannedShip.priority = -4;
   data.forward.push(JSON.stringify({
    aimedShip,
    focusedShip,
   }));
   ships.sort((a, b) => a.distance !== b.distance ? a.distance - b.distance : a.priority - b.priority);
   data.forward.push(`#$#proxiani starmap nearest ${ships[0].distance} | ${oob.join(' | ')}`);
   if (!focusedShip) {
    for (let i=0; i<ships.length; i++) {
     if (ships[i].distance === 1) {
      focusedShip = ships[i];
      break;
     }
     else if (ships[i].distance > 1) {
      if (ships[0].distance === 0) focusedShip = ships[0];
      break;
     }
    }
    if (focusedShip) middleware.persistentStates.focus = { implicitFocus: true, name: focusedShip.name, x: focusedShip.x, y: focusedShip.y, z: focusedShip.z };
   }
   if (mode === 'dir' && focusedShip && focusedShip !== ships[0]) {
    for (let i=1; i<ships.length; i++) {
     if (focusedShip === ships[i]) {
      ships = ships.splice(i, 1);
      ships.unshift(focusedShip);
      break;
     }
    }
   }
   let shipsHere = [];
   while (ships.length > 0 && ships[0].distance === 0) shipsHere.push(ships.shift());
   if (mode === 'dir' && focusedShip && focusedShip.distance === 0) {
    for (let i=0; i<shipsHere.length; i++) {
     if (focusedShip === shipsHere[i]) {
      ships.unshift(focusedShip);
      shipsHere = shipsHere.splice(i, 1);
      break;
     }
    }
   }
   if (ships.length > 0 && shipsHere.length > 0 && ships[0].distance > 1 && (mode !== 'dir' || ships[0] !== focusedShip)) ships.unshift(shipsHere.shift());
   if (ships.length > 0) {
    const maxShips = Math.max(1, maxNumberOfShips - shipsHere.length);
    if (ships.length > maxShips) ships = ships.slice(0, maxShips);
    data.forward.push(...ships.map((ship, index) => modes[mode](ship, index, filter)));
   }
   if (shipsHere.length > 0) {
    data.forward.push(`Cuddling${shipsHere.length > 1 ? `${shipsHere.length} ships` : ''}:`);
    if (mode === 'full') {
     const maxShips = Math.max(1, maxNumberOfShips - ships.length);
     if (shipsHere.length > maxShips) shipsHere = shipsHere.slice(0, maxShips);
     data.forward.push(...shipsHere.map((ship, index) => modes[mode](ship, index, filter)));
    }
    else {
     if (mode === 'coords') {
      const { x, y, z } = state.currentCoordinates;
      data.forward.push(`${x} ${y} ${z}.`);
     }
     if (filter) data.forward.push(...shipsHere.map((ship, index) => `Ship ${ship.index + 1}, ${ship.match}, ${ship.name}`));
     else data.forward.push(...shipsHere.map((ship, index) => `Ship ${ship.index + 1}, ${ship.name}`));
    }
   }
  }
 }, {
  command: data.command,
 });
};

module.exports = smships;
