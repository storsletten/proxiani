const fs = require('fs');
const os = require('os');
const path = require('path');
const util = require('util');

const writeFile = util.promisify(fs.writeFile);

const defaultConfigJSON = JSON.stringify({
 proxyListen: [
  {
   host: 'localhost',
   port: 1234,
  },
  {
   host: 'localhost',
   port: 1236,
  },
 ],
 server: {
  host: 'toastsoft.net',
  port: 1443,
  tls: true,
  autoReconnect: true,
  autoReconnectInterval: 3000,
 },
 textEditor: 'notepad.exe',
 logging: true,
 developerMode: false,
});

class UserData {
 constructor(options = {}) {
  this.proxy = options.proxy;
  if (options.dir) this.dir = options.dir;
  else if (typeof this.proxy.startupParameters.d === 'string') this.dir = path.isAbsolute(this.proxy.startupParameters.d) ? this.proxy.startupParameters.d : path.join(process.cwd(), this.proxy.startupParameters.d);
  else if (typeof this.proxy.startupParameters[''] === 'string') this.dir = path.isAbsolute(this.proxy.startupParameters['']) ? this.proxy.startupParameters[''] : path.join(process.cwd(), this.proxy.startupParameters['']);
  else {
   const dir = path.join(os.homedir(), 'Documents');
   this.dir = path.join(dir, fs.existsSync(dir) ? '.' : '..', 'Proxiani');
  }
  this.configFile = 'Config.json';
  this.customFile = 'Custom.js';
  this.logDir = 'Logs';
  this.load();
  if (options.config) Object.assign(this.config, options.config);
 }
 load() {
  [this.dir].forEach(dir => {
   if (!fs.existsSync(dir) || !fs.lstatSync(dir).isDirectory()) fs.mkdirSync(dir);
  });
  this.loadConfig();
  this.loadCustom();
  this.configFileWatcher = fs.watch(path.join(this.dir, this.configFile), { persistent: false }, eventType => {
   if (this.configFileWatcherTimeout) return;
   this.configFileWatcherTimeout = setTimeout(() => {
    delete this.configFileWatcherTimeout;
    this.loadConfig();
   }, 1000);
  });
 }
 loadConfig() {
  const configFile = path.join(this.dir, this.configFile);
  this.config = JSON.parse(defaultConfigJSON);
  if (fs.existsSync(configFile)) {
   try {
    const configJSON = fs.readFileSync(configFile);
    const config = JSON.parse(configJSON);
    if (config && typeof config === 'object') {
     let updateConfigFile = false;
     for (let key in this.config) {
      if (!(key in config)) {
       updateConfigFile = true;
       break;
      }
     }
     for (let key in config) {
      if (key in this.config) this.config[key] = config[key];
     }
     if (updateConfigFile) this.saveConfig();
    }
    else this.proxy.console(`Parsing the config.json file returned typeof ${typeof config}.`);
   }
   catch (error) {
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
 async save() {
  await this.saveConfig();
 }
 async saveConfig() {
  if (this.configFileWatcher && !this.configFileWatcherTimeout) this.configFileWatcherTimeout = setTimeout(() => delete this.configFileWatcherTimeout, 1000);
  try {
   await writeFile(path.join(this.dir, this.configFile), JSON.stringify(this.config, null, 1));
   this.proxy.console(`Saved ${this.configFile}`);
  }
  catch (error) {
   this.proxy.console(`Failed to save ${this.configFile}:`, error);
  }
 }
 async saveDefaultCustomFile() {
  const customFile = path.join(this.dir, this.customFile);
  try {
   await writeFile(customFile, `// Custom.js for Proxiani
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

module.exports = UserData;
