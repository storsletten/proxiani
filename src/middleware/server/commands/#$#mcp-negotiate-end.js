const packages = {
 'mcp-negotiate': 'min-version: 1.0 max-version: 2.0',
 'dns-org-mud-moo-simpleedit': 'min-version: 1.0 max-version: 1.0',
 'dns-com-awns-status': 'min-version: 1.0 max-version: 1.0',
 'dns-com-awns-ping': 'min-version: 1.0 max-version: 1.0',
 'dns-com-vmoo-client': 'min-version: 1.0 max-version: 1.0',
};

module.exports = (data, middleware) => {
 if (middleware.device.mudMixer) return;
 const mcp = middleware.persistentStates.mcp;
 if (!mcp) return;
 const command = data.input.split(' ');
 if (command.length !== 2 || command[1] !== mcp.authKey) return;
 data.forward.pop();
 if (mcp.packages['mcp-negotiate']) {
  for (let package in packages) data.respond.push(`#$#mcp-negotiate-can ${mcp.authKey} package: ${package} ${packages[package]}`);
  data.respond.push(`#$#mcp-negotiate-end ${mcp.authKey}`);
  data.respond.push(`#$#dns-com-vmoo-client-info ${mcp.authKey} name: Proxiani text-version: "v${middleware.device.proxy.version}" internal-version: 0 reg-id: 0 flags: p`);
 }
};
