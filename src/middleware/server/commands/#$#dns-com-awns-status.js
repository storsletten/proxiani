module.exports = (data, middleware) => {
 if (middleware.device.mudMixer) return;
 const mcp = middleware.persistentStates.mcp;
 if (!mcp) return;
 const command = data.input.split(' ');
 if (command.length < 4 || command[1] !== mcp.authKey || command[2] !== 'text:') return;
 const status = command.slice(3).join(' ');
 mcp.status = status.length > 1 && status[0] === '"' && status[0] === status[status.length - 1] ? status.slice(1, -1) : status;
};
