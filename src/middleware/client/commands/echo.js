const dialog = require('../../helpers/dialog.js');

const echo = (data, middleware) => {
 if (middleware.device.mudMixer) return;
 data.forward.pop();
 const args = data.input.match(/^\s*\w+\s(.+)$/);
 if (args) data.respond.push(args[1]);
 else dialog.promptMultiline({ middleware, title: `What text would you like repeated back to you?` }).then(data => data && data.state && data.state.data.forEach(line => middleware.device.respond(line)));
};

module.exports = echo;
