const childProcess = require('child_process');

const commands = {
 changelog: {
  syntax: 'changelog',
  description: `Opens the Proxiani changelog in Notepad.`,
  func: (data, middleware) => childProcess.exec(`cmd.exe /c start "" notepad.exe CHANGELOG.txt`, { cwd: middleware.device.proxy.dir }),
 },
 date: {
  syntax: 'date',
  description: `Returns Proxiani's current local date and time.`,
  func: data => data.respond.push(String(new Date())),
 },
 echo: {
  syntax: 'echo',
  description: `Enables echo mode, which will send all your text back to you, including OOB messages.`,
  func: (data, middleware) => {
   data.respond.push(`Echo mode enabled.`);
   data.respond.push(`[Type @abort to return to normal.]`);
   middleware.setState('proxianiEcho', (data, middleware) => {
    data.forward.pop();
    data.stopProcessing = true;
    if (data.input.toLowerCase() === '@abort') data.respond.push('Echo mode disabled.');
    else {
     data.respond.push(data.input);
     return false;
    }
   });
  },
 },
 log: {
  syntax: 'log',
  description: `Shows Proxiani's console log messages.`,
  func: (data, middleware) => data.respond.push(`Showing last ${middleware.device.proxy.consoleLog.length} Proxiani console messages:`, ...middleware.device.proxy.consoleLog),
 },
 memory: {
  syntax: 'memory',
  description: `Shows how much RAM is occupied by Proxiani.`,
  func: data => data.respond.push(`${Math.max(1, Math.floor(process.memoryUsage().rss/(1024*1024)))} MB.`),
 },
 pass: {
  syntax: 'pass <message>',
  description: `Sends <message> directly to Miriani, in case you need to bypass Proxiani.`,
  func: data => {
   const msg = data.input.trimStart().slice(data.command[0].length).trimStart().slice(data.command[1].length + 1);
   data.forward.push(msg);
  },
 },
 path: {
  syntax: 'path',
  description: `Shows the paths to certain directories used by Proxiani.`,
  func: (data, middleware, linkedMiddleware) => {
   data.respond.push(`Proxiani: ${middleware.device.proxy.dir}`);
   if (middleware.device.proxy.dir !== middleware.dir.slice(0, middleware.device.proxy.dir.length)) {
    if (middleware.dir === linkedMiddleware.dir) {
     data.respond.push(`Middleware: ${middleware.dir}`);
    }
    else {
     data.respond.push(`Client middleware: ${middleware.dir}`);
     data.respond.push(`Server middleware: ${linkedMiddleware.dir}`);
    }
   }
   data.respond.push(`User data: ${middleware.device.proxy.userData.dir}`);
  },
 },
 reload: {
  syntax: 'reload',
  description: `Reloads the Proxiani middleware.`,
  func: (data, middleware, linkedMiddleware) => {
   if (middleware.load() && linkedMiddleware.load()) data.respond.push(`Reloaded Proxiani middleware.`);
   else data.respond.push(`Failed to reload Proxiani middleware.`);
  },
 },
 restart: {
  syntax: 'restart',
  description: `Restarts Proxiani.`,
  func: (data, middleware) => {
   middleware.device.proxy.console(`Restart command from ${middleware.device.type} ${middleware.device.id}`);
   middleware.device.respond(`Proxiani restarting... Goodbye!`);
   middleware.device.respond(`*** Disconnected ***`);
   middleware.device.proxy.restartRequested = true;
   middleware.device.proxy.close();
  },
 },
 shutdown: {
  syntax: 'shutdown',
  description: `Shuts down Proxiani.`,
  func: (data, middleware) => {
   middleware.device.proxy.console(`Shutdown command from ${middleware.device.type} ${middleware.device.id}`);
   middleware.device.respond(`Proxiani shutting down... Goodbye!`);
   middleware.device.respond(`*** Disconnected ***`);
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
 version: {
  syntax: 'version',
  description: `Shows the version of Proxiani that is currently running.`,
  func: (data, middleware) => {
   const proxy = middleware.device.proxy;
   data.respond.push(`${proxy.name} ${proxy.version}`);
   if (proxy.outdated) data.respond.push(`New ${proxy.outdated} update available: ${proxy.latestVersion}`);
  },
 },
};

const proxiani = (data, middleware, linkedMiddleware) => {
 data.stopProcessing = true;
 data.forward.pop();
 if (data.command.length <= 1) {
  data.respond.push(`Available arguments for the Proxiani command:`);
  for (let command in commands) data.respond.push(`  ${commands[command].syntax || command}. ${commands[command].description}`);
 }
 else if (data.command[1] in commands) commands[data.command[1]].func(data, middleware, linkedMiddleware);
 else {
  for (let command in commands) {
   if (command.indexOf(data.command[1]) === 0) {
    commands[command].func(data, middleware, linkedMiddleware);
    return;
   }
  }
  data.respond.push(`Proxiani command not recognized.`);
 }
};

module.exports = proxiani;
