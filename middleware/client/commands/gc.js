const knownSectors = {
 '0': [-603120, 41, 450],
 '1': [-603080, 1, 420],
 '2': [-603079, 0, 420],
 '3': [-603078, -1, 420],
 '4': [-603077, -2, 420],
 '5': [-603200, 22, -375],
 '6': [-603328, 58, 467],
 '7': [-603109, 20, -117],
 '8': [-603129, -58, 200],
 '9': [-603105, 7, 50],
 '10': [-603225, -58, 271],
 '11': [-603128, 22, 184],
 '12': [-603229, 58, 200],
 '13': [-603129, 30, 580],
 '14': [-603107, 59, 479],
 '15': [-603126, 40, 507],
 '16': [-602433, 111, 57],
 '17': [-602419, 1, 21],
 '18': [-602410, -21, -1],
 '19': [-604622, 27, 167],
 '20': [-602410, -21, 90],
 '21': [-602422, -47, 117],
 '22': [-602432, -52, 217],
 '23': [-602632, 40, 467],
 '24': [-602630, -13, 214],
 '25': [-602662, 109, 417],
 '26': [-602622, 27, 167],
 '27': [-602232, 23, 377],
 '28': [-602637, 32, 400],
 '29': [-602632, 22, 407],
 '30': [-602632, 13, 467],
 '31': [-602662, -101, 251],
 '32': [-602652, -115, 211],
 '33': [-602682, -50, 219],
 '34': [-602750, -25, 250],
 '35': [-602620, 10, 222],
 '36': [-602500, 35, -95],
 '37': [-602611, 49, -324],
 '38': [-602823, 143, -67],
 '39': [-602555, 47, 324],
 '40': [-602876, 83, 199],
 '115': [-603127, 103, 466],
};

const gc = (data, middleware, linkedMiddleware) => {
 if (linkedMiddleware.states.gc) delete linkedMiddleware.states.gc;
 const args = data.input.match(/^\s*\w+\s+(.+)$/);
 if (!args) return;
 let gcTarget = [];
 let sector;
 if (isFinite(args[1])) {
  if (args[1] in knownSectors) {
   gcTarget = knownSectors[args[1]];
   sector = `Sector ${args[1]}`;
  }
 }
 else {
  const m = args[1].match(/^\s*(-?\d+),? (-?\d+),? (-?\d+)/);
  if (m) gcTarget = m.slice(1, 4).map(v => Number(v));
 }
 if (gcTarget.length !== 3) return;
 data.forward[0] = 'gc';
 linkedMiddleware.setState('gc', {
  data: {
   gcTarget,
   sector,
  },
 }, (data, middleware, linkedMiddleware) => {
  if (data.input.length === 0) return 0;
  else if ([`I don't understand that.`, 'Invalid selection.'].includes(data.input)) return 0b10;
  const m = data.input.match(/^Current galactic coordinates\: (-?[0-9]{1,10}), (-?[0-9]{1,10}), (-?[0-9]{1,10})$/);
  if (!m) return 0;
  const gcTarget = middleware.states.gc.data.gcTarget;
  const sector = middleware.states.gc.data.sector;
  const gc = m.slice(1, 4).map(n => Number(n));
  const dir = [];
  const dx = gcTarget[0] - gc[0];
  const dy = gcTarget[1] - gc[1];
  const dz = gcTarget[2] - gc[2];
  const [dxa, dya, dza] = [dx, dy, dz].map(n => Math.abs(n));
  if (dx !== 0) dir.push(`${dxa} ${dxa === 1 ? 'sector' : 'sectors'} ${dx > 0 ? 'east' : 'west'}`);
  if (dy !== 0) dir.push(`${dya} ${dya === 1 ? 'sector' : 'sectors'} ${dy > 0 ? 'south' : 'north'}`);
  if (dz !== 0) dir.push(`${dza} ${dza === 1 ? 'sector' : 'sectors'} ${dz > 0 ? 'down' : 'up'}`);
  if (dir.length === 0) data.forward[0] = `You're here.`;
  else {
   const text = sector ? `${sector} is` : `The target coordinates lie`;
   if (dir.length === 1) data.forward[0] = `${text} ${dir[0]}.`;
   else if (dir.length === 2) data.forward[0] = `${text} ${dir[0]} and ${dir[1]}.`;
   else if (dir.length === 3) data.forward[0] = `${text} ${dir[0]}, ${dir[1]}, and ${dir[2]}.`;
  }
 });
};

module.exports = gc;
