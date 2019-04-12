const childProcess = require('child_process');
const path = require('path');

const parseArgstr = str => {
 const args = [];
 if (!str) return args;
 let quoted = false;
 let lastChar;
 str.split(/(?<!\\)"/).forEach(arg => {
  if (quoted) {
   if (lastChar && lastChar !== ' ') args[args.length - 1] += `"${arg}"`;
   else args.push(arg);
  }
  else if (arg) {
   lastChar = arg[arg.length - 1];
   arg = arg.trim();
   if (arg) args.push(...arg.split(/\s+/));
  }
  quoted = !quoted;
 });
 return args;
};

const englishOrdinalIndicator = n => {
 const s = String(n);
 const l = s[s.length - 1];
 if ('123'.indexOf(l) !== -1 && (s.length === 1 || s[s.length - 2] !== '1')) {
  const o = { '1': 'st', '2': 'nd', '3': 'rd' };
  return `${s}${o[l]}`;
 }
 else return `${s}th`;
};

const englishMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const formatDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const formatDateWordly = (d, includeYear = true) => `${englishMonths[d.getMonth()]} ${englishOrdinalIndicator(d.getDate())}${includeYear ? `, ${d.getFullYear()}` : ''}`;
const formatTime = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

const week = 604800000;
const day = 86400000;
const hour = 3600000;
const minute = 60000;
const second = 1000;
const formatTimeDiff = (d1, d2) => {
 let diff = Math.abs(d1 - d2);
 const weeks = Math.floor(diff / week);
 diff %= week;
 const days = Math.floor(diff / day);
 diff %= day;
 const hours = Math.floor(diff / hour);
 diff %= hour;
 const minutes = Math.floor(diff / minute);
 diff %= minute;
 const seconds = Math.floor(diff / second);
 const result = [];
 if (weeks) result.push(`${weeks} week${weeks !== 1 ? 's' : ''}`);
 if (days) result.push(`${days} day${days !== 1 ? 's' : ''}`);
 if (hours) result.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
 if (minutes) result.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
 if (seconds) result.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
 if (result.length > 2) return `${result.slice(0, -1).join(', ')}, and ${result[result.length - 1]}`;
 else if (result.length > 0) return result.join(' and ');
 else if (diff > 0) return `${diff} millisecond${diff !== 1 ? 's' : ''}`;
 else return `no time`;
};

const formatAmount = (number, word, thousands = true) => `${thousands ? formatThousands(number) : number} ${number == 1 ? word : `${word}s`}`;
const formatThousands = number => String(number).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const msgBox = (msg, title = 'Proxiani') => {
 childProcess.spawn('cscript.exe', [path.join(__dirname, 'msgBox.vbs'), msg, title], {
  windowsHide: true,
  detached: true,
  stdio: 'ignore',
 }).unref();
};

const run = (app, args = [], options = {}) => {
 childProcess.spawn('cmd.exe', ['/C', 'start', '""', app, ...(Array.isArray(args) ? args : [args])], {
  ...options,
  windowsHide: true,
  detached: true,
  stdio: 'ignore',
 }).unref();
};
const powershell = (command, options = {}) => run('powershell', ['-version', '2.0', '-EncodedCommand', Buffer.from(command, 'utf16le').toString('base64')], options);

const randomInterval = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

class Timers {
 constructor() {
  this.timers = {};
 }
 clear(name) {
  if (name !== undefined) {
   if (name in this.timers) {
    clearTimeout(this.timers[name]);
    delete this.timers[name];
   }
  }
  else {
   for (let name in this.timers) {
    clearTimeout(this.timers[name]);
    delete this.timers[name];
   }
  }
 }
 set(name, func, delay, ...params) {
  if (name in this.timers) clearTimeout(this.timers[name]);
  this.timers[name] = setTimeout(() => {
   delete this.timers[name];
   func(...params);
  }, delay);
 }
 setInterval(name, ...args) {
  if (name in this.timers) clearInterval(this.timers[name]);
  this.timers[name] = setInterval(...args);
 }
}

module.exports = {
 englishOrdinalIndicator,
 englishMonths,
 formatDate,
 formatDateWordly,
 formatTime,
 formatTimeDiff,
 formatAmount,
 formatThousands,
 msgBox,
 parseArgstr,
 powershell,
 run,
 randomInterval,
 Timers,
};
