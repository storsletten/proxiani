const direction = require('./direction');

const alliances = {
 'A': 'AIE',
 'B': 'Blue',
 'C': 'C',
 'CW': 'Commonwealth',
 'F': 'Frnalk',
 'G': 'GADZOOKS',
 'H': 'Hale',
 'HG': 'HG',
 'K': 'Krenelia',
 'O': 'Observer',
 'P': 'Pink',
 'R': 'Red',
 'T': 'CTN',
 'U': 'Unknown',
};

const shipPriorities = [
 'Frnalk',
 'Mugatra',
 'Elganamu',
 'Muzation',
 'Bezation',
 'Frnazalk',
 'Resa-Onati',
 'Ur-Potate',
 'Potate',
 'Ortamu',
 'Muzano',
 'Ohaxx',
 'Kritzn',
 'Onnota',
 'Resati',
 'Ozarti',
 'Ozasati',
 'Onati',
 'Onno',
 'Onz',
 'Muzati',
 'Orta',
 'Otono',
 'Otona',
 'Muzatini',
 'Ontanka',
 'Bzzr',
 'Bzano',
 'Bzani',
 'Trajrrk',
 'Friziti',
 'Potateoton',
];

const typeTitles = ['Accelerators', 'Artifacts', 'Asteroids', 'Blockades', 'Buoys', 'Combat Drones', 'Control Beacons', 'Debris', 'Dry Docks', 'Interdictors', 'Jumpgates', 'Missiles', 'Mobile Platforms', 'Moons', 'Pellets', 'Planets', 'Private Moons', 'Private Planets', 'Private Space Stations', 'Proximity Weapons', 'Relics', 'Satellites', 'Space Stations', 'Stars', 'Starships', 'Unknown', 'Wormholes'];
const types = typeTitles.map(objectType => objectType.toLowerCase());
const findType = text => {
 if (text.length === 0) return;
 text = text.toLowerCase();
 if (text === 'a') return 'Artifacts';
 else if (text.length > 1 && 'beacons'.startsWith(text)) return 'Control Beacons';
 else if (text.length > 1 && 'docks'.startsWith(text)) return 'Dry Docks';
 else if (text.length > 1 && 'drones'.startsWith(text)) return 'Combat Drones';
 else if ('mo'.startsWith(text)) return 'Moons';
 else if (text.length > 3 && 'platforms'.startsWith(text)) return 'Mobile Platforms';
 else if ('prox'.startsWith(text) || (text.length > 1 && 'weapons'.startsWith(text))) return 'Proximity Weapons';
 else if (text.length > 1 && 'ships'.startsWith(text)) return 'Starships';
 else if (text.length > 3 && 'stations'.startsWith(text)) return 'Space Stations';
 else if ('video probes'.startsWith(text) || 'probes'.startsWith(text)) return 'Satellites';
 for (let i=0; i<types.length; i++) {
  if (types[i].startsWith(text)) return typeTitles[i];
 }
};

const getHeader = text => {
 const extra = text => {
  return {
   isExplored: text.indexOf('[Explored]') !== -1,
   isUnexplored: text.indexOf('[Unexplored]') !== -1,
   isUnclaimed: text.indexOf('(Unclaimed)') !== -1,
   isOutsideCommsRange: text.indexOf('[Outside Communications Range]') !== -1,
   isOutsideLocalSpace: text.indexOf('[Outside Local Space]') !== -1,
  };
 };
 let m = text.match(/^Sector ([0-9]{1,3})\: ([^(]+?) \(([^)]+?)\)(.*)/);
 if (m) {
  return {
   type: 'numberedSector',
   number: m[1],
   name: m[2],
   alliance: m[3],
   ...extra(m[4]),
  };
 }
 m = text.match(/^([^:]+)\: ([^(]+) \(([^)]+)\)(.*)/);
 if (m) {
  return {
   type: m[1],
   name: m[2],
   alliance: m[3],
   ...extra(m[4]),
  };
 }
 m = text.match(/^([Aa][^.,:(]*? starship simulator) \(Unclaimed\)(.*)/);
 if (m) {
  return {
   type: 'simulator',
   name: m[1],
   ...extra(m[2]),
  };
 }
 m = text.match(/^Simulated ([^(]+?) \(Unclaimed\)(.*)/);
 if (m) {
  return {
   type: 'simulatedSpace',
   name: m[1],
   ...extra(m[2]),
  };
 }
};
const parseObjects = (type, text, currentCoordinates) => {
 try {
  const objects = text.split(')').slice(0, -1);
  const lastIndex = objects.length - 1;
  const you = currentCoordinates && { x: Number(currentCoordinates.x), y: Number(currentCoordinates.y), z: Number(currentCoordinates.z) };
  if (type === 'starships') {
   return objects.map((text, index) => {
    let [name, coords] = text.split('(');
    const [x, y, z] = coords.split(', ');
    let alliance = '';
    if (name.length > 0) {
     name = name[0] === ',' ? name.slice(1).trim() : name.trim();
     if (index === lastIndex && index > 0 && name.indexOf('and') === 0) name = name.slice(4);
     if (name[name.length - 1] === ']') {
      const leftBracketPos = name.lastIndexOf('[');
      if (leftBracketPos !== -1) {
       alliance = name.slice(leftBracketPos + 1, -1);
       name = name.slice(0, leftBracketPos - 1);
      }
     }
    }
    if (you) return { name, alliance, index, x, y, z, ...direction.calculate3d(you, { x, y, z }) };
    else return { name, alliance, index, x, y, z };
   });
  }
  else {
   return objects.map((text, index) => {
    const [x, y, z] = text.split('(')[1].split(', ');
    if (you) return { index, x, y, z, ...direction.calculate3d(you, { x, y, z }) };
    else return { index, x, y, z };
   });
  }
 }
 catch (error) {
  return [];
 }
};


const reader = (data, state) => {
 if (!state.readingStarmap) {
  if (data.input.length === 0) return true;
  else if ([`I don't understand that.`, 'Invalid selection.'].includes(data.input) || data.input.slice(0, 5) === 'Wait ') return false;
  const header = getHeader(data.input);
  if (!header) return true;
  state.header = header;
  state.readingStarmap = true;
  state.foundTypes = [];
  state.bufferedInput = [data.forward.pop()];
  return true;
 }
 state.bufferedInput.push(data.forward.pop());
 if (data.input.length === 0) return true;
 if (!state.readingStarmapObjects) {
  if (!state.sensorInterference && data.input === `Alert: Sensor interference detected.`) {
   state.sensorInterference = true;
   return true;
  }
  if (!state.nebula && data.input === `WARNING: H II region detected.`) {
   state.nebula = true;
   return true;
  }
  if (!state.galacticCoordinates) {
   const m = data.input.match(/^Galactic Coordinates\: \((-?[0-9]{1,10}), (-?[0-9]{1,10}), (-?[0-9]{1,10})\)$/);
   if (m) {
    const [x, y, z] = m.slice(1, 4);
    state.galacticCoordinates = { x, y, z };
    return true;
   }
  }
  if (data.input === ' --------------------          --------------------') {
   state.visualStarmapDetected = true;
   state.readingStarmapObjects = true;
   return true;
  }
 }
 const colonPos = data.input.indexOf(': ');
 if (colonPos > 0) {
  const objectType = data.input.slice(0, colonPos).toLowerCase();
  if (objectType !== 'current coordinates' && types.includes(objectType)) {
   state.readingStarmapObjects = true;
   state[objectType] = data.input.slice(colonPos + 2);
   state.foundTypes.push(objectType);
   return true;
  }
  else if (data.input === 'Current Coordinates: (unknown)') {
   state.currentCoordinates = { x: 0, y: 0, z: 0 };
   state.readingComplete = true;
   return;
  }
  else {
   const m = data.input.match(/^Current Coordinates\: \(([0-9]{1,2}), ([0-9]{1,2}), ([0-9]{1,2})\)$/);
   if (m) {
    const [x, y, z] = m.slice(1, 4);
    state.currentCoordinates = { x: Number(x), y: Number(y), z: Number(z) };
    state.readingComplete = true;
    return;
   }
  }
 }
 if (state.visualStarmapDetected && state.foundTypes.length === 0) {
  if (colonPos > 0 || ['|', ' '].includes(data.input[0])) return true;
 }
 if (state.readingStarmapObjects || state.sensorInterference || state.nebula || state.galacticCoordinates) data.forward = state.bufferedInput;
 else {
  const header = getHeader(data.input);
  if (!header) {
   data.forward = state.bufferedInput;
   state.bufferedInput = [];
   state.readingStarmap = false;
   return true;
  }
  state.header = header;
  state.readingStarmap = true;
  state.foundTypes = [];
  state.bufferedInput = [data.forward.pop()];
  return true;
 }
};

const calculateShipPriority = (ship, smHeader = {}) => {
 let label;
 let priority;
 if ('FP'.includes(ship.alliance) && ship.name.indexOf('Praelor ') !== -1) {
  label = ship.name.split(' ', 2)[1];
  priority = shipPriorities.indexOf(label);
  if (priority === -1) {
   label = 'Other Praelor';
   priority = shipPriorities.length;
  }
 }
 else if (ship.alliance in alliances) {
  if (ship.alliance === 'G' && smHeader.type === 'simulator') label = 'Green';
  else label = alliances[ship.alliance];
  priority = shipPriorities.length;
  if (ship.alliance === 'O') priority += 0xff;
  else if (ship.alliance !== 'T') priority += label.charCodeAt(0);
 }
 else {
  label = 'Other';
  priority = 0xfffffff;
 }
 return { label, priority };
};

const oob = (state, persistentState = {}, ships = []) => {
 const data = [`cc ${state.currentCoordinates.x} ${state.currentCoordinates.y} ${state.currentCoordinates.z}`];
 if (state.galacticCoordinates) data.push(`gc ${state.galacticCoordinates.x} ${state.galacticCoordinates.y} ${state.galacticCoordinates.z}`);
 if (state.sensorInterference) data.push(`sensor interference`);
 if (state.nebula) data.push(`H II region`);
 if (persistentState.aim) {
  const range = Math.max(Math.abs(persistentState.aim.x - state.currentCoordinates.x), Math.abs(persistentState.aim.y - state.currentCoordinates.y), Math.abs(persistentState.aim.z - state.currentCoordinates.z));
  const hasTarget = persistentState.aim.type !== 'Starship' || (ships.length > 0 && ships.find(ship => ship.x == persistentState.aim.x && ship.y == persistentState.aim.y && ship.z == persistentState.aim.z));
  // Todo: Make hasTarget work with other types than just starships. persistentState.aim.type may not match values in state.foundTypes, and I don't have the patience to sort that out now.
  data.push(`range ${hasTarget ? range : -range}`);
 }
 return data;
};

module.exports = {
 alliances,
 calculateShipPriority,
 findType,
 parseObjects,
 reader,
 oob,
 shipPriorities,
 types,
 typeTitles,
};
