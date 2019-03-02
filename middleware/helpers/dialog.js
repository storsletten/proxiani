const menu = (middleware, items) => {
 items.forEach((item, index) => middleware.device.respond(`[${index + 1}] ${item}`));
 middleware.device.respond(`Enter your selection:`);
 middleware.device.respond(`[Type a line of input or \`@abort' to abort the command.]`);
 return middleware.setPromisedState('dialog', { timeout: 0 }, data => {
  if (data.input.startsWith('#$#')) return 0;
  const input = data.forward.pop().trim().toLowerCase();
  if (input === '@abort') return 0b111;
  else if (input.length === 0) data.indexMatch = -1;
  else {
   const m = input.match(/^\d+$/);
   if (m) {
    const index = Number(m[0]) - 1;
    data.indexMatch = index >= items.length ? -1 : index;
   }
   else data.indexMatch = items.findIndex(item => item.startsWith(input));
  }
  if (data.indexMatch === -1) return 0b111;
 }).catch(({ data, reason }) => {
  if (reason === 'abort') middleware.device.respond(data.indexMatch === undefined ? '>> Command Aborted <<' : 'Invalid selection.');
 });
};

const prompt = middleware => {
 middleware.device.respond(`[Type a line of input or \`@abort' to abort the command.]`);
 return middleware.setPromisedState('dialog', { timeout: 0 }, data => {
  if (data.input.startsWith('#$#')) return 0;
  const input = data.forward.pop().trim().toLowerCase();
  if (input === '@abort') return 0b111;
 }).catch(({ reason }) => {
  if (reason === 'abort') middleware.device.respond('>> Command Aborted <<');
 });
};

const promptMultiline = middleware => {
 middleware.device.respond(`[Type lines of input; use \`.' to end.]`);
 const lines = [];
 const maxLines = 10000;
 return middleware.setPromisedState('dialog', {
  timeout: 0,
  data: lines,
 }, data => {
  if (data.input.startsWith('#$#')) return 0;
  const input = data.forward.pop().trim().toLowerCase();
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
 menu,
 prompt,
 promptMultiline,
};
