const separatorRegexp = /^-{2,100}$/;

const scan = (data, middleware, linkedMiddleware) => {
 linkedMiddleware.setState('scan', (data, middleware, linkedMiddleware) => {
  if (data.input.length === 0) return 0;
  const state = middleware.states.scan.data;
  if (!state.object) {
   if (data.input === 'Enter your selection.') middleware.states.scan.timeout = 0;
   else if (data.input.slice(0, 5) === 'Wait ' || [`I don't understand that.`, 'Invalid selection.', 'That is now out of scanning range.', 'That object was not found.', 'Your sensors are unable to scan those coordinates.'].includes(data.input)) return 0b10;
   else if (data.input.match(separatorRegexp)) state.object = {};
   else state.header = data.input;
   return 0;
  }
  else {
   const object = state.object;
   const i = data.input.indexOf(': ');
   if (i > 100) return 0b10;
   else if (i !== -1) {
    const label = data.input.slice(0, i).toLowerCase();
    const value = data.input.slice(i + 2);
    object[label] = value;
    return 0b01;
   }
   else if (object.coordinates && object.distance && data.input.match(separatorRegexp)) {
    const distance = Number(object.distance);
    if (isNaN(distance)) return 0b10;
    let m = object.coordinates.match(/^\(([0-9]{1,2}), ([0-9]{1,2}), ([0-9]{1,2})\)$/);
    if (!m) return 0b10;
    const [x, y, z] = m.slice(1, 4);
    object.distance = distance;
    object.coordinates = { x, y, z };
    if (state.header) {
     if (object.cargo && object.occupancy && object.power && object.weapons) {
      object.objectType = 'starship';
      m = state.header.match(/^The ([^"]{5,50}) "([^"]{2,50})" \(([^)]{1,50})\)$/);
      if (m) {
       object.type = m[1];
       object.name = m[2];
       object.alliance = m[3];
      }
      else {
       m = state.header.match(/^([^(]{2,70}) \(([^)]{1,50})\)$/);
       if (m) {
        object.name = m[1];
        object.alliance = m[2];
        object.type = object.alliance === 'Ontanka' ? 'Praelor' : object.alliance;
       }
       else {
        object.name = state.header;
       }
      }
     }
     else {
      object.name = state.header;
      if (object.orbiting) object.objectType = 'moon';
      else if (object['atmospheric composition']) object.objectType = 'planet';
      else if (object.classification && object.classification.length === 1) object.objectType = 'star';
      else if (object.integrity) object.objectType = 'station';
      else if (object.composition) object.objectType = 'asteroid';
      else if (object.size) object.objectType = 'debris';
      else object.objectType = '';
     }
    }
    middleware.persistentStates.scan = object;
   }
  }
 });
};

module.exports = scan;
