const echo = (data, middleware) => {
 data.forward.pop();
 const args = data.input.match(/^\s*\w+\s(.+)$/);
 if (args) data.respond.push(args[1]);
 else {
  data.respond.push(`What text would you like repeated back to you?`);
  data.respond.push(`[Type lines of input; use \`.' to end.]`);
  middleware.setState('echo', (data, middleware) => {
   const maxLineCount = 1000;
   if (data.input.startsWith('#$#')) return 0;
   data.forward.pop();
   if (data.input === '.') {
    data.respond = middleware.states.echo.data;
    return;
   }
   else if (data.input.toLowerCase() === '@abort') {
    data.respond.push('>> Command Aborted <<');
    return;
   }
   else if (middleware.states.echo.data.length < maxLineCount) middleware.states.echo.data.push(data.input);
   else if (middleware.states.echo.data.length === maxLineCount) {
    const msg = `*** Exceeded the maximum number of lines (${maxLineCount}) ***`;
    middleware.states.echo.data.push(msg);
    data.respond.push(msg);
    data.respond.push(`Please type a period (.) to have the buffered text echoed back to you, or type @abort to cancel and discard the buffered data.`);
   }
   return 0b01;
  }, []).timeout = 0;
 }
};

module.exports = echo;
