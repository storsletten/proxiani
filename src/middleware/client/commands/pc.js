const { connectChatServer } = require('../../../chatServer.js');

// This is kind of like a plugin. You type the command and it hooks up everything that is needed.
const pc = (data, middleware, linkedMiddleware) => {
 data.forward.pop();
 const device = middleware.device;
 if (!device.chatServer || typeof device.chatServer !== 'object' || Array.isArray(device.chatServer)) device.chatServer = {};
 const chatServer = device.chatServer;
 const verb = data.input.trim().split(' ', 1)[0].toLowerCase();
 if (verb === 'pc') {
  if (data.input.match(/^\s*[^\s]+\s+(q|qui|quit|exit|sleep|stop|discon|disconn|disconnect)\s*$/)) {
   if (!chatServer.connecting && !chatServer.connected) device.respond(`Chat server is not connected.`);
   else {
    device.respond(chatServer.authorized ? `You disconnect from the chat server.` : `You stop the chat server connection attempt.`);
    chatServer.autoReconnect = false;
    if (chatServer.close) chatServer.close();
    else chatServer.connecting = false;
    if (device.proxy.user.config.chatServer) device.proxy.user.config.chatServer.autoConnect = false;
   }
   return;
  }
  if (data.input.match(/^\s*[^\s]+\s+(always\s+)?trust(\s+always)?\s*$/)) {
   if (!chatServer.login) device.respond(`There's no certificate to trust at this time.`);
   else chatServer.login(data.input.indexOf('always') !== -1);
   return;
  }
  const credentials = data.input.match(/^\s*[^\s]+\s+(tls:\/\/)?([^:]+):([^@]*)@([^:]+):(\d+)\s*$/);
  if (credentials) {
   if (!chatServer.credentials) chatServer.credentials = {};
   chatServer.credentials = { ...chatServer.credentials, tls: credentials[1] ? true : false, username: credentials[2].trim(), password: credentials[3] ? credentials[3].trim() : '', host: credentials[4].trim(), port: parseInt(credentials[5].trim()) };
   if (chatServer.close) chatServer.close(`Reconnecting chat server...`);
   else device.respond(`Connecting chat server...`);
   connectChatServer(device);
   return;
  }
 }
 if (chatServer.authorized) {
  if (verb === 'pc') {
   const cmd = data.input.match(/^\s*[^\s]+\s+(.+)$/);
   if (cmd) chatServer.socket.write(`${cmd[1].trim()}\n`);
   else device.respond(`Chat server is connected and ready.`);
  }
  else chatServer.socket.write(`${data.input.trim()}\n`);
 }
 else if (chatServer.connected) device.respond(`Chat server is authenticating. Please wait.`);
 else if (chatServer.credentials && chatServer.credentials.host && chatServer.credentials.username) {
  if (!chatServer.connecting) device.respond(`Reconnecting chat server...`);
  connectChatServer(device);
 }
 else device.respond(`Syntax: pc username:password@host:port`);
};

module.exports = pc;
