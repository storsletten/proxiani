const fs = require('fs');
const os = require('os');
const path = require('path');

const defaultConfigJSON = JSON.stringify({
 textEditor: 'notepad.exe',
 logging: true,
 developerMode: false,
 asciiEncodeHigh: true,
 asciiDecodeHigh: true,
 mapSpecialCP1252: true,
 proxyListen: [
  {
   host: 'localhost',
   port: 1234,
  },
  {
   host: 'localhost',
   port: 1236,
  },
  {
   host: 'localhost',
   port: 8888,
  },
 ],
 server: {
  host: 'toastsoft.net',
  port: 1443,
  tls: true,
  ipVersion: 0,
  autoReconnect: true,
  autoReconnectInterval: 3000,
 },
 server8888: {
  host: 'toastsoft.net',
  port: 8443,
  tls: true,
  ipVersion: 0,
  autoReconnect: true,
  autoReconnectInterval: 3000,
 },
 chatServer: {
  host: '',
  port: 1235,
  username: '',
  password: '',
  tls: false,
  autoConnect: true,
  fingerprints: [],
 },
});

class User {
 constructor(options = {}) {
  this.proxy = options.proxy;
  if (options.dir) this.dir = options.dir;
  else if (typeof this.proxy.startupParameters.d === 'string') this.dir = path.isAbsolute(this.proxy.startupParameters.d) ? this.proxy.startupParameters.d : path.join(process.cwd(), this.proxy.startupParameters.d);
  else if (typeof this.proxy.startupParameters[''] === 'string') this.dir = path.isAbsolute(this.proxy.startupParameters['']) ? this.proxy.startupParameters[''] : path.join(process.cwd(), this.proxy.startupParameters['']);
  else {
   const dir = path.join(os.homedir(), 'Documents');
   this.dir = path.join(dir, fs.existsSync(dir) ? '.' : '..', 'Proxiani');
  }
  this.dataFile = 'Data.json';
  this.configFile = 'Config.json';
  this.customFile = 'Custom.js';
  this.logDir = 'Logs';
  this.tmpDir = 'Temporary files';
  this.load();
  if (options.config) Object.assign(this.config, options.config);
 }
 load() {
  [this.dir].forEach(dir => {
   if (!fs.existsSync(dir) || !fs.lstatSync(dir).isDirectory()) fs.mkdirSync(dir);
  });
  this.loadConfig();
  this.loadData();
  this.loadCustom();
  this.proxy.fileWatchers.config = fs.watch(path.join(this.dir, this.configFile), { persistent: false }, eventType => {
   if (this.proxy.timers.configFileWatcher) return;
   this.proxy.timers.configFileWatcher = setTimeout(() => {
    delete this.proxy.timers.configFileWatcher;
    this.loadConfig();
   }, 1000);
  });
 }
 loadData() {
  const dataFile = path.join(this.dir, this.dataFile);
  if (fs.existsSync(dataFile)) {
   try {
    const data = JSON.parse(fs.readFileSync(dataFile));
    if (data && typeof data === 'object') {
     this.data = data;
     return;
    }
    throw `Invalid data`;
   }
   catch (error) {
    this.proxy.console(`Failed to load ${this.dataFile}:`, error);
   }
  }
  this.data = {};
  this.saveData();
 }
 loadConfig() {
  const configFile = path.join(this.dir, this.configFile);
  const oldConfig = this.config;
  this.config = JSON.parse(defaultConfigJSON);
  if (fs.existsSync(configFile)) {
   try {
    const configJSON = fs.readFileSync(configFile);
    const config = JSON.parse(configJSON);
    if (config && typeof config === 'object') {
     if (deepUpdateObject(this.config, config)) this.saveConfig();
    }
    else this.proxy.console(`Parsing the config.json file returned typeof ${typeof config}.`);
   }
   catch (error) {
    if (oldConfig) this.config = oldConfig;
    this.proxy.console(`Failed to load config.json:`, error);
   }
  }
  else this.saveConfig();
 }
 loadCustom() {
  const customFile = path.join(this.dir, this.customFile);
  if (fs.existsSync(customFile)) {
   try {
    const resolvedCustomFile = require.resolve(customFile);
    if (resolvedCustomFile in require.cache) delete require.cache[resolvedCustomFile];
    const custom = require(resolvedCustomFile);
    if (custom && typeof custom === 'function') custom(this.proxy);
   }
   catch (error) {
    this.proxy.console(error);
   }
  }
  else this.saveDefaultCustomFile();
 }
 save() {
  this.saveData();
  this.saveConfig();
 }
 saveData() {
  try {
   fs.writeFileSync(path.join(this.dir, this.dataFile), JSON.stringify(this.data));
  }
  catch (error) {
   this.proxy.console(`Failed to save ${this.dataFile}:`, error);
  }
 }
 saveConfig() {
  if (this.proxy.fileWatchers.config && !this.proxy.timers.configFileWatcher) this.proxy.timers.configFileWatcher = setTimeout(() => delete this.proxy.timers.configFileWatcher, 1000);
  try {
   fs.writeFileSync(path.join(this.dir, this.configFile), JSON.stringify(this.config, null, 1));
   this.proxy.console(`Saved ${this.configFile}`);
  }
  catch (error) {
   this.proxy.console(`Failed to save ${this.configFile}:`, error);
  }
 }
 saveDefaultCustomFile() {
  const customFile = path.join(this.dir, this.customFile);
  try {
   fs.writeFileSync(customFile, `// Custom.js for Proxiani
const custom = proxy => {
 return;
};

module.exports = custom;
`);
   this.proxy.console(`Saved default ${this.customFile} file`);
  }
  catch (error) {
   this.proxy.console(`Failed to save ${this.customFile}:`, error);
  }
 }
}

const deepUpdateObject = (object, newData) => {
 // Returns the missing variable which indicates whether newData is missing any keys that the object has.
 // It will not do the same if keys are missing in the object because there's no point updating the config file with keys that are already there.
 let missing = 0;
 if (Array.isArray(object)) {
  if (!Array.isArray(newData) || newData.length === 0) missing++;
  else object.splice(0, object.length, ...newData);
 }
 else {
  for (let key in object) {
   if (key in newData) {
    if (typeof object[key] === "object") {
     if (typeof newData[key] === "object") missing += deepUpdateObject(object[key], newData[key]);
     else missing++;
    }
    else object[key] = newData[key];
   }
   else missing++;
  }
  // Now we load new keys onto the object that don't exist in default config.
  for (let key in newData) {
   if (!(key in object)) object[key] = newData[key];
  }
 }
 return missing;
};

module.exports = User;
