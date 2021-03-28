const childProcess = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const Client = require('./devices/client.js');
const User = require('./user.js');
const utils = require('./utils.js');

class Proxy {
 constructor(options = {}) {
  this.startdate = new Date();
  this.startupParameters = {};
  this.consoleLog = [];
  this.consoleLogMaxSize = options.consoleLogMaxSize || 25;
  this.idCount = 0;
  this.devices = {};
  this.devicesCount = 0;
  this.loggers = {};
  this.loggersCount = 0;
  this.sockets = {};
  this.socketsCount = 0;
  this.listeners = [];
  this.workers = {};
  this.fileWatchers = {};
  this.timers = {};
  this.events = new EventEmitter();
  this.restartRequested = false;
  process.on('beforeExit', () => this.close());
  process.setUncaughtExceptionCaptureCallback(error => {
   console.log(error);
   try { utils.msgBox(String(error)); }
   catch (error) {}
   process.exit(1);
  });
  if (process.argv.length > 2) {
   let last = '';
   for (let i=2; i<process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.length === 2 && arg[0] === '-') {
     last = arg[1];
     this.startupParameters[last] = true;
    }
    else if (typeof this.startupParameters[last] === 'string') this.startupParameters[last] += ' ' + arg;
    else this.startupParameters[last] = arg;
   }
  }
  this.dir = path.dirname(__dirname);
  this.packageInfoFile = options.packageInfoFile || path.join(__dirname, '..', 'package.json');
  this.loadPackageInfo();
  process.title = `${this.name} ${this.version}`;
  this.console(`Starting ${this.name} ${this.version}`);
  this.user = options.user || (new User({ proxy: this }));
  this.events.on('close', () => {
   this.isClosing = true;
   for (let name in this.fileWatchers) {
    this.fileWatchers[name].close();
    delete this.fileWatchers[name];
   }
   for (let name in this.timers) {
    clearTimeout(this.timers[name]);
    delete this.timers[name];
   }
   for (let name in this.workers) this.closeWorker(name);
   for (let id in this.loggers) this.loggers[id].close();
   this.user.save();
   if (this.restartRequested) {
    this.console(`Restarting ${this.name}`);
    for (let mod in require.cache) delete require.cache[mod];
    setTimeout(() => {
     if (process.listeners('beforeExit').length > 1) process.emit('beforeExit');
     process.removeAllListeners('beforeExit');
     process.setUncaughtExceptionCaptureCallback(null);
     global.proxianiRestarted = true;
     const proxy = require('./main.js');
     if (Array.isArray(proxy.consoleLog) && proxy.consoleLog.unshift(...this.consoleLog) > proxy.consoleLogMaxSize) {
      proxy.consoleLog.splice(0, proxy.consoleLog.length - proxy.consoleLogMaxSize);
     }
    }, 50);
   }
   else {
    this.console(`Shutting down ${this.name}`);
    if (this.listeners.length === 0 && (!this.startupParameters.q || global.proxianiRestarted)) utils.msgBox(`${this.name} seems to be running already.`);
   }
   delete this.events;
   delete this.devices;
   delete this.sockets;
   delete this.user.proxy;
   delete this.user;
  });
  if (this.user && Array.isArray(this.user.config.proxyListen)) this.user.config.proxyListen.forEach(options => this.listen(options));
  this.fileWatchers.packageInfo = fs.watch(this.packageInfoFile, { persistent: false }, eventType => {
   if (this.timers.packageInfoFileWatcher) return;
   this.timers.packageInfoFileWatcher = setTimeout(() => {
    try {
     this.loadPackageInfo();
     if (this.outdated) {
      if (this.devicesCount > 0) {
       for (let id in this.devices) {
        const device = this.devices[id];
        if (device.type === 'client') device.respond(`*** New ${this.outdated} update for ${this.name}: ${this.latestVersion} ***`);
       }
      }
      else this.close(true);
     }
    }
    catch (error) {
     this.console(error);
     this.fileWatchers.packageInfo.close();
     delete this.fileWatchers.packageInfo;
    }
    this.timers.packageInfoFileWatcher = setTimeout(() => delete this.timers.packageInfoFileWatcher, 2000);
   }, 1000);
  });
 }
 link(device1, device2) {
  if (device1 === device2) throw `Can't link device ${device1.id} to itself`;
  if (device1.link) {
   if (device1.link === device2 && device2.link === device1) return;
   else this.unlink(device1);
  }
  device1.link = device2;
  device2.link = device1;
  this.console(`Linked devices ${device1.id} and ${device2.id}`);
  device1.events.emit('link');
  device2.events.emit('link');
 }
 unlink(device) {
  if (!device.link) return;
  this.console(`Unlinked devices ${device.id} and ${device.link.id}`);
  device.events.emit('unlink');
  device.link.events.emit('unlink');
  device.middleware.clearStates();
  device.link.middleware.clearStates();
  device.middleware.persistentStates = {};
  device.link.middleware.persistentStates = {};
  delete device.link.link;
  delete device.link;
 }
 loadPackageInfo() {
  const packageInfo = JSON.parse(fs.readFileSync(this.packageInfoFile));
  this.name = packageInfo.name.replace(/\b\w/g, l => l.toUpperCase());
  this.latestVersion = packageInfo.version;
  if (!this.version) this.version = packageInfo.version;
  else if (this.version !== this.latestVersion) {
   const current = this.version.split('.');
   const latest = this.latestVersion.split('.');
   this.outdated = ['major', 'minor', 'patch'].find((t, i) => current[i] !== latest[i]);
  }
  else this.outdated = '';
 }
 console(...data) {
  try {
   const error = data.find(item => typeof item === 'object' && typeof item.stack === 'string');
   const d = new Date();
   const date = utils.formatDate(d);
   const time = utils.formatTime(d);
   let gotDate = false;
   const getDate = () => {
    gotDate = true;
    return date;
   };
   console.log(date, time, ...data);
   const msg = (
    data.map(x => typeof x === 'object' && typeof x.stack === 'string' ? `${x.stack.split("\n").filter(line => line.length > 0).slice(0, 5).join("\r\n")}...\r\n    on ${getDate()}, at ${time}` : x)
    .join(' ')
    + (gotDate ? '' : `, at ${time}, on ${date}`)
   );
   if (this.consoleLog.length >= this.consoleLogMaxSize) this.consoleLog.shift();
   this.consoleLog.push(msg);
   if (error) {
    for (let id in this.devices) {
     const device = this.devices[id];
     if (device.type === 'client') {
      device.respond('#$#px error');
      if (this.user.config.developerMode) device.respond(msg);
      else device.respond(`${this.name} error!`);
     }
    }
   }
  }
  catch (error) {
   console.log(error);
   process.exit();
  }
 }
 close(restart = this.restartRequested) {
  this.restartRequested = restart;
  if (this.isClosing) return;
  this.isClosing = true;
  if (this.devicesCount === 0 && this.socketsCount === 0) {
   this.events.emit('close');
   return;
  }
  for (let id in this.sockets) this.sockets[id].close();
  for (let id in this.devices) {
   const device = this.devices[id];
   if (device.type === 'client') {
    device.respond(`*** PX ${restart ? 'restarting' : 'shutting down'} ***`);
    device.respond(`*** Disconnected ***`);
   }
   device.close();
  }
 }
 getNewID() {
  return String(++this.idCount);
 }
 listen(options) {
  const id = this.getNewID();
  const title = `Proxy ${id}`;
  const socket = net.createServer({ pauseOnConnect: true });
  this.sockets[id] = socket;
  this.socketsCount++;
  socket.on('connection', clientSocket => {
   const { address, port, family } = clientSocket.address();
   const clientID = this.getNewID();
   this.console(`Client ${clientID} connected to ${title} from ${address} on port ${port}`);
   const client = new Client({
    proxy: this,
    id: clientID,
    socket: clientSocket,
    //loggerID: `on port ${port}`,
   });
  });
  socket.on('error', error => {
   this.console(`${title} socket error:`, error);
  });
  socket.on('close', () => {
   if (this.listeners.includes(id)) this.console(`${title} stopped listening for incoming connections`);
   socket.unref();
   delete this.sockets[id];
   this.socketsCount--;
   if (this.socketsCount === 0 && this.devicesCount === 0) this.events.emit('close');
  });
  socket.on('listening', () => {
   const { address, port, family } = socket.address();
   this.console(`${title} started listening on port ${port} (${family} address ${address})`);
   if (this.listeners.push(id) === 1 && !this.startupParameters.q && !global.proxianiRestarted) utils.msgBox(`Started ${this.name} ${this.version}.`);
  });
  socket.listen({
   host: options.host,
   port: options.port,
  });
 }
 worker(name, args = [], options = {}) {
  this.closeWorker(name);
  const worker = childProcess.fork(path.join(__dirname, 'workers', `${name}.js`), args, options);
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
  if (reason) this.console(`Proxy worker ${name} closed because:`, reason);
 }
 on(...args) {
  this.events.on(...args);
 }
}

module.exports = Proxy;
