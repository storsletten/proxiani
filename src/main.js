const Device = require('./device');
const Proxy = require('./proxy');
const utils = require('./utils');

const proxy = new Proxy();
proxy.on('clientCreated', client => {
 const server = new Device({
  proxy: client.proxy,
  link: client,
  ...client.proxy.userData.config.server,
 });
 client.on('close', () => server.close());
 server.on('close', () => client.close());
});
