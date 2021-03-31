const commandAliases = {
 cm: 'pc',
 cs: 'pc',
 cu: 'pc',
 cw: 'pc',
 fod: 'foc',
 fox: 'foc',
 lock: 'aim',
 pm: 'pc',
 'registered_soundpack': '#$#register_soundpack',
 sc: 'scan',
 sca: 'scan',
 sma: 'smships',
 smc: 'smships',
 smd: 'foc',
 smf: 'smships',
 sms: 'smships',
 smt: 'smships',
 '@sm': 'sm',
 '@sma': 'smships',
 '@smc': 'smships',
 '@smd': 'smships',
 '@smf': 'smships',
 '@smm': 'smm',
 '@sms': 'smships',
 '@smt': 'smships',
};

module.exports = middleware => {
 for (let alias in commandAliases) middleware.commands[alias] = middleware.commands[commandAliases[alias]];
};
