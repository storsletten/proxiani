// Partial support for the extremely ghetto local edit for lambda.
// It has not been tested.
// Only thing not added is a way of fetching multiline data from the MOO.
// That would be easy to add though, using middleware.setState, and just fetch incoming data until a single period is detected.
// Motivation for continuing to develop this or even just to use this is lacking because this protocol is so wonky and unsafe.

const fs = require('fs');
const path = require('path');
const utils = require('../../../utils.js');

const exists = (path, mode = fs.constants.F_OK) => fs.promises.access(path, mode).then(() => true).catch(() => false);
const openEditor = async (middleware, upload) => {
 const proxy = middleware.device.proxy;
 const user = proxy.user;
 const tmpDir = path.join(user.dir, user.tmpDir);
 if (!(await exists(tmpDir)) && !(await fs.promises.mkdir(tmpDir).then(() => true).catch(() => false))) {
  return;
 }
 const file = `One time prompt.txt`;
 const filepath = path.join(tmpDir, file);
 if (filepath in proxy.fileWatchers) {
  proxy.fileWatchers[filepath].close();
  delete proxy.fileWatchers[filepath];
 }
 try {
  await fs.promises.writeFile(filepath, '', {
   encoding: 'binary',
   flag: 'w',
  });
 }
 catch (error) {
  return;
 }
 utils.run(middleware.device.proxy.user.config.textEditor, file, { cwd: tmpDir });
 proxy.fileWatchers[filepath] = fs.watch(filepath, { persistent: false }, eventType => {
  proxy.fileWatchers[filepath].close();
  delete proxy.fileWatchers[filepath];
  proxy.timers[filepath] = setTimeout(() => {
   delete proxy.timers[filepath];
   try {
    if (upload) middleware.device.respond(upload);
    const rawdata = fs.readFileSync(filepath, { encoding: 'binary' });
    if (rawdata) middleware.device.respond(rawdata);
    middleware.device.respond('.');
   }
   catch (error) {
    proxy.console(error);
   }
  }, 500);
 });
};

module.exports = (data, middleware) => {
 if (data.input.startsWith(`#$# edit name: `)) {
  const i = data.input.lastIndexOf(' upload:');
  if (i !== -1) {
   const upload = data.input.slice(i + 9);
   data.forward[0] = `Local editing ${data.input.slice(15, i)}`;
   openEditor(middleware, upload);
  }
 }
};
