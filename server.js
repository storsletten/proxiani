const Device = require('./src/device');
const Proxy = require('./src/proxy');

const proxy = new Proxy();
proxy.on('clientCreated', client => {
 const server = new Device({
  proxy: client.proxy,
  link: client,
  ...proxy.userData.config.server,
 });
 client.on('close', () => server.close());
 server.on('close', () => client.close());
});
