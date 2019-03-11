const commandAliases = {
 lock: 'aim',
 proxiani: 'px',
 'registered_soundpack': '#$#register_soundpack',
 sc: 'scan',
 sca: 'scan',
};

module.exports = middleware => {
 for (let alias in commandAliases) middleware.commands[alias] = middleware.commands[commandAliases[alias]];
};
