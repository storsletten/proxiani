const net = require('net');
const path = require('path');
const EventEmitter = require('events');
const Device = require('./device');
const UserData = require('./userdata');
const utils = require('./utils');
const packageInfo = require('../package.json');

class Proxy {
 constructor(options = {}) {
  this.name = packageInfo.name;
  this.version = packageInfo.version;
  this.idCount = 0;
  this.devices = {};
  this.sockets = {};
  this.socketsCount = 0;
  this.dir = path.dirname(__dirname);
  this.events = new EventEmitter();
  this.userData = options.userData || (new UserData({ proxy: this }));
  this.consoleLog = [];
  this.consoleLogMaxSize = options.consoleLogMaxSize || 10;
  this.restartRequested = false;
  this.console(`Started Proxiani ${this.version}`);
  this.events.on('close', () => {
   if (this.restartRequested) {
    this.console(`Restarting Proxiani...`);
    for (let mod in require.cache) delete require.cache[mod];
    try {
     require('../server.js');
    }
    catch (error) {
     console.log(`Fatal error:`, error);
    }
   }
   else {
    this.console(`Shutting down Proxiani`);
   }
   delete this.events;
   delete this.devices;
   delete this.sockets;
   delete this.userData.proxy;
   delete this.userData;
  });
  if (this.userData) {
   try {
    if (this.userData.config.proxyListen) this.userData.config.proxyListen.forEach(options => this.listen(options));
   }
   catch (error) {}
  }
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
  device.middleware.states = {};
  device.link.middleware.states = {};
  device.middleware.persistentStates = {};
  device.link.middleware.persistentStates = {};
  delete device.link.link;
  delete device.link;
 }
 console(...data) {
  const d = new Date();
  const date = utils.formatDate(d);
  const time = utils.formatTime(d);
  let gotDate = false;
  const getDate = () => {
   gotDate = true;
   return date;
  }
  console.log(date, time, ...data);
  if (this.consoleLog.length >= this.consoleLogMaxSize) this.consoleLog.shift();
  this.consoleLog.push(
   data.map(x => typeof x === 'object' && typeof x.stack === 'string' ? `${x.stack.split("\n").filter(line => line.length > 0).slice(0, 5).join("\r\n")}...\r\n    on ${getDate()}, at ${time}` : x)
   .join(' ')
   + (gotDate ? '' : `, at ${time}, on ${date}`)
  );
 }
 close() {
  for (let id in this.sockets) this.sockets[id].close();
  for (let id in this.devices) this.devices[id].close();
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
  socket.on('connection', deviceSocket => {
   const { address, port, family } = deviceSocket.address();
   const deviceID = this.getNewID();
   this.console(`Device ${deviceID} connected to ${title} from ${address} on port ${port}`);
   const device = new Device({
    proxy: this,
    id: deviceID,
    socket: deviceSocket,
    loggerID: `on port ${port}`,
   });
  });
  socket.on('error', error => {
   this.console(`${title} socket error: ${error}`);
  });
  socket.on('close', () => {
   socket.unref();
   delete this.sockets[id];
   setTimeout(() => {
    this.console(`${title} closed`);
    if ((--this.socketsCount) === 0) this.events.emit('close');
   }, 250);
  });
  socket.on('listening', () => {
   const { address, port, family } = socket.address();
   this.console(`${title} started listening on port ${port} (${family} address ${address})`);
  });
  socket.listen({
   host: options.host,
   port: options.port,
  });
 }
 on(...args) {
  this.events.on(...args);
 }
}

module.exports = Proxy;
