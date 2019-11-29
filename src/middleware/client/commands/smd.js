const dialog = require('../../helpers/dialog.js');
const direction = require('../../helpers/direction');
const starmap = require('../../helpers/starmap');

const fd = (data, middleware, linkedMiddleware) => {
 if (linkedMiddleware.states.sm && linkedMiddleware.states.sm.readingStarmap) {
  data.forward.pop();
  return;
 }
 const command = data.input.trim().toLowerCase().split(/\s+/);
 const inputName = command.length > 1 && data.input.trim().split(' ').slice(1).join(' ');
 data.forward[0] = 'sm co';
 linkedMiddleware.setState('sm', { data: { command, inputName } }, (data, middleware, linkedMiddleware) => {
  const state = middleware.states.sm.data;
  if (starmap.reader(data, state)) return state.readingStarmap ? 1 : 0;
  if (!state.readingComplete) return 0b10;
  if (!state.starships) {
   data.forward.push(`There are no ships here.`);
   return;
  }
  const ships = starmap.parseObjects('starships', state.starships, state.currentCoordinates).filter(ship => ship.name);
  if (ships.length === 0) {
   data.forward.push(`You'll have better results scanning in space.`);
   return;
  }
  if (!state.inputName) {
   if (!middleware.persistentStates.focus || !ships.find(ship => ship.name === middleware.persistentStates.focus.name)) {
    dialog.menu({
     middleware: linkedMiddleware,
     title: `Select a ship:`,
     items: ships.map(ship => ship.name),
    }).then(response => {
     state.inputName = response.data.match;
     displayRelativeDirections(ships, state.inputName, state, middleware, linkedMiddleware);
    });
    return;
   }
   else displayRelativeDirections(ships, middleware.persistentStates.focus.name, state, middleware, linkedMiddleware);
  }
  else displayRelativeDirections(ships, state.inputName, state, middleware, linkedMiddleware);
 });
};

const displayRelativeDirections = (ships, inputName, state, middleware, linkedMiddleware) => {
 if (ships.length === 0 || !inputName) return;
 const inputFromFocus = middleware.persistentStates.focus && middleware.persistentStates.focus.name === inputName;
 const device = linkedMiddleware.device;
 let count = 1;
 let m = inputName.match(/^\s*(\d*)\./);
 if (m) {
  inputName = inputName.slice(m[0].length);
  count = Math.max(1, Number(m[1]));
 }
 let ship;
 if (inputName) {
  const searchName = ` ${inputName.toLowerCase()}`;
  ship = ships.find(ship => {
   if (` ${ship.name.toLowerCase()}`.indexOf(searchName) !== -1) {
    count--;
    return count === 0;
   }
  });
 }
 else if (count <= ships.length) ship = ships[count - 1];
 if (!ship) {
  if (inputFromFocus) {
   delete middleware.persistentStates.focus;
   device.respond(`The focused ship is no longer in the sector.`);
  }
  else return device.respond(`That object was not found.`);
 }
 else {
  middleware.persistentStates.focus = ship;
  if (linkedMiddleware.device.soundpack.name) {
   ships.sort((a, b) => a.distance !== b.distance ? a.distance - b.distance : a.priority - b.priority);
   const oob = starmap.oob(state, middleware.persistentStates, ships);
   device.respond(`#$#px starmap nearest ${ships[0].distance} | ${oob.join(' | ')}`);
  }
  device.respond(`${ship.name}: ${ship.dir}  (${ship.x}, ${ship.y}, ${ship.z})`);
 }
};

module.exports = fd;
