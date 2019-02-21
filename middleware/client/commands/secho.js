const secho = (data, middleware) => {
 data.forward.pop();
 const args = data.input.match(/^\s*\w+\s(.+)$/);
 if (args) {
  data.respond.push(`#$#soundpack echo | ${args[1]}`);
  return;
 }
 data.respond.push(`What would you like to be repeated back to you using soundpack echo?`, `[Type a line of input or \`@abort' to abort the command.]`);
 middleware.setState('secho', (data, middleware) => {
  if (data.input.startsWith('#$#')) return 0;
  data.forward.pop();
  if (data.input.trim().toLowerCase() === '@abort') data.respond.push(`>> Command Aborted <<`);
  else data.respond.push(`#$#soundpack echo | ${data.input}`);
 }).timeout = 0;
};

module.exports = secho;
