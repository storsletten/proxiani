module.exports = (data, middleware) => {
 if (middleware.device.mudMixer) return;
 const mcp = middleware.persistentStates.mcp;
 if (!mcp) return;
 const command = data.input.split(' ');
 if (command.length < 4 || command[1] !== mcp.authKey || command[2] !== 'id:') return;
 data.forward.pop();
 data.respond.push(`#$#dns-com-awns-ping-reply ${command.slice(1).join(' ')}`);
};
