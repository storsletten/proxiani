const commandAliases = {
 lock: 'aim',
 px: 'proxiani',
 sc: 'scan',
 sca: 'scan',
};

const clientMiddleware = {
 commands: {
  aim: require('./commands/aim'),
  atsm: require('./commands/atsm'),
  echo: require('./commands/echo'),
  focus: require('./commands/focus'),
  gc: require('./commands/gc'),
  proxiani: require('./commands/proxiani'),
  scan: require('./commands/scan'),
  secho: require('./commands/secho'),
  sm: require('./commands/sm'),
  smships: require('./commands/smships'),
  split: require('./commands/split'),
 },
};

for (let alias in commandAliases) {
 clientMiddleware.commands[alias] = clientMiddleware.commands[commandAliases[alias]];
}
module.exports = clientMiddleware;
