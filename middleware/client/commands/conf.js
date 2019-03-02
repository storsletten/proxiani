const dialog = require('../../helpers/dialog.js');

const manageMetafEncryption = async ({ middleware }) => {
 const metafEncryption = middleware.device.proxy.user.config.metafEncryption;
 while (true) {
  const itemKeys = Object.keys(metafEncryption);
  const items = itemKeys.map(label => `${label}: ${metafEncryption[label]}`);
  const response = await dialog.menu({
   middleware,
   title: `Metafrequency Encryption:`,
   items,
   extraItems: [['Add / Update', '+'], ['Go back', '0']],
  });
  if (response === undefined) throw 'done';
  if (response.data.extraMatch) {
   if (response.data.extraMatch === '0') return true;
   if (response.data.extraMatch === '+') {
    const response1 = await dialog.prompt({ middleware, re: /^[^\s]+$/, title: 'Metafrequency label:', hint: 'Spaces are not allowed in metafrequency labels.' });
    if (response1 === undefined) throw 'done';
    const response2 = await dialog.prompt({ middleware, re: /./, title: `Password:` });
    if (response2 === undefined) throw 'done';
    const label = response1.data.inputProcessed;
    const password = response2.data.input.trim();
    middleware.device.respond(`${metafEncryption[label] === undefined ? 'Added' : 'Updated'} encryption key for metafrequency label ${label}.`);
    metafEncryption[label] = password;
   }
  }
  else {
   delete metafEncryption[itemKeys[response.data.indexMatch]];
   middleware.device.respond(`Deleted the encryption key for metafrequency label ${itemKeys[response.data.indexMatch]}.`);
  }
 }
};

const objects = {
 title: 'PX configuration',
 menu: [
  { title: 'Metafrequency encryption', func: manageMetafEncryption },
  { title: 'Logging', type: 'boolean', key: 'logging' },
  { title: 'Developer mode', type: 'boolean', key: 'developerMode' },
  { title: 'Text editor', type: 'string', key: 'textEditor' },
 ],
};

const conf = (data, middleware) => {
 if (data.forward.length > 0) {
  data.forward.pop();
  data.command = data.input.trim().toLowerCase().split(/\s+/);
 }
 const config = middleware.device.proxy.user.config;
 const trail = [objects];
 const displayValue = v => {
  if (typeof v === 'boolean') return v ? 'On' : 'Off';
  else return v;
 };
 const printMenu = async () => {
  const current = trail[trail.length - 1];
  const items = current.menu.map(item => item.key ? `${item.title}  [${displayValue(config[item.key])}]` : item.title);
  const response = await dialog.menu({
   middleware,
   title: current.title,
   items,
   extraItems: [[trail.length > 1 ? 'Go back' : 'Exit', '0']],
  });
  if (response === undefined) return;
  if (response.data.extraMatch === '0') {
   trail.pop();
   if (trail.length === 0) {
    middleware.device.respond('Done.');
    return;
   }
  }
  else {
   const item = current.menu[response.data.indexMatch];
   if (item.menu) trail.push(item);
   else if (item.func) {
    try {await item.func({ middleware });}
    catch (e) {return;}
   }
   else if (item.key) {
    if (item.type === 'boolean') middleware.device.respond(`It's now ${displayValue(config[item.key] = !config[item.key])}.`);
    else {
     const response = await dialog.prompt({
      middleware,
      title: `Enter new value for ${item.title}`,
     });
     if (response === undefined) return;
     middleware.device.respond(`It's now set to ${config[item.key] = response.data.input}.`);
    }
   }
  }
  printMenu();
 };
 printMenu();
};

module.exports = conf;
