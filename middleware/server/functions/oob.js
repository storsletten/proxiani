module.exports = (data, middleware, linkedMiddleware) => {
 if (!data.input.startsWith('#$#')) return;
 const command = data.input.slice(3).split(' ');
 switch (command[0]) {
  case 'soundpack': {
   if (command.length === 1) break;
   switch (command[1]) {
    case 'environment': {
     if (command.length === 2) break;
     const prevRoom = middleware.persistentStates.room;
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
     if (prevRoom && (prevRoom.fullTitle === undefined || prevRoom.exits === undefined)) data.forward.push(`Your look-options must include title and exits for the soundpack to work properly, and exits must be last.`);
     middleware.persistentStates.room = room;
     middleware.states = {};
     middleware.setState('room', (data, middleware) => {
      const room = middleware.persistentStates.room;
      if (room.output.length > 25 || data.input.startsWith('#$#')) {
       data.forward.push(`There seems to be something wrong with your look-options. Please make sure that exits are included in your look-options, and that they are last in the list.`);
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
        else return 1;
       }
      }
      else if (room.exits === undefined) {
       if (['You see nowhere obvious to go.', 'You cannot navigate the vehicle here.'].includes(data.input)) {
        room.exits = [];
        return;
       }
       const m = data.input.match(/^You can (go|navigate) ([a-z ,]+)\.$/);
       if (m) {
        room.exits = m[2].replace(/,/g, '').split(' ');
        if (room.exits.length > 1) room.exits.splice(-2, 1);
        return;
       }
      }
      room.description.push(data.input);
      return 1;
     });
     break;
    }
   }
   break;
  }
 }
 return true;
};
