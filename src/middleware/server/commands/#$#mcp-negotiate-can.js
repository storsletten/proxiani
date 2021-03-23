module.exports = (data, middleware) => {
 if (middleware.device.mudMixer) return;
 const mcp = middleware.persistentStates.mcp;
 if (!mcp) return;
 const command = data.input.split(' ');
 if (command.length < 4 || command[1] !== mcp.authKey) return;
 data.forward.pop();
 if (command[2] === 'package:') mcp.packages[command[3]] = command.slice(4);
};
