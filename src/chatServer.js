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
 if (chatServer.pendingReconnect) {
  clearTimeout(chatServer.pendingReconnect);
  chatServer.pendingReconnect = undefined;
 }
 const secure = chatServer.credentials.tls;
 const socket = secure ? tls.connect({ rejectUnauthorized: false, ...chatServer.credentials }) : net.createConnection(chatServer.credentials);
 socket.setEncoding('utf8');
 const closeHandle = msg => {
  if (chatServer.close === closeHandle) {
   chatServer.connected = false;
   chatServer.authorized = false;
   chatServer.close = undefined;
   chatServer.socket = undefined;
   device.events.off('close', closeHandle);
   socket.off('close', closeHandle);
   if (msg) {
    chatServer.autoReconnect = false;
    if (device.socket && !device.socket.destroyed) device.respond(msg);
   }
   if (chatServer.autoReconnect && device.socket && !device.socket.destroyed) {
    chatServer.connecting = true;
    if (chatServer.pendingReconnect) clearTimeout(chatServer.pendingReconnect);
    const pendingReconnect = setTimeout(() => {
     if (chatServer.pendingReconnect === pendingReconnect) {
      chatServer.pendingReconnect = undefined;
      chatServer.connecting = false;
      if (device.socket && !device.socket.destroyed) connectChatServer(device);
     }
    }, 3000);
    chatServer.pendingReconnect = pendingReconnect;
   }
   else chatServer.connecting = false;
  }
  if (!socket.destroyed) socket.destroy();
 };
 chatServer.socket = socket;
 chatServer.close = closeHandle;
 device.events.on('close', closeHandle);
 socket.on('error', err => closeHandle(err.message.match(/^(connect E|read E|write E).+$/) ? undefined : `Chat server connection error: ${err.message}`));
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
     const cert = secure && socket.getPeerCertificate();
     const login = alwaysTrust => {
      chatServer.login = undefined;
      if (secure && alwaysTrust && cert.fingerprint && !chatServer.credentials.fingerprints.includes(cert.fingerprint)) {
       chatServer.credentials.fingerprints.push(cert.fingerprint);
       device.respond(`Always trusted from now on.`);
      }
      if (socket !== chatServer.socket) return device.respond(`That chat server session exists no more. Type PC if you wish to reconnect.`);
      socket.write(`${chatServer.credentials.username} ${chatServer.credentials.password}\n`);
      socket.once('data', data => {
       if (socket === chatServer.socket) {
        if (!data.split("\n").includes('PCS: Authorized')) return closeHandle(`The chat server did not accept your username and/or password.`);
        chatServer.authorized = true;
        chatServer.connecting = false;
        chatServer.autoReconnect = true;
        chatServer.credentials.autoConnect = true;
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
           if (line === 'PCS: Disconnect') {
            chatServer.autoReconnect = false;
            if (chatServer.pendingReconnect) {
             clearTimeout(chatServer.pendingReconnect);
             chatServer.pendingReconnect = undefined;
            }
           }
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
     };
     if (secure && !socket.authorized) {
      if (!Array.isArray(chatServer.credentials.fingerprints)) chatServer.credentials.fingerprints = [];
      if (!chatServer.credentials.fingerprints.includes(cert.fingerprint)) {
       chatServer.autoReconnect = false;
       device.respond(`WARNING: The authenticity of the chat server's certificate can not be verified. Here are some details:`);
       if (cert.subject) {
        cert.subject.CN && device.respond(`  Common Name: ${cert.subject.CN}`);
        cert.subject.emailAddress && device.respond(`  Email Address: ${cert.subject.emailAddress}`);
       }
       ['valid_from', 'valid_to', 'fingerprint'].forEach(prop => cert[prop] && device.respond(`  ${prop.split(/[ _].map(s => s.length > 1 ? `${s[0].toUpperCase()}${s.slice(1)}` : s).join(' ')/)}: ${cert[prop]}`));
       device.respond(`If you trust this certificate for now, then you can type pc trust. If you want to always trust this particular certificate, then type pc trust always.`);
       chatServer.login = login;
      }
      else login();
     }
     else login();
    }
   });
  }
 });
};

module.exports = {
 connectChatServer,
};
