const crypto = require('crypto');
const net = require('net');

const chatServerWelcomeMessage = `Who's there?\n`;

const connectChatServer = device => {
 const chatServer = device.chatServer;
 if (!chatServer || !chatServer.credentials || !chatServer.credentials.username || !chatServer.credentials.host) return;
 if (chatServer.close) chatServer.close();
 if (typeof chatServer.credentials.password !== 'string' || !chatServer.credentials.password.match(/^[a-z0-9]{64}$/)) {
  chatServer.credentials.password = crypto.createHash('sha256').update(chatServer.credentials.password ? String(chatServer.credentials.password).trim() : '').digest('hex');
 }
 chatServer.autoReconnect = true;
 const socket = net.createConnection(chatServer.credentials);
 socket.setEncoding('utf8');
 const closeHandle = msg => {
  if (chatServer.close === closeHandle) {
   chatServer.connected = false;
   chatServer.authorized = false;
   chatServer.close = undefined;
   chatServer.socket = undefined;
   device.events.off('close', closeHandle);
   socket.off('close', closeHandle);
   socket.removeAllListeners('data');
   if (msg) {
    chatServer.autoReconnect = false;
    if (device.socket && !device.socket.destroyed) device.respond(msg);
   }
   if (chatServer.autoReconnect && device.socket && !device.socket.destroyed) {
    setTimeout(() => {
     if (!chatServer.socket && device.socket && !device.socket.destroyed) connectChatServer(device);
    }, 3000);
   }
  }
  if (!socket.destroyed) socket.destroy();
 };
 chatServer.socket = socket;
 chatServer.close = closeHandle;
 device.events.on('close', closeHandle);
 socket.on('error', err => closeHandle());
 socket.on('close', () => {
  if (device.socket && !device.socket.destroyed && socket === chatServer.socket) {
   if (chatServer.authorized) device.respond(`Connection to chat server dropped.`);
  }
  closeHandle();
 });
 socket.on('connect', () => {
  if (socket === chatServer.socket) {
   chatServer.connected = true;
   socket.once('data', data => {
    if (socket === chatServer.socket) {
     if (data !== chatServerWelcomeMessage) return closeHandle(`Chat server is incompatible.`);
     socket.write(`${chatServer.credentials.username} ${chatServer.credentials.password}\n`);
     socket.once('data', data => {
      if (socket === chatServer.socket) {
       if (data.indexOf(`*** Connected ***`) === -1) return closeHandle(`Chat server did not accept the username and/or the password.`);
       chatServer.authorized = true;
       device.respond(`Chat server connected.`);
       socket.on('data', data => {
        data = data.trim();
        if (data) {
         if (data.split("\n").includes(`*** Disconnected ***`)) chatServer.autoReconnect = false;
         device.link && device.link.logger && device.link.logger.write(data);
         device.respond(data);
        }
       });
      }
     });
    }
   });
  }
 });
};

module.exports = {
 connectChatServer,
};
