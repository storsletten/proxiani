const dialog = require('../../helpers/dialog.js');
const direction = require('../../helpers/direction');
const starmap = require('../../helpers/starmap');

const foc = (data, middleware, linkedMiddleware) => {
 if (linkedMiddleware.states.sm && linkedMiddleware.states.sm.readingStarmap) {
  data.forward.pop();
  return;
 }
 const command = data.input.trim().toLowerCase().split(/\s+/);
 const inputName = command.length > 1 && data.input.trim().split(' ').slice(1).join(' ');
 data.forward[0] = (false && linkedMiddleware.persistentStates.visualStarmapDetected) ? 'sm co' : 'sm';
 linkedMiddleware.setState('sm', { data: { command, inputName } }, (data, middleware, linkedMiddleware) => {
  const state = middleware.states.sm.data;
  if (starmap.reader(data, state)) return state.readingStarmap ? 1 : 0;
  if (state.visualStarmapDetected) middleware.persistentStates.visualStarmapDetected = true;
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
     if (response) {
      state.inputName = response.data.match;
      processRequest(ships, state.inputName, state, middleware, linkedMiddleware);
     }
    });
    return;
   }
   else processRequest(ships, middleware.persistentStates.focus.name, state, middleware, linkedMiddleware);
  }
  else processRequest(ships, state.inputName, state, middleware, linkedMiddleware);
 });
};

const processRequest = (ships, rawInputName, state, middleware, linkedMiddleware) => {
 if (ships.length === 0 || !rawInputName) return;
 const inputFromFocus = middleware.persistentStates.focus && middleware.persistentStates.focus.name === rawInputName;
 const device = linkedMiddleware.device;
 let count = 1;
 let inputName;
 let m = rawInputName.match(/^\s*(\d*)\./);
 if (m) {
  inputName = rawInputName.slice(m[0].length);
  count = Math.max(1, Number(m[1]));
 }
 else inputName = rawInputName;
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
  const shipName = ship.name.startsWith('Praelor ') ? ship.name.slice(8) : ship.name;
  middleware.persistentStates.focus = ship;
  if (!inputFromFocus) middleware.persistentStates.focus.resendName = rawInputName;
  if (linkedMiddleware.device.soundpack.name) {
   ships.sort((a, b) => a.distance !== b.distance ? a.distance - b.distance : a.priority - b.priority);
   const oob = starmap.oob(state, middleware.persistentStates, ships);
   device.respond(`#$#px starmap nearest ${ships[0].distance} | ${oob.join(' | ')}`);
  }
  if (state.command[0] === 'smd') device.respond(`${ship.dir}, ${shipName}, ${ship.x} ${ship.y} ${ship.z}`);
  else if (state.command[0] === 'fod') device.respond(`${ship.dir}, ${ship.x} ${ship.y} ${ship.z}, ${shipName}`);
  else if (state.command[0] === 'fox') device.respond(`${ship.x} ${ship.y} ${ship.z}, ${ship.dir}, ${shipName}`);
  else device.respond(`${ship.x} ${ship.y} ${ship.z}, ${shipName}`);
 }
};

module.exports = foc;
