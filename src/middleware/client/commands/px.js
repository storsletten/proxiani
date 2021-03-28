const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');
const conf = require('./conf.js');
const dialog = require('../../helpers/dialog.js');
const utils = require('../../../utils.js');

const commands = {
 changelog: {
  syntax: 'changelog',
  description: `Opens the Proxiani changelog in Notepad.`,
  func: (data, middleware) => {
   data.respond.push(`#$#px say Opening the changelog`);
   utils.run(middleware.device.proxy.user.config.textEditor, 'CHANGELOG.txt', { cwd: middleware.device.proxy.dir });
  },
 },
 configure: {
  syntax: 'conf',
  description: `Lets you change Proxiani configuration.`,
  func: conf,
 },
 console: {
  syntax: 'console',
  description: `Shows Proxiani's last console messages.`,
  func: (data, middleware) => data.respond.push(`Showing last ${middleware.device.proxy.consoleLog.length} Proxiani console messages:`, ...middleware.device.proxy.consoleLog),
 },
 date: {
  syntax: 'date',
  description: `Returns Proxiani's current local date and time.`,
  func: data => data.respond.push(String(new Date())),
 },
 directories: {
  syntax: 'directories',
  description: `Shows paths to directories used by Proxiani.`,
  func: (data, middleware, linkedMiddleware) => {
   const pdir = middleware.device.proxy.dir;
   data.respond.push(`Proxiani in ${getParentDirName(pdir)}: ${pdir}`);
   if (pdir !== middleware.dir.slice(0, pdir.length)) data.respond.push(`Client middleware in ${getParentDirName(middleware.dir)}: ${middleware.dir}`);
   if (linkedMiddleware && pdir !== linkedMiddleware.dir.slice(0, pdir.length)) data.respond.push(`Server middleware in ${getParentDirName(linkedMiddleware.dir)}: ${linkedMiddleware.dir}`);
   data.respond.push(`User data in ${getParentDirName(middleware.device.proxy.user.dir)}: ${middleware.device.proxy.user.dir}`);
  },
 },
 disregard: {
  syntax: 'disregard',
  description: `This command is used to disregard warnings, such as unauthorized TLS certificate.`,
  func: (data, middleware, linkedMiddleware) => {
   const linkedDevice = linkedMiddleware.device;
   const proxy = middleware.device.proxy;
   if (linkedDevice.socket && linkedDevice.socket.destroyed === false && linkedDevice.socket.authorized === false && linkedDevice.connected === false) {
    proxy.console(`TLS manually authorized by user.`);
    middleware.device.respond(`OK, disregarding TLS error...`);
    linkedDevice.events.emit('connect');
   }
   else {
    data.respond.push(`Nothing happened.`);
   }
  },
 },
 echo: {
  syntax: 'echo',
  description: `Enables echo mode, which will send all your text back to you, including OOB messages.`,
  func: (data, middleware) => {
   data.respond.push(`Echo mode enabled.`);
   data.respond.push(`[Type lines of input; use \`@abort' to end.]`);
   middleware.setState('pxEcho', {
    timeout: 0,
   }, (data, middleware) => {
    data.forward.pop();
    if (data.input.trim().toLowerCase() === '@abort') {
     data.respond.push('>> Command Aborted <<');
     return;
    }
    else {
     data.respond.push(data.input);
     return 0b01;
    }
   });
  },
 },
 evaluate: {
  syntax: 'evaluate <expression>',
  description: `Evaluates the expression in a separate Node.js context.`,
  func: (data, middleware, linkedMiddleware) => {
   const vmOptions = { timeout: 500 };
   const vmVars = Object.create(null);
   if (middleware.device.proxy.user.config.developerMode) {
    vmVars.proxy = middleware.device.proxy;
    vmVars.device = middleware.device;
    vmVars.linkedDevice = middleware.device.link;
    vmVars.middleware = middleware;
    vmVars.linkedMiddleware = linkedMiddleware;
   }
   if (data.command.length > 2) {
    try {
     data.respond.push(vm.runInNewContext(getRawCommandValue(data), vmVars, vmOptions));
    }
    catch (error) {
     data.respond = error.stack.split("\n");
    }
   }
   else {
    dialog.promptMultiline({ middleware, title: `Enter JS code to run:` }).then(data => {
     if (!data) {
      return;
     }
     try {
      middleware.device.respond(vm.runInNewContext(data.state.data.join("\r\n"), vmVars, vmOptions));
     }
     catch (error) {
      middleware.device.respond(error.stack.replace(/\n/, "\r\n"));
     }
    });
   }
  },
 },
 find: {
  syntax: 'find <search phrase>',
  description: `Searches your log files and shows the first match from every day where there is a match.`,
  func: (data, middleware) => {
   if (data.command.length === 2) {
    data.respond.push(`Find what?`);
    return;
   }
   const searchPhrase = getRawCommandValue(data);
   const device = middleware.device;
   const worker = device.worker('logFind');
   device.respond(`Searching for ${searchPhrase}...`);
   const today = new Date();
   const year = today.getFullYear();
   worker.on('message', msg => {
    if (msg.year) {
     const d = new Date(`${msg.year}-${msg.month.padStart(2, '0')}-${msg.date.padStart(2, '0')}`);
     const daysAgo = Math.floor((today - d) / 86400000);
     device.respond(`  ${daysAgo === 0 ? 'Today' : `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`}${daysAgo > 30 ? `, on ${utils.formatDateWordly(d, d.getFullYear() !== year)}` : ''}: ${msg.line}${msg.time ? ` [${msg.time}]` : ''}`);
    }
   });
   worker.on('exit', code => device.respond(code === 0 ? `Search complete.` : `Search failed with code ${code}.`));
   worker.send({
    caseSensitive: false,
    maxHitsPerFile: 3,
    logDir: path.join(device.proxy.user.dir, device.proxy.user.logDir),
    loggerID: `on port ${device.socket.address().port}`,
    searchPhrase,
   });
  },
 },
 log: {
  syntax: 'log [<date> | <number of days ago>]',
  description: `Opens a log file in Notepad.`,
  func: (data, middleware) => {
   const user = middleware.device.proxy.user;
   const today = new Date();
   const d = new Date(today.getTime());
   if (data.command.length > 2) {
    if (data.command.length === 3 && isFinite(data.command[2])) d.setDate(d.getDate() - Number(data.command[2]));
    else {
     const t = Date.parse(data.command.slice(2).join(' '));
     if (isNaN(t)) {
      data.respond.push(`Invalid date.`);
      return;
     }
     else d.setTime(t);
    }
   }
   const fileName = `${utils.englishOrdinalIndicator(d.getDate())}, on port ${middleware.device.socket.address().port}.txt`;
   const dirName = path.join(user.dir, user.logDir, String(d.getFullYear()), String(d.getMonth() + 1));
   const logFile = path.join(dirName, fileName);
   if (fs.existsSync(logFile)) {
    const daysAgo = Math.floor((today - d) / 86400000);
    data.respond.push(`#$#px say Opening log ${daysAgo === 0 ? 'for today' : (daysAgo < 8 ? `from ${daysAgo === 1 ? '1 day' : `${daysAgo} days`} ago` : `of ${utils.formatDateWordly(d)}`)}.`);
    utils.run(middleware.device.proxy.user.config.textEditor, fileName, { cwd: dirName });
   }
   else data.respond.push(`Couldn't find a log file for ${utils.formatDate(d)}.`);
  },
 },
 pass: {
  syntax: 'pass <message>',
  description: `Sends <message> directly to Miriani, in case you need to bypass Proxiani middleware.`,
  func: (data, middleware, linkedMiddleware) => {
   if (data.command.length > 2) data.forward.push(getRawCommandValue(data));
   else {
    data.respond.push(`Enabled bidirectional pass-through mode. Type ${data.command.join(' ')} again to disable it.`);
    middleware.clearStates();
    linkedMiddleware.clearStates();
    middleware.setState('pxPass', {
     timeout: 0,
    }, (data, middleware, linkedMiddleware) => {
     if (data.input.match(/^\s*(px|proxiani)\s+(p|pa|pas|pass)\s*$/i)) {
      data.forward.pop();
      data.respond.push(`Disabled pass-through mode.`);
      linkedMiddleware.states = {};
      return;
     }
     return 0b01;
    });
    linkedMiddleware.setState('pxPass', { timeout: 0 }, () => 0b01);
   }
  },
 },
 quit: {
  syntax: 'quit',
  description: `Kills the connection.`,
  func: (data, middleware) => {
   middleware.device.close();
  },
 },
 restart: {
  syntax: 'restart [middleware]',
  description: `Restarts Proxiani. The optional middleware literal lets you restart middleware only if preferred.`,
  func: (data, middleware, linkedMiddleware) => {
   if (data.command.length > 2) {
    if ('middleware'.startsWith(data.command[2])) {
     let helpersDir = path.join(path.dirname(middleware.dir), 'helpers');
     for (let mod in require.cache) {
      if (mod.slice(0, helpersDir.length) === helpersDir) delete require.cache[mod];
     }
     if (middleware.load() && linkedMiddleware.load()) data.respond.push(`Reloaded Proxiani middleware.`);
     else data.respond.push(`Failed to reload Proxiani middleware.`);
    }
    else data.respond.push(`Invalid restart parameters.`);
   }
   else {
    middleware.device.proxy.console(`Restart command from ${middleware.device.type} ${middleware.device.id}`);
    middleware.device.proxy.close(true);
   }
  },
 },
 shutdown: {
  syntax: 'shutdown',
  description: `Shuts down Proxiani.`,
  func: (data, middleware) => {
   middleware.device.proxy.console(`Shutdown command from ${middleware.device.type} ${middleware.device.id}`);
   middleware.device.proxy.close();
  },
 },
 time: {
  syntax: 'time',
  description: `Returns Proxiani's current local time of the day.`,
  func: (data, middleware) => {
   const d = new Date();
   const pad = num => String(num).padStart(2, '0');
   data.respond.push(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
  },
 },
 uptime: {
  syntax: 'uptime',
  description: `Shows uptime information for Proxiani as well as your current connection.`,
  func: (data, middleware, linkedMiddleware) => {
   const proxy = middleware.device.proxy;
   const now = new Date();
   data.respond.push(`${proxy.name} has been up for ${utils.formatTimeDiff(now, proxy.startdate)}  (since ${utils.formatTime(proxy.startdate)}, ${utils.formatDateWordly(proxy.startdate)}).`);
   data.respond.push(`You have been connected for ${utils.formatTimeDiff(now, middleware.device.connectedSince)}  (since ${utils.formatTime(middleware.device.connectedSince)}, ${utils.formatDateWordly(middleware.device.connectedSince)}).`);
   if (linkedMiddleware.device.host) {
    if (linkedMiddleware.device.connected) data.respond.push(`Connection to ${linkedMiddleware.device.host} has been up for ${utils.formatTimeDiff(now, linkedMiddleware.device.connectedSince)}  (since ${utils.formatTime(linkedMiddleware.device.connectedSince)}, ${utils.formatDateWordly(linkedMiddleware.device.connectedSince)}).`);
    else if (linkedMiddleware.device.startdate !== linkedMiddleware.device.disconnectedSince) data.respond.push(`The connection to ${linkedMiddleware.device.host} has been down for ${utils.formatTimeDiff(now, linkedMiddleware.device.disconnectedSince)}  (since ${utils.formatTime(linkedMiddleware.device.disconnectedSince)}, ${utils.formatDateWordly(linkedMiddleware.device.disconnectedSince)}).`);
    else data.respond.push(`${proxy.name} has been attempting to connect to ${linkedMiddleware.device.host} for ${utils.formatTimeDiff(now, linkedMiddleware.device.startdate)}  (since ${utils.formatTime(linkedMiddleware.device.startdate)}, ${utils.formatDateWordly(linkedMiddleware.device.startdate)}).`);
   }
  },
 },
 usage: {
  syntax: 'usage',
  description: `Shows resource usage.`,
  func: (data, middleware, linkedMiddleware) => {
   const formatBytes = n => {
    if (n < 100000) return utils.formatAmount(n, 'Byte');
    if (n < 100000000) return `${utils.formatThousands(Math.floor(n / 1024))} kB`;
    if (n < 100000000000) return `${utils.formatThousands(Math.floor(n / 1048576))} mB`;
    return `${utils.formatThousands(Math.floor(n / 1073741824))} gB`;
   };
   const device = middleware.device;
   const proxy = device.proxy;
   data.respond.push(`Memory usage:`);
   data.respond.push(`  ${proxy.name}: ${formatBytes(process.memoryUsage().rss)}.`);
   data.respond.push(`  The system has ${formatBytes(os.freemem())} of free memory.`);
   const showServerDataUsage = Boolean(linkedMiddleware && linkedMiddleware.device.socket && linkedMiddleware.device.host);
   data.respond.push(`Data usage:`);
   data.respond.push(`  Client transferred ${formatBytes(device.socket.bytesRead)} to ${proxy.name}, and received ${formatBytes(device.socket.bytesWritten)} from ${proxy.name}.`);
   if (showServerDataUsage) {
    const device = linkedMiddleware.device;
    const socket = device.socket;
    data.respond.push(`  ${device.host} transferred ${formatBytes(socket.bytesRead)} to ${device.proxy.name}, and received ${formatBytes(socket.bytesWritten)} from ${device.proxy.name}.`);
   }
  },
 },
 version: {
  syntax: 'version',
  description: `Shows the version of Proxiani that is currently running.`,
  func: (data, middleware) => {
   const proxy = middleware.device.proxy;
   data.respond.push(`${proxy.name} v${proxy.version}`);
   data.respond.push(`NodeJS ${process.version}`);
   if (proxy.outdated) data.respond.push(`New ${proxy.outdated} update of ${proxy.name} is available: ${proxy.latestVersion}`);
  },
 },
};

const getParentDirName = dir => dir.split(path.sep).slice(-2, -1).join();
const getRawCommandValue = data => data.command.length > 2 ? data.input.replace(/^\s*[^\s]+\s+[^\s]+\s/, '') : undefined;

const px = (data, middleware, linkedMiddleware) => {
 data.forward.pop();
 data.command = data.input.trim().toLowerCase().split(/\s+/);
 if (data.command.length === 1) {
  data.respond.push(`Available arguments for the ${data.command[0]} command:`);
  for (let command in commands) data.respond.push(`  ${commands[command].syntax || command}. ${commands[command].description}`);
 }
 else if (data.command[1] in commands) commands[data.command[1]].func(data, middleware, linkedMiddleware);
 else {
  for (let command in commands) {
   if (command.startsWith(data.command[1])) {
    commands[command].func(data, middleware, linkedMiddleware);
    return;
   }
  }
  data.respond.push(`${data.command[0]} command "${data.command[1]}" not recognized.`);
 }
};

module.exports = px;
