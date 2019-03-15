const crypto = require('crypto');
const net = require('net');
const filters = require('../filters.js');
const protocols = require('../protocols.js');
const GenericDevice = require('./generic.js');

class ChatClient extends GenericDevice {
 create(options) {
  this.host = options.host;
  this.port = options.port;
  this.connectionAttempts = 0;
  this.autoReconnect = options.autoReconnect !== undefined ? options.autoReconnect : true;
  this.autoReconnectInterval = options.autoReconnectInterval || 3000;
  this.disconnectedSince = this.startdate;
  this.connectTimeout = options.connectTimeout || 7000;
  this.datapacker = new protocols.Datapacker({ device: this });
  this.inputProtocols.push(this.datapacker);
  this.outputProtocols.push(this.datapacker);
  this.events.on('connect', () => this.socket.setTimeout(0));
  super.create(options);
  this.connect();
 }
 close(reconnect) {
  if (this.closed) return;
  if (reconnect && this.autoReconnect && (!this.connectionEnded || (this.lastLines.length > 1 && this.lastLines[this.lastLines.length - 2].startsWith('*** Server shutdown by ')))) {
   this.timers.set('reconnect', () => this.connect(), this.autoReconnectInterval - ((new Date()) - this.lastConnectionAttempt));
  }
  else super.close();
 }
 connect() {
  this.connectionEnded = false;
  this.connectionAttempts++;
  this.lastConnectionAttempt = new Date();
  this.proxy.console(`${this.title} connecting to ${this.host} on port ${this.port}`);
  this.socket = net.createConnection({ host: this.host, port: this.port }, () => {
   const { address, port } = this.socket.address();
   this.proxy.console(`${this.title} established connection with ${address} using port ${port}`);
   if (this.connectTimeout) this.socket.setTimeout(0);
   this.datapacker.auth(this.proxy.user.config.chatServer);
  });
  this.socket.pause();
  if (this.connectTimeout) {
   this.socket.setTimeout(this.connectTimeout);
   this.socket.once('timeout', () => {
    this.proxy.console(`${this.title} connection timeout`);
    this.socket.destroy();
   });
  }
  this.applySocketOptions();
 }
 input(chunk) {}
} 

module.exports = ChatClient;
