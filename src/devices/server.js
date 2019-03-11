const net = require('net');
const tls = require('tls');
const TelnetDevice = require('./telnet.js');
const Logger = require('../logger.js');

class Server extends TelnetDevice {
 constructor(options) {
  super(options);
  this.host = options.host;
  this.port = options.port;
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
  if (Server.name === this.constructor.name) this.proxy.events.emit(`${this.type}Created`, this);
  this.connect();
 }
 close(reconnect) {
  if (this.closed) return;
  if (reconnect && (!this.connectionEnded || (this.lastLines.length > 1 && this.lastLines[this.lastLines.length - 2].startsWith('*** Server shutdown by ')))) {
   if (this.connectionAttempts === 0) {
    if ((this.disconnectedSince - this.connectedSince) > 2500) this.forward(`*** Auto reconnect in progress... ***`);
   }
   else if (this.connectionAttempts === 1 && !this.connectedSince) this.forward(`*** Connection to ${this.host} on port ${this.port} failed. Auto reconnect in progress... ***`);
   this.timers.set('reconnect', () => this.connect(), this.autoReconnectInterval - ((new Date()) - this.lastConnectionAttempt));
  }
  else super.close();
 }
 connect() {
  this.connectionEnded = false;
  this.connectionAttempts++;
  this.lastConnectionAttempt = new Date();
  const connectionArgs = [
   { host: this.host, port: this.port },
   () => {
    const { address, port } = this.socket.address();
    this.proxy.console(`${this.title} established ${this.socket.authorized === true ? 'secure ' : ''}connection with ${address} using port ${port}`);
    if (this.socket.authorized === false) this.proxy.console(`TLS authorization error:`, this.socket.authorizationError);
    this.events.emit('connect');
   },
  ];
  this.proxy.console(`${this.title} connecting to ${this.host} on port ${this.port}`);
  this.socket = this.tls ? tls.connect(...connectionArgs) : net.createConnection(...connectionArgs);
  if (!this.link) this.socket.pause();
  if (this.connectTimeout) {
   this.socket.setTimeout(this.connectTimeout);
   this.socket.once('timeout', () => {
    this.proxy.console(`${this.title} connection timeout`);
    this.socket.destroy();
   });
  }
  this.applySocketOptions();
 }
 input(chunk) {
  if (!chunk.passThrough) chunk.data = decode(chunk);
  super.input(chunk);
 }
 output(chunk) {
  if (!chunk.passThrough) chunk.data = encode(chunk);
  super.output(chunk);
 }
} 

const encode = ({ data, lowFilter = 0, highFilter = 1 }) => {
 if (data.length === 0) return data;
 const buffers = [];
 let mode;
 let start = 0;
 for (let i=0; i<data.length; i++) {
  if (data[i] < 32) mode = lowFilter;
  else if (data[i] > 127) mode = highFilter;
  else mode = 0;
  if (mode > 0) {
   if (start !== i) buffers.push(data.slice(start, i));
   start = i + 1;
   if (mode === 1) buffers.push(Buffer.from(`%${data[i].toString(16)}`));
  }
 }
 if (start !== data.length) buffers.push(data.slice(start));
 return buffers.length === 1 ? buffers[0] : Buffer.concat(buffers);
};
const decode = ({ data, lowFilter = 2, highFilter = 1 }) => {
 if (data.length === 0) return data;
 const buffers = [];
 let mode;
 let start = 0;
 let i = 0;
 while ((i = data.indexOf(37, i)) !== -1 && (i + 2) < data.length) {
  const end = i;
  let v = data[++i];
  if (v < 48 || v > 102 || (v > 57 && v < 97)) continue;
  v = data[++i];
  if (v < 48 || v > 102 || (v > 57 && v < 97)) continue;
  v = parseInt(data.slice(end + 1, ++i), 16);
  if (v < 32) mode = lowFilter;
  else if (v > 127) mode = highFilter;
  else mode = 0;
  if (mode > 0) {
   if (start !== end) buffers.push(data.slice(start, end));
   start = i;
   if (mode === 1) buffers.push(Buffer.from([v]));
  }
 }
 if (start !== data.length) buffers.push(data.slice(start));
 return buffers.length === 1 ? buffers[0] : Buffer.concat(buffers);
};

module.exports = Server;
