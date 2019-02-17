const secho = (data, middleware) => {
 data.forward.pop();
 data.respond.push(`What would you like to be repeated back to you using soundpack echo?`, `[Type a line of input or \`@abort' to abort the command.]`);
 middleware.setState('secho', (data, middleware) => {
  if (data.input.startsWith('#$#')) return 0;
  else if (data.input.trim().toLowerCase() === '@abort') {
   data.forward.pop();
   data.respond.push(`>> Command Aborted <<`);
  }
  else data.respond.push(`#$#soundpack echo | ${data.forward.pop()}`);
 }).timeout = 0;
};

module.exports = secho;
