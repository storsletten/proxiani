const { connectChatServer } = require('../../../chatServer.js');

// This is kind of like a plugin. You type the command and it hooks up everything that is needed.
const pc = (data, middleware, linkedMiddleware) => {
 data.forward.pop();
 const device = middleware.device;
 if (!device.chatServer || typeof device.chatServer !== 'object' || Array.isArray(device.chatServer)) device.chatServer = {};
 const chatServer = device.chatServer;
 const verb = data.input.trim().split(' ', 1)[0].toLowerCase();
 if (verb === 'pc') {
  const credentials = data.input.match(/^\s*[^\s]+\s+([^:]+):([^@]*)@([^:]+):(\d+)$/);
  if (credentials) {
   chatServer.credentials = { username: credentials[1].trim(), password: credentials[2] ? credentials[2].trim() : '', host: credentials[3], port: Number(credentials[4]) };
   connectChatServer(device);
   return;
  }
 }
 if (chatServer.socket) {
  if (chatServer.authorized) {
   if (verb === 'pc') {
    const cmd = data.input.match(/^\s*[^\s]+\s+(.+)$/);
    if (cmd) chatServer.socket.write(`${cmd[1].trim()}\n`);
    else device.respond(`Chat server is connected and ready.`);
   }
   else chatServer.socket.write(`${data.input.trim()}\n`);
  }
  else if (chatServer.connected) device.respond(`Chat server is authenticating. Please wait.`);
  else device.respond(`Chat server is connecting. Please wait.`);
 }
 else if (chatServer.credentials && chatServer.credentials.host && chatServer.credentials.username) {
  device.respond(`Attempting to reconnect chat server...`);
  connectChatServer(device);
 }
 else device.respond(`Syntax: pc username:password@host:port`);
};

module.exports = pc;
