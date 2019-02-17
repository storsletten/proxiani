const commandAliases = {
 lock: 'aim',
 proxiani: 'px',
 sc: 'scan',
 sca: 'scan',
};

module.exports = middleware => {
 for (let alias in commandAliases) middleware.commands[alias] = middleware.commands[commandAliases[alias]];
};
