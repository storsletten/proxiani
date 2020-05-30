const Server = require('./devices/server.js');
const Proxy = require('./proxy.js');

const proxy = new Proxy();
proxy.on('clientCreated', client => {
 const config = client.proxy.user.config;
 const server = new Server({
  proxy: client.proxy,
  link: client,
  ...(config[`server${client.socket.address()['port']}`] || config.server),
 });
 client.on('close', () => server.close());
 server.on('close', () => client.close());
});

module.exports = proxy;
