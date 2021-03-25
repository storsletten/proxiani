const net = require('net');
const tls = require('tls');
const filters = require('../filters.js');
const TelnetDevice = require('./telnet.js');
const Logger = require('../logger.js');

class Server extends TelnetDevice {
 create(options) {
  this.host = options.host;
  this.port = options.port;
  this.ipVersion = ([0, 4, 6]).includes(options.ipVersion) ? options.ipVersion : 0;
  this.tls = options.tls;
  this.connectionAttempts = 0;
  this.autoReconnect = options.autoReconnect !== undefined ? options.autoReconnect : true;
  this.autoReconnectInterval = options.autoReconnectInterval || 3000;
  this.connectTimeout = options.connectTimeout || 7000;
  this.disconnectedSince = this.startdate;
  if (options.link) {
   if (options.link.type === 'client' && !this.logger) {
    if (options.link.logger) this.logger = options.link.logger;
    else {
     const loggerID = `on port ${options.link.socket.address().port}`;
     this.logger = this.proxy.loggers[loggerID] || (new Logger({ ...options, loggerID }));
    }
   }
   const wait = options.initialLinkingDelay !== undefined ? options.initialLinkingDelay : 200; // Give VIP Mud enough time to load triggers before data starts pouring in.
   if (wait > 0) this.timers.set('initialLinkingDelay', () => this.proxy.link(options.link, this), wait);
   else this.proxy.link(options.link, this);
  }
  this.events.on('connect', () => this.socket.setTimeout(0));
  super.create(options);
  this.connect();
 }
 close(reconnect) {
  if (this.closed) return;
  if (reconnect && this.autoReconnect && (!this.connectionEnded || (this.lastLines.length > 1 && this.lastLines[this.lastLines.length - 2].startsWith('*** Server shutdown by ')))) {
   if (this.bytesReceivedSinceLastAutoReconnect !== this.bytesReceived) {
    this.bytesReceivedSinceLastAutoReconnect = this.bytesReceived;
    this.forward(`*** Auto reconnect in progress... ***`);
   }
   this.timers.set('reconnect', () => this.connect(), this.autoReconnectInterval - ((new Date()) - this.lastConnectionAttempt));
  }
  else super.close();
 }
 connect() {
  this.connectionEnded = false;
  this.connectionAttempts++;
  this.lastConnectionAttempt = new Date();
  const connectionArgs = [
   { host: this.host, port: this.port, family: this.ipVersion, rejectUnauthorized: false },
   () => {
    const { address, port } = this.socket.address();
    if (this.socket.authorized === false) {
     this.proxy.console(`TLS authorization error:`, this.socket.authorizationError);
     if (this.link) {
      this.link.respond(`TLS authorization error: ${this.socket.authorizationError}`);
      this.link.respond(`If you want to ignore this and connect to ${this.host} anyway, then type: px disregard`);
      this.socket.setTimeout(0);
     }
     else {
      this.socket.close();
     }
    }
    else {
     this.proxy.console(`${this.title} established ${this.socket.authorized === true ? 'secure ' : ''}connection with ${address} using port ${port}`);
     this.events.emit('connect');
    }
   },
  ];
  this.proxy.console(`${this.title} connecting to ${this.host} on port ${this.port}`);
  this.socket = this.tls ? tls.connect(...connectionArgs) : net.createConnection(...connectionArgs);
  this.socket.pause();
  if (this.connectTimeout) {
   this.socket.setTimeout(this.connectTimeout);
   this.socket.once('timeout', () => {
    this.proxy.console(`${this.title} connection timeout`);
    this.socket.destroy();
   });
  }
  if (this.tls) this.socket.on('tlsClientError', error => this.proxy.console(`${this.title} TLS error:`, error.message));
  this.applySocketOptions();
 }
 input(chunk) {
  if (!this.mudMixer && this.proxy.user.config.asciiDecodeHigh && !chunk.passThrough) chunk.data = filters.decode(chunk.data);
  super.input(chunk);
 }
 output(chunk) {
  if (!this.mudMixer && !chunk.passThrough && (this.proxy.user.config.asciiEncodeHigh || this.proxy.user.config.mapSpecialCP1252)) {
   chunk.data = filters.encode(chunk.data, { lowFilter: 0, highFilter: Number(this.proxy.user.config.asciiEncodeHigh), mapSpecial: this.proxy.user.config.mapSpecialCP1252 });
  }
  super.output(chunk);
 }
} 

module.exports = Server;
