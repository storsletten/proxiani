const parseMovement = line => {
 if (line.startsWith('#$#') || !line.endsWith('.')) return;
 if (line.startsWith('You ')) {
  if (line.startsWith('You follow ')) {
   const m = line.match(/^You follow (.{1,100}?) (into the .{1,50}|outside the ship|through the .{1,100}|north|northeast|east|southeast|south|southwest|west|northwest|up|down)\.$/);
   if (m) return { following: m[1], direction: m[2] };
  }
  else {
   const m = line.match(/^You ([^:([]{1,50}?) (into the .{1,50}|outside the ship|through the .{1,100}|north|northeast|east|southeast|south|southwest|west|northwest|up|down)\.$/);
   if (m) return { walkStyle: m[1], direction: m[2] };
  }
 }
 else {
  const m = line.match(/^(\w[^:([]{0,100}?) drags you (into the .{1,50}|outside the ship|through the .{1,100}|north|northeast|east|southeast|south|southwest|west|northwest|up|down)\.$/);
  if (m) return { following: m[1], direction: m[2], isDragging: true };
 }
};

module.exports = (data, middleware, linkedMiddleware) => {
 const command = data.input.split(' ');
 if (command.length === 1) return;
 switch (command[1]) {
  case 'environment': {
   if (command.length === 2) break;
   const prevRoom = middleware.persistentStates.room;
   const movement = parseMovement(middleware.device.lastLines[middleware.device.lastLines.length - 1]);
   if (movement) middleware.persistentStates.movement = movement;
   const room = { zoneType: command[2], description: [], output: [data.input] };
   if (command.length > 3) {
    const props = command.slice(3).join(' ').split(' | ');
    switch (room.zoneType) {
     case 'planet': {
      room.classification = props[0];
      props.slice(1).forEach(prop => room[prop] = true);
      break;
     }
     default: props.forEach(prop => room[prop] = true);
    }
   }
   if (prevRoom && (prevRoom.fullTitle === undefined || prevRoom.exits === undefined)) data.forward.push(`Your look-options must include both title and exits for the soundpack to work properly.`);
   middleware.persistentStates.room = room;
   middleware.setState('room', (data, middleware) => {
    const room = middleware.persistentStates.room;
    if (room.output.length > 25 || data.input.startsWith('#$#')) {
     room.output = [];
     return 0b10;
    }
    room.output.push(data.input);
    if (data.input.length === 0) return 0;
    const state = middleware.states.room.data;
    if (room.fullTitle === undefined && data.input[0] === '[') {
     let i = data.input.lastIndexOf(']');
     if (i > 0) {
      if ((data.input.length - i) > 2) room.meta = data.input.slice(i + 2);
      room.fullTitle = data.input.slice(1, i);
      const zoneEnclosedInQuotes = room.zoneType === 'starship' && room.fullTitle[0] === '"';
      i = room.fullTitle.indexOf(zoneEnclosedInQuotes ? '" ' : '; ', 1);
      if (i !== -1) {
       room.zone = room.fullTitle.slice(zoneEnclosedInQuotes ? 1 : 0, i);
       room.title = room.fullTitle.slice(i + 2);
      }
      if (room.zoneType === 'space') {
       room.exits = [];
       return 0b11;
      }
      else return room.exits ? 0b11 : 1;
     }
    }
    else if (room.exits === undefined) {
     if (['You see nowhere obvious to go.', 'You cannot navigate the vehicle here.', `It's too dark to see!`].includes(data.input)) {
      room.exits = [];
      return room.fullTitle ? 0b11 : 1;
     }
     const m = data.input.match(/^You can (go|navigate) ([a-zA-Z ,]+)\.$/);
     if (m) {
      room.exits = m[2].replace(/,/g, '').split(' ');
      if (room.exits.length > 1) room.exits.splice(-2, 1);
      return room.fullTitle ? 0b11 : 1;
     }
    }
    room.description.push(data.input);
    return 1;
   });
   break;
  }
 }
};
