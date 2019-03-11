const TelnetDevice = require('./telnet.js');

class Client extends TelnetDevice {
 constructor(options) {
  super(options);
  this.socket = options.socket;
  this.soundpack = {};
  this.events.once('ready', () => this.respond(`#$#px version ${this.proxy.version}`));
  this.events.on('ready', () => {
   if (this.link.connected && this.link.socket.authorized === false) this.respond(`*** TLS authorization failed. Please see px console for more information. ***`);
   if (this.proxy.outdated) this.respond(`*** New ${this.proxy.outdated} update for ${this.proxy.name}: ${this.proxy.latestVersion} ***`);
  });
  this.applySocketOptions();
  if (Client.name === this.constructor.name) this.proxy.events.emit(`${this.type}Created`, this);
  this.events.emit('connect');
 }
} 

module.exports = Client;
