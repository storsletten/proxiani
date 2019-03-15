const protocols = require('../protocols.js');
const GenericDevice = require('./generic.js');
const Middleware = require('../middleware/index.js');
const Logger = require('../logger.js');

class TelnetDevice extends GenericDevice {
 create(options) {
  this.maxLastLines = options.maxLastLines || 10;
  this.lastLines = [];
  if (options.loggerID) this.logger = this.proxy.loggers[options.loggerID] || (new Logger(options));
  const lineProtocol = new protocols.Line(options);
  const telnetProtocol = new protocols.Telnet(options);
  this.inputProtocols.push(telnetProtocol, lineProtocol);
  this.outputProtocols.push(lineProtocol);
  this.middleware = new Middleware({ device: this });
  super.create(options);
 }
 unref() {
  super.unref();
  delete this.middleware.device;
  delete this.middleware;
  if (this.logger) delete this.logger;
 }
 input(chunk) {
  const result = this.middleware.process(chunk.data);
  const data = result.data;
  if (this.proxy.user.config.developerMode) {
   const time = (new Date()) - data.time;
   if (time > 250) this.proxy.console(`Middleware for ${this.title} took ${time}ms to execute:`, new Error(`input(${data.input.length}): ${data.input}`));
  }
  data.respond.forEach(data => this.respond(data));
  data.forward.forEach(data => this.forward(data));
  if (data.input.length > 0 && this.lastLines.push(data.input) > this.maxLastLines) this.lastLines.shift();
  if (this.logger && !data.input.startsWith('#$#')) this.logger.write(data.input);
  return result;
 }
} 

module.exports = TelnetDevice;
