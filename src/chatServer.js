const crypto = require('crypto');
const net = require('net');

// Edit major accordingly when there are breaking changes:
const major = 1;

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
     data = data.trim().match(/^PCS: (\d{1,10})$/);
     if (!data) return closeHandle(`That server does not appear to be a Proxiani Chat Server.`);
     const serverMajor = parseInt(data[1]);
     if (major !== serverMajor) return closeHandle(`You'll need ${major < serverMajor ? 'a newer version of Proxiani' : 'an older version of Proxiani'} if you want to connect to that chat server.`);
     socket.write(`${chatServer.credentials.username} ${chatServer.credentials.password}\n`);
     socket.once('data', data => {
      if (socket === chatServer.socket) {
       if (!data.split("\n").includes('PCS: Authorized')) return closeHandle(`The chat server did not accept your username and/or password.`);
       chatServer.authorized = true;
       device.respond(`Chat server connected.`);
       socket.on('data', data => {
        data = data.trim();
        if (data) {
         if (data.split("\n").includes(`PCS: Disconnect`)) chatServer.autoReconnect = false;
         device.link && device.link.logger && device.link.logger.write(data);
         device.respond(data);
        }
       });
       if (chatServer.credentials && device.proxy && device.proxy.user) device.proxy.user.config.chatServer = chatServer.credentials;
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
