const commandAliases = {
 lock: 'aim',
 proxiani: 'px',
 'registered_soundpack': '#$#register_soundpack',
 sc: 'scan',
 sca: 'scan',
 sma: 'smships',
 smc: 'smships',
 smd: 'smships',
 smf: 'smships',
 sms: 'smships',
 smt: 'smships',
 '@sm': 'sm',
 '@sma': 'smships',
 '@smc': 'smships',
 '@smd': 'smships',
 '@smf': 'smships',
 '@sms': 'smships',
 '@smt': 'smships',
};

module.exports = middleware => {
 for (let alias in commandAliases) middleware.commands[alias] = middleware.commands[commandAliases[alias]];
};
