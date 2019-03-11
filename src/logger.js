const fs = require('fs');
const path = require('path');
const utils = require('./utils.js');

const exists = (path, mode = fs.constants.F_OK) => fs.promises.access(path, mode).then(() => true).catch(() => false);

class Logger {
 constructor(options) {
  this.proxy = options.proxy;
  this.id = options.loggerID;
  if (this.id in this.proxy.loggers) throw new Error(`Logger ID "${this.id}" already in use`);
  this.proxy.loggers[this.id] = this;
  this.proxy.loggersCount++;
  this.type = 'logger';
  this.title = `Logger${this.id ? ` ${this.id}` : ''}`;
  this.eol = options.eol || "\r\n";
  this.encoding = options.encoding || 'binary';
 }
 prepare(date) {
  if (this.queue) return true;
  const dirNames = [this.proxy.user.logDir, String(date.getFullYear()), String(date.getMonth() + 1)];
  const dir = path.join(this.proxy.user.dir, ...dirNames);
  const fileName = `${utils.englishOrdinalIndicator(date.getDate())}${this.id ? `, ${this.id}` : ''}.txt`;
  const logFile = path.join(dir, fileName);
  if (this.logger) {
   if (this.logFile === logFile) return;
   this.logger.end();
   delete this.logger;
  }
  this.queue = [];
  return (async () => {
   const logFileExists = await exists(logFile);
   if (!logFileExists && !(await exists(dir))) {
    let dir = this.proxy.user.dir;
    for (let i=0; i<dirNames.length; i++) {
     dir = path.join(dir, dirNames[i]);
     try { await fs.promises.mkdir(dir); }
     catch (error) { if (error.code !== 'EEXIST') throw error; }
    }
   }
   if (this.closed) throw `Logger was closed`;
   this.logger = fs.createWriteStream(logFile, { encoding: this.encoding, flags: 'a', autoClose: true });
   this.logFile = logFile;
   this.logger.write(logFileExists ? this.eol : `\tLog of ${utils.formatDateWordly(date)}.${this.eol}`);
   this.queue.forEach(line => this.logger.write(`${line}${this.eol}`));
   delete this.queue;
  })().catch(error => {
   this.logger = false;
   delete this.queue;
   this.proxy.console(`Failed to prepare ${this.title}:`, error);
  });
 }
 write(line) {
  if (this.logger === false || this.closed) return false;
  const date = new Date();
  const time = utils.formatTime(date);
  if (time !== this.time) {
   line = `${line}\t[${time}]`;
   this.time = time;
  }
  if (this.prepare(date)) this.queue.push(line);
  else this.logger.write(`${line}${this.eol}`);
 }
 close() {
  if (this.closed) return;
  this.closed = true;
  if (this.logger) {
   this.logger.end();
   delete this.logger;
  }
  delete this.proxy.loggers[this.id];
  this.proxy.loggersCount--;
  delete this.proxy;
 }
}

module.exports = Logger;
