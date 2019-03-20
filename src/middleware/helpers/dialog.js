const confirm = ({ middleware, title }) => {
 if (title) middleware.device.respond(title);
 middleware.device.respond(`[Enter "yes" or "no"]`);
 return middleware.setPromisedState('dialog', { timeout: 0 }, data => {
  if (data.input.startsWith('#$#')) return 0;
  data.forward.pop();
  const input = data.input.trim().toLowerCase();
  if (input === '@abort') return 0b111;
  else if ('yes'.startsWith(input)) data.confirmed = true;
  else if ('no'.startsWith(input)) data.confirmed = false;
  else {
   if (title) middleware.device.respond(title);
   middleware.device.respond(`[Enter "yes" or "no"]`);
   return 1;
  }
 }).catch(({ reason }) => {
  if (reason === 'abort') middleware.device.respond('>> Command Aborted <<');
 });
};

const menu = ({ middleware, items, extraItems, title }) => {
 if (title) middleware.device.respond(`  ${title}`);
 if (!Array.isArray(items)) items = Object.keys(items);
 items.forEach((item, index) => middleware.device.respond(`[${index + 1}] ${item}`));
 const extraItemsMap = {};
 if (extraItems) extraItems.forEach(item => {
  extraItemsMap[item[1]] = item;
  middleware.device.respond(`[${item[2] || item[1].toUpperCase()}] ${item[0]}`);
 });
 middleware.device.respond(`Enter your selection:`);
 middleware.device.respond(`[Type a line of input or \`@abort' to abort the command.]`);
 return middleware.setPromisedState('dialog', { timeout: 0 }, data => {
  if (data.input.startsWith('#$#')) return 0;
  data.forward.pop();
  const input = data.input.trim().toLowerCase();
  if (input === '@abort') return 0b111;
  else if (input.length === 0) data.indexMatch = -1;
  else {
   const m = input.match(/^\d+$/);
   if (m) {
    const index = Number(m[0]) - 1;
    data.indexMatch = index >= items.length ? -1 : index;
   }
   else data.indexMatch = -1;
   if (data.indexMatch === -1) {
    if (extraItems && extraItemsMap[input]) data.extraMatch = input;
    else data.indexMatch = items.findIndex(item => item.toLowerCase().startsWith(input));
    if (data.indexMatch === -1 && extraItems && !data.extraMatch) {
     const item = extraItems.find(item => item[0].toLowerCase().startsWith(input));
     if (item) data.extraMatch = item[1];
    }
   }
  }
  if (data.indexMatch !== -1) data.match = items[data.indexMatch];
  else if (data.extraMatch === undefined) return 0b111;
 }).catch(({ data, reason }) => {
  if (reason === 'abort') middleware.device.respond(data.indexMatch === undefined ? '>> Command Aborted <<' : 'Invalid selection.');
 });
};

const prompt = ({ middleware, title, re, hint }) => {
 if (title) middleware.device.respond(title);
 middleware.device.respond(`[Type a line of input or \`@abort' to abort the command.]`);
 return middleware.setPromisedState('dialog', { timeout: 0 }, data => {
  if (data.input.startsWith('#$#')) return 0;
  data.forward.pop();
  const input = data.input.trim().toLowerCase();
  if (input === '@abort') return 0b111;
  if (re && !re.test(input)) {
   if (input.length > 0) {
    middleware.device.respond(hint || 'Invalid input.');
    middleware.device.respond('');
   }
   if (title) middleware.device.respond(title);
   middleware.device.respond(`[Type a line of input or \`@abort' to abort the command.]`);
   return 1;
  }
  data.inputProcessed = input;
 }).catch(({ reason }) => {
  if (reason === 'abort') middleware.device.respond('>> Command Aborted <<');
 });
};

const promptMultiline = ({ middleware, title }) => {
 if (title) middleware.device.respond(title);
 middleware.device.respond(`[Type lines of input; use \`.' to end or \`@abort' to abort the command.]`);
 const lines = [];
 const maxLines = 10000;
 return middleware.setPromisedState('dialog', {
  timeout: 0,
  data: lines,
 }, data => {
  if (data.input.startsWith('#$#')) return 0;
  data.forward.pop();
  const input = data.input.trim().toLowerCase();
  if (input === '@abort') return 0b111;
  else if (input !== '.') {
   if (lines.push(data.input) > maxLines) {
    middleware.device.respond(`*** Exceeded the maximum allowed number of lines ***`);
    return 0b111;
   }
   else return 1;
  }
 }).catch(({ reason }) => {
  if (reason === 'abort' && lines.length <= maxLines) middleware.device.respond('>> Command Aborted <<');
 });
};

module.exports = {
 confirm,
 menu,
 prompt,
 promptMultiline,
};
