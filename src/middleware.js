const path = require('path');

class Generic {
 constructor(options) {
  this.device = options.device;
  this.dir = options.dir || path.join(__dirname, '../middleware');
  this.defaultStateTimeout = options.defaultStateTimeout || 15000;
 }
 load(file) {
  try {
   const resolvedPath = require.resolve(file || path.join(this.dir, this.device.type));
   const dir = path.dirname(resolvedPath);
   if (resolvedPath in require.cache) {
    for (let mod in require.cache) {
     if (mod.slice(0, dir.length) === dir) delete require.cache[mod];
    }
   }
   const mod = require(resolvedPath);
   this.dir = dir;
   if (this.states) this.device.proxy.console(`Device ${this.device.id} reloaded its middleware`);
   this.states = {};
   this.persistentStates = {};
   Object.assign(this, mod);
   return true;
  }
  catch (error) {
   this.device.proxy.console(`Couldn't load middleware for device ${this.device.id}:`, error);
  }
 }
 isOOB(input) { return input.indexOf(this.device.oob) === 0; }
 setState(name, func, data = {}) {
  this.states[name] = {
   created: new Date(),
   timeout: this.defaultStateTimeout,
   func,
   data,
  };
 }
 setPersistentState(name, data) {
  this.persistentStates[name] = {
   created: new Date(),
   data: data,
  };
 }
 process(input) {
  const data = {
   input: String(input),
   forward: [input],
   respond: [],
   time: new Date(),
  };
  try {
   const linkedMiddleware = this.device.link.middleware;
   for (let name in this.states) {
    try {
     const state = this.states[name];
     const result = state.func(data, this, linkedMiddleware);
     if (result !== false || (state.timeout && ((new Date()) - state.created) > state.timeout)) delete this.states[name];
    }
    catch (error) {
     delete this.states[name];
     this.device.proxy.console(`Middleware state "${name}" error:`, error);
    }
    if (data.stopProcessing) return data;
   }
  }
  catch (error) {
   this.device.proxy.console(`Middleware error:`, error);
  }
  return data;
 }
}

class Client extends Generic {
 constructor(options) {
  super(options);
  this.load();
 }
 load(file) {
  return super.load(file);
 }
 process(input) {
  const data = super.process(input);
  if (data.stopProcessing) return data;
  try {
   const linkedMiddleware = this.device.link.middleware;
   const command = data.input.trimStart().split(' ', 1)[0].toLowerCase();
   if (command.length > 0 && (command in this.commands)) {
    data.command = data.input.trim().toLowerCase().split(' ').filter(word => word.length > 0);
    this.commands[command](data, this, linkedMiddleware);
    if (data.stopProcessing) return data;
   }
  }
  catch (error) {
   this.device.proxy.console(`Client Middleware error:`, error);
  }
  return data;
 }
}

class Server extends Generic {
 constructor(options) {
  super(options);
  this.load();
 }
 load(file) {
  return super.load(file);
 }
 process(input) {
  const data = super.process(input);
  if (data.stopProcessing) return data;
  try {
   const linkedMiddleware = this.device.link.middleware;
   if (data.input in this.triggers) {
    this.triggers[data.input](data, this, linkedMiddleware);
    if (data.stopProcessing) return data;
   }
  }
  catch (error) {
   this.device.proxy.console(`Server Middleware error:`, error);
  }
  return data;
 }
}

module.exports = {
 Generic,
 Client,
 Server,
};
