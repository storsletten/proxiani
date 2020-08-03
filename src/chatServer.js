const crypto = require('crypto');
const net = require('net');
const tls = require('tls');

// Edit the major constant accordingly when there are breaking changes:
const major = 1;

const connectChatServer = device => {
 const chatServer = device.chatServer;
 if (!chatServer || !chatServer.credentials || !chatServer.credentials.username || !chatServer.credentials.host) return;
 if (chatServer.connecting) {
  device.respond(`Proxiani is already attempting to connect to the chat server.`);
  device.respond(`If you need to provide new credentials, then use the PC command with the following syntax: pc username:password@host:port`);
  return;
 }
 if (chatServer.close) chatServer.close();
 if (typeof chatServer.credentials.password !== 'string' || !chatServer.credentials.password.match(/^[a-z0-9]{64}$/)) {
  chatServer.credentials.password = crypto.createHash('sha256').update(chatServer.credentials.password ? String(chatServer.credentials.password).trim() : '').digest('hex');
 }
 chatServer.autoReconnect = true;
 chatServer.connecting = true;
 const secure = chatServer.credentials.tls;
 const socket = secure ? tls.connect(chatServer.credentials) : net.createConnection(chatServer.credentials);
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
    chatServer.connecting = true;
    setTimeout(() => {
     if (chatServer.connecting && !chatServer.socket) {
      chatServer.connecting = false;
      if (device.socket && !device.socket.destroyed) connectChatServer(device);
     }
    }, 3000);
   }
   else chatServer.connecting = false;
  }
  if (!socket.destroyed) socket.destroy();
 };
 chatServer.socket = socket;
 chatServer.close = closeHandle;
 device.events.on('close', closeHandle);
 socket.on('error', err => closeHandle(err.message.startsWith('connect E') ? undefined : `Chat server connection error: ${err.message}`));
 socket.on('close', () => {
  if (device.socket && !device.socket.destroyed && socket === chatServer.socket) {
   if (chatServer.authorized) device.respond(`Connection to chat server dropped.`);
  }
  closeHandle();
 });
 socket.on(secure ? 'secureConnect' : 'connect', () => {
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
       chatServer.connecting = false;
       device.respond(`Chat server connected.`);
       if (device.soundpack && device.soundpack.name) socket.write(`#$#register_soundpack ${device.soundpack.name}\n`);
       socket.setKeepAlive(true, 30000);
       socket.bufferedData = '';
       socket.on('data', data => {
        if (socket.bufferedData) data = `${data.bufferedData}${data}`;
        data = data.split("\n");
        socket.bufferedData = data[data.length - 1];
        if (data.length > 1) {
         data.slice(0, -1).forEach(line => {
          device.link && device.link.logger && !line.startsWith('#$#') && device.link.logger.write(line);
          if (line === 'PCS: Disconnect') chatServer.autoReconnect = false;
          else device.respond(line);
         });
        }
        else if (socket.bufferedData.length > 5000000) {
         socket.bufferedData = '';
         device.respond(`*** Exceeded max line length from chat server ***`);
         socket.destroy();
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
