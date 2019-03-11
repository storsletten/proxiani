const fs = require('fs');
const path = require('path');

const requireModules = dir => {
 if (fs.existsSync(dir)) {
  const modules = {};
  fs.readdirSync(dir).forEach(file => {
   if (file.endsWith('.js')) modules[file.slice(0, -3)] = require(path.join(dir, file));
  });
  return modules;
 }
};

class Middleware {
 constructor(options) {
  this.device = options.device;
  this.dir = options.dir || path.join(__dirname, this.device.type);
  this.defaultStateTimeout = options.defaultStateTimeout || 15000;
  this.load();
 }
 load(file) {
  if (this.states && this.dir) {
   for (let mod in require.cache) {
    if (mod.slice(0, this.dir.length) === this.dir) delete require.cache[mod];
   }
  }
  try {
   const extraFile = require.resolve(file || path.join(this.dir, 'extra.js'));
   this.dir = path.dirname(extraFile);
   ['commands', 'functions', 'triggers'].forEach(prop => this[prop] = requireModules(path.join(this.dir, prop)));
   this.persistentStates = {};
   require(extraFile)(this);
   if (this.states) {
    this.device.proxy.console(`Device ${this.device.id} reloaded its middleware`);
    this.clearStates();
   }
   else this.states = {};
   return true;
  }
  catch (error) {
   this.device.proxy.console(`Couldn't load middleware for device ${this.device.id}:`, error);
  }
 }
 setState(name, options, func) {
  if (typeof options === 'function') {
   func = options;
   options = {};
  }
  this.states[name] && this.states[name].reject && this.states[name].reject({ state: this.states[name], reason: 'reset' });
  return this.states[name] = {
   created: new Date(),
   timeout: this.defaultStateTimeout,
   func,
   data: {},
   ...options,
  };
 }
 setPromisedState(name, options, func) {
  if (typeof options === 'function') {
   func = options;
   options = {};
  }
  return new Promise((resolve, reject) => {
   this.setState(name, { resolve, reject, ...options }, func);
  });
 }
 clearStates() {
  for (let name in this.states) this.states[name].reject && this.states[name].reject({ state: this.states[name], reason: 'clear' });
  this.states = {};
 }
 process(input) {
  const data = {
   input: input.toString(this.device.encoding),
   forward: [input],
   respond: [],
   time: new Date(),
  };
  const linkedMiddleware = this.device.link && this.device.link.middleware;
  for (let name in this.states) {
   try {
    const state = this.states[name];
    const result = state.func && state.func(data, this, linkedMiddleware);
    const bits = typeof result === 'number' ? result : 0b11;
    if (bits & 0b10) {
     delete this.states[name];
     if (state.resolve && !(bits & 0b100)) state.resolve({ state, data });
     else if (state.reject) state.reject({ state, data, reason: 'abort' });
    }
    else if (state.timeout && ((new Date()) - state.created) > state.timeout) {
     delete this.states[name];
     state.reject && state.reject({ state, data, reason: 'timeout' });
    }
    if (bits & 0b01) return { state, data };
   }
   catch (error) {
    delete this.states[name];
    const proxy = this.device.proxy;
    proxy.console(`Middleware state "${name}" error in ${proxy.name} ${proxy.version}:`, error);
    state.reject && state.reject({ state, data, reason: error });
   }
  }
  try {
   if (this.triggers && (data.input in this.triggers) && this.triggers[data.input](data, this, linkedMiddleware) !== false) return { data };
   if (this.commands) {
    const m = data.input.match(/[^ ]+/);
    if (m) {
     const func = this.commands[m[0].toLowerCase()];
     if (func !== undefined && func(data, this, linkedMiddleware) !== false) return { data };
    }
   }
   if (this.functions) {
    for (let name in this.functions) {
     if (this.functions[name](data, this, linkedMiddleware) === true) return { data };
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
