const childProcess = require('child_process');
const path = require('path');
const EventEmitter = require('events');
const utils = require('../utils.js');

class GenericDevice {
 constructor(options) {
  this.proxy = options.proxy;
  this.id = options.id || this.proxy.getNewID();
  this.type = options.type || this.constructor.name.toLowerCase();
  this.title = `${this.constructor.name} ${this.id}`;
  this.proxy.devices[this.id] = this;
  this.proxy.devicesCount++;
  this.events = new EventEmitter();
  this.keepAlive = options.keepAlive !== undefined ? options.keepAlive : 3000;
  this.bytesReceived = 0;
  this.bytesSent = 0;
  this.responsePipes = options.responsePipes || [];
  this.forwardPipes = options.forwardPipes || [];
  this.timers = new utils.Timers();
  this.workers = {};
  this.encoding = options.encoding || 'binary';
  this.inputProtocols = [];
  this.outputProtocols = [];
  this.startdate = new Date();
  this.connected = false;
  this.events.on('connect', () => {
   this.connected = true;
   this.connectedSince = new Date();
   if (this.link) this.events.emit('ready');
  });
  this.events.on('disconnect', () => {
   if (this.connected || !this.disconnectedSince) this.disconnectedSince = new Date();
   this.connected = false;
   if (this.connectionAttempts) this.connectionAttempts = 0;
  });
  this.events.on('link', () => this.connected && this.events.emit('ready'));
  this.events.on('ready', () => {
   this.socket.resume();
   if (this.type === 'server' && this.link && this.link.type === 'client') {
    if (!this.mudMixer && this.link.mudMixer) this.mudMixer = this.link.mudMixer;
    if (!this.hasRegisteredSoundpack && this.link.soundpack) {
     this.hasRegisteredSoundpack = true;
     this.respond(`register_soundpack ${this.link.soundpack.name || 'unknown'} | ${this.link.soundpack.version || 'unknown'}`);
    }
    if (this.link.lastConnectCommand) this.respond(this.link.lastConnectCommand);
   }
  });
  this.create(options);
 }
 create(options) {
  this.proxy.events.emit(`${this.type}Created`, this);
 }
 close() {
  if (this.closed) return;
  this.closed = true;
  if (this.socket) this.socket.destroy();
  else this.unref();
 }
 unref() {
  this.timers.clear();
  for (let name in this.workers) this.closeWorker(name);
  this.proxy.unlink(this);
  this.proxy.console(`${this.title} closed`);
  this.events.emit('close');
  ['inputProtocols', 'outputProtocols'].forEach(proto => {
   delete this[proto].device;
   delete this[proto];
  });
  ['events', 'responsePipes', 'forwardPipes'].forEach(prop => delete this[prop]);
  delete this.proxy.devices[this.id];
  this.proxy.devicesCount--;
  if (this.proxy.devicesCount === 0) {
   if (this.proxy.socketsCount === 0) this.proxy.events.emit('close');
   else if (this.proxy.outdated) this.proxy.close(true);
  }
  delete this.proxy;
 }
 applySocketOptions() {
  if (this.keepAlive) this.socket.setKeepAlive(true, this.keepAlive);
  else this.socket.setKeepAlive(false);
  this.socket.on('error', error => this.proxy.console(`${this.title} socket error:`, error.message));
  this.socket.on('end', () => this.connectionEnded = true);
  this.socket.on('close', () => {
   this.proxy.console(`${this.title} socket closed.`);
   this.socket.unref();
   delete this.socket;
   if (this.connected) this.events.emit('disconnect');
   if (this.closed) this.unref();
   else this.close(true);
  });
  this.socket.on('data', data => {
   try {
    this.inputProtocols.reduce((chunks, protocol) => chunks.reduce((chunks, chunk) => {
     if (chunk.forward) this.link && this.link.output(chunk);
     else if (chunk.respond) this.output(chunk);
     else if (chunk.passThrough || !protocol.incoming) chunks.push(chunk);
     else return chunks.concat(protocol.incoming(chunk));
     return chunks;
    }, []), [{ data }]).forEach(chunk => this.input(chunk));
    this.bytesReceived += data.length;
   }
   catch (error) {
    this.proxy.console(`${this.title} input error:`, error);
    this.socket.destroy();
   }
  });
 }
 input(chunk) { this.forward(chunk.data); }
 output(chunk) {
  if (!this.socket) return;
  try {
   this.outputProtocols.reduce((chunks, protocol) => chunks.reduce((chunks, chunk) => {
    if (chunk.passThrough || !protocol.outgoing) chunks.push(chunk);
    else return chunks.concat(protocol.outgoing(chunk));
    return chunks;
   }, []), [chunk]).forEach(chunk => {
    this.socket.write(chunk.data);
    this.bytesSent += chunk.data.length;
   });
  }
  catch (error) {
   this.proxy.console(`${this.title} output error:`, error);
   this.socket && this.socket.destroy();
  }
 }
 respond(data) {
  if (this.connected) {
   if (!Buffer.isBuffer(data)) data = Buffer.from(typeof data === 'object' ? JSON.stringify(data, null, 1) : (typeof data === 'string' ? data : String(data)), this.encoding);
   this.output({ data });
   if (this.responsePipes.length > 0) {
    this.responsePipes = this.responsePipes.filter(device => {
     if (!device.proxy) return false;
     if (device.connected) device.output({ data });
     return true;
    });
   }
  }
 }
 forward(data) {
  if (this.link && this.link.connected) {
   if (!Buffer.isBuffer(data)) data = Buffer.from(typeof data === 'object' ? JSON.stringify(data, null, 1) : (typeof data === 'string' ? data : String(data)), this.encoding);
   this.link.output({ data });
   if (this.forwardPipes.length > 0) {
    this.forwardPipes = this.forwardPipes.filter(device => {
     if (!device.proxy) return false;
     if (device.connected) device.output({ data });
     return true;
    });
   }
  }
 }
 on(...args) { this.events.on(...args); }
 worker(name, args = [], options = {}) {
  this.closeWorker(name);
  const worker = childProcess.fork(path.join(this.proxy.dir, 'src', 'workers', `${name}.js`), args, options);
  this.workers[name] = worker;
  worker.on('message', message => message.error && worker.emit('error', message.error));
  worker.on('error', error => worker === this.workers[name] && this.closeWorker(name, error));
  worker.on('exit', code => worker === this.workers[name] && this.closeWorker(name, code && `Exit code ${code}`));
  return worker;
 }
 closeWorker(name, reason) {
  const worker = this.workers[name];
  if (!worker) return;
  delete this.workers[name];
  if (worker.connected) {
   worker.kill();
   worker.disconnect();
  }
  worker.unref();
  if (reason) this.proxy.console(`Device ${this.id} ${name} worker closed because:`, reason);
 }
} 

module.exports = GenericDevice;
