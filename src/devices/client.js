const TelnetDevice = require('./telnet.js');
const { connectChatServer } = require('../chatServer.js');

class Client extends TelnetDevice {
 create(options) {
  this.socket = options.socket;
  this.soundpack = {};
  this.events.once('ready', () => this.respond(`#$#px version ${this.proxy.version}`));
  this.events.on('ready', () => {
   if (this.link.connected && this.link.socket.authorized === false) this.respond(`*** TLS authorization failed. Please see px console for more information. ***`);
   if (this.proxy.outdated) this.respond(`*** New ${this.proxy.outdated} update for ${this.proxy.name}: ${this.proxy.latestVersion} ***`);
  });
  this.applySocketOptions();
  super.create(options);
  if (this.proxy.user.config.chatServer) {
   if (!this.chatServer) this.chatServer = {};
   this.chatServer.credentials = this.proxy.user.config.chatServer;
   if (this.chatServer.credentials.autoConnect) connectChatServer(this);
  }
  this.events.emit('connect');
 }
} 

module.exports = Client;
