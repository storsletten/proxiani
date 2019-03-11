const Server = require('./devices/server.js');
const Proxy = require('./proxy.js');

const proxy = new Proxy();
proxy.on('clientCreated', client => {
 const server = new Server({
  proxy: client.proxy,
  link: client,
  ...client.proxy.user.config.server,
 });
 client.on('close', () => server.close());
 server.on('close', () => client.close());
});

module.exports = proxy;
