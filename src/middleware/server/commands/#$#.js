const fs = require('fs');
const path = require('path');
const utils = require('../../../utils.js');

const exists = (path, mode = fs.constants.F_OK) => fs.promises.access(path, mode).then(() => true).catch(() => false);
const openEditor = async (middleware, lines, upload) => {
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
  await fs.promises.writeFile(filepath, lines.join("\r\n"), {
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
 if (middleware.device.mudMixer) return;
 if (data.input.startsWith(`#$# edit name: `)) {
  const i = data.input.lastIndexOf(' upload:');
  if (i !== -1) {
   const name = data.input.slice(15, i);
   const upload = data.input.slice(i + 9);
   middleware.setState('localEdit', {
    data: [],
   }, (data, middleware) => {
    const lines = middleware.states.localEdit.data;
    if (data.input === '.') {
     data.forward = [
      `#$#px interrupt`,
      `Local editing ${name}`,
     ];
     openEditor(middleware, lines, upload);
    }
    else if (lines.length > 100) {
     middleware.device.proxy.console(new error(`Exceeded max number of lines for localEdit`));
     return 0b10;
    }
    else {
     lines.push(data.input);
     return 0;
    }
   });
  }
 }
};
