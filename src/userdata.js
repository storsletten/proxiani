const fs = require('fs');
const os = require('os');
const path = require('path');

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
 logging: true,
 developerMode: false,
});

class UserData {
 constructor(options = {}) {
  this.proxy = options.proxy;
  if (options.dir) this.dir = options.dir;
  else if (process.argv.length > 2 && process.argv[2]) this.dir = path.isAbsolute(process.argv[2]) ? process.argv[2] : path.join(process.cwd(), process.argv[2]);
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
 }
 loadConfig() {
  const configFile = path.join(this.dir, this.configFile);
  this.config = JSON.parse(defaultConfigJSON);
  if (fs.existsSync(configFile)) {
   try {
    const configJSON = fs.readFileSync(configFile);
    const config = JSON.parse(configJSON);
    if (config && typeof config === 'object') {
     for (let key in config) {
      if (key in this.config) this.config[key] = config[key];
     }
    }
    else this.proxy.console(`Parsing the config.json file returned typeof ${typeof config}.`);
   }
   catch (error) {
    this.proxy.console(`Failed to load config.json:`, error);
   }
  }
  this.saveConfig();
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
  else {
   fs.writeFileSync(customFile, `// Custom.js for Proxiani
const custom = proxy => {
 return;
};

module.exports = custom;
`);
  }
 }
 save() {
  this.saveConfig();
 }
 saveConfig() {
  fs.writeFileSync(path.join(this.dir, this.configFile), JSON.stringify(this.config, null, 1));
 }
}

module.exports = UserData;
