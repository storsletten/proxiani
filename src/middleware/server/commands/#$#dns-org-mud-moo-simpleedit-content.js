const { randomBytes } = require('crypto');
const fs = require('fs');
const path = require('path');
const utils = require('../../../utils.js');

const exists = (path, mode = fs.constants.F_OK) => fs.promises.access(path, mode).then(() => true).catch(() => false);
const openEditor = async (middleware, edit) => {
 const mcp = middleware.persistentStates.mcp;
 const proxy = middleware.device.proxy;
 const user = proxy.user;
 const tmpDir = path.join(user.dir, user.tmpDir);
 if (!(await exists(tmpDir)) && !(await fs.promises.mkdir(tmpDir).then(() => true).catch(() => false))) {
  return;
 }
 const file = `${edit.reference.replace(/[\\/:*?"<>|]/g, '_')}.txt`;
 const filepath = path.join(tmpDir, file);
 if (filepath in proxy.fileWatchers) {
  proxy.fileWatchers[filepath].close();
  delete proxy.fileWatchers[filepath];
 }
 try {
  await fs.promises.writeFile(filepath, edit.data.join("\r\n"), {
   encoding: 'binary',
   flag: 'w',
  });
 }
 catch (error) {
  return;
 }
 utils.run(middleware.device.proxy.user.config.textEditor, file, { cwd: tmpDir });
 proxy.fileWatchers[filepath] = fs.watch(filepath, { persistent: false }, eventType => {
  if (proxy.timers[filepath]) return;
  proxy.timers[filepath] = setTimeout(() => {
   const datatag = randomBytes(4).toString('hex');
   try {
    middleware.device.respond(`#$#dns-org-mud-moo-simpleedit-set ${mcp.authKey} reference: "${edit.reference}" type: ${edit.type} content*: "" _data-tag: ${datatag}`);
    const rawdata = fs.readFileSync(filepath, { encoding: 'binary' });
    if (rawdata) rawdata.split("\r\n").forEach(line => middleware.device.respond(`#$#* ${datatag} content: ${line}`));
    middleware.device.respond(`#$#: ${datatag}`);
   }
   catch (error) {
    proxy.console(error);
    proxy.fileWatchers[filepath].close();
    delete proxy.fileWatchers[filepath];
   }
   proxy.timers[filepath] = setTimeout(() => delete proxy.timers[filepath], 2000);
  }, 500);
 });
};

const unsetCommands = middleware => {
 delete middleware.commands['#$#*'];
 delete middleware.commands['#$#:'];
 if (middleware.persistentStates.mcp) delete middleware.persistentStates.mcp.edit;
};

module.exports = (data, middleware) => {
 if (middleware.device.mudMixer) return;
 const mcp = middleware.persistentStates.mcp;
 if (!mcp) return;
 const command = utils.parseArgstr(data.input);
 if (command.length < 2 || command[1] !== mcp.authKey) return;
 else if (command.length < 11 || command[2] !== 'reference:' || command[4] !== 'name:' || command[6] !== 'type:' || command[8] !== 'content*:' || command[10] !== '_data-tag:' || !command[11]) {
  middleware.device.proxy.console(new error(`Unexpected MCP edit syntax`));
  return;
 }
 data.forward.pop();
 mcp.edit = {
  reference: command[3],
  name: command[5],
  type: command[7],
  content: command[9],
  datatag: command[11],
  linePrefix: `#$#* ${command[11]} content: `,
  data: [],
 };
 middleware.commands['#$#*'] = (data, middleware) => {
  const mcp = middleware.persistentStates.mcp;
  if (!mcp || !mcp.edit || !data.input.startsWith(mcp.edit.linePrefix)) return unsetCommands(middleware);
  data.forward.pop();
  mcp.edit.data.push(data.input.slice(mcp.edit.linePrefix.length));
 };
 middleware.commands['#$#:'] = (data, middleware) => {
  const mcp = middleware.persistentStates.mcp;
  const edit = mcp && mcp.edit;
  unsetCommands(middleware);
  if (!mcp || !edit || !data.input.startsWith(`#$#: ${edit.datatag}`)) return;
  data.forward[0] = `#$#px say Editing`;
  openEditor(middleware, edit);
 };
};
