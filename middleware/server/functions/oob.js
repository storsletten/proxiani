module.exports = (data, middleware, linkedMiddleware) => {
 if (!data.input.startsWith('#$#')) return;
 const command = data.input.slice(3).split(' ');
 switch (command[0]) {
  case 'soundpack': {
   if (command.length === 1) break;
   switch (command[1]) {
    case 'environment': {
     if (command.length === 2) break;
     const room = { zoneType: command[2] };
     if (command.length > 3) {
      const props = command.slice(3).join(' ').split(' | ');
      switch (room.zoneType) {
       case 'planet': {
        room.classification = props[0];
        props.slice(1).forEach(prop => room[prop] = true);
        break;
       }
       case 'vehicle': {
        room[props[0]] = true;
        if (props.length > 1) room.classification = props[1];
        break;
       }
       default: props.forEach(prop => room[prop] = true);
      }
     }
     middleware.persistentStates.room = room;
     break;
    }
   }
   break;
  }
 }
 return true;
};
