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
});

class UserData {
 constructor(options = {}) {
  this.proxy = options.proxy;
  if (options.dir) this.dir = options.dir;
  else {
   const dir = path.join(os.homedir(), 'Documents');
   if (fs.existsSync(dir)) this.dir = path.join(dir, 'Proxiani');
   else path.join(dir, '..', 'Proxiani');
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
    if (config && typeof config === 'object') Object.assign(this.config, config);
   }
   catch (error) {
    this.proxy.console(error);
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
