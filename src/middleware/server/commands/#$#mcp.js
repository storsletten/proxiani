const { randomBytes } = require('crypto');

module.exports = (data, middleware) => {
 if (middleware.device.mudMixer) return;
 const command = data.input.split(' ');
 if (command.length !== 5 || command[1] !== 'version:' || command[3] !== 'to:' || !isFinite(command[4])) return;
 data.forward.pop();
 const authKey = randomBytes(2).toString('hex');
 middleware.persistentStates.mcp = { authKey, packages: {} };
 data.respond.push(`#$#mcp authentication-key: ${authKey} version: 1.0 to: 2.1`);
};
