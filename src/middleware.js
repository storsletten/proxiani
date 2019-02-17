const path = require('path');

class Middleware {
 constructor(options) {
  this.device = options.device;
  this.dir = options.dir || path.join(__dirname, '..', 'middleware', this.device.type);
  this.defaultStateTimeout = options.defaultStateTimeout || 15000;
  this.load();
 }
 load(file) {
  try {
   const resolvedPath = require.resolve(file || path.join(this.dir, 'index.js'));
   const dir = path.dirname(resolvedPath);
   if (this.states) {
    for (let mod in require.cache) {
     if (mod.slice(0, dir.length) === dir) delete require.cache[mod];
    }
   }
   const mod = require(resolvedPath);
   this.dir = dir;
   if (this.states) {
    this.device.proxy.console(`Device ${this.device.id} reloaded its middleware`);
    delete this.commands;
    delete this.funcs;
    delete this.triggers;
   }
   this.states = {};
   this.persistentStates = {};
   Object.assign(this, mod);
   return true;
  }
  catch (error) {
   this.device.proxy.console(`Couldn't load middleware for device ${this.device.id}:`, error);
  }
 }
 setState(name, func, data = {}) {
  const state = {
   created: new Date(),
   timeout: this.defaultStateTimeout,
   func,
   data,
  };
  this.states[name] = state;
  return state;
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
     const bits = typeof result === 'number' ? result : 0b11;
     if (bits & 0b10 || (state.timeout > 0 && ((new Date()) - state.created) > state.timeout)) delete this.states[name];
     if (bits & 0b01) return { data, state };
    }
    catch (error) {
     delete this.states[name];
     const proxy = this.device.proxy;
     proxy.console(`Middleware state "${name}" error in ${proxy.name} ${proxy.version}:`, error);
    }
   }
   if (this.triggers && (data.input in this.triggers) && this.triggers[data.input](data, this, linkedMiddleware) !== false) return { data };
   if (this.commands) {
    const m = data.input.match(/[^ ]+/);
    if (m && (m[0].toLowerCase() in this.commands)) {
     data.command = data.input.trim().replace(/\s+/g, ' ').toLowerCase().split(' ');
     if (this.commands[data.command[0]](data, this, linkedMiddleware) !== false) return { data };
    }
   }
   if (this.funcs) {
    for (let i=0; i<this.funcs.length; i++) {
     const result = this.funcs[i](data, this, linkedMiddleware);
     if (result !== false) return { data };
    }
   }
  }
  catch (error) {
   this.device.proxy.console(`Middleware error:`, error);
  }
  return { data };
 }
}

module.exports = Middleware;
