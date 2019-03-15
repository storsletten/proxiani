const ChatClient = require('../../../devices/chatClient.js');

const pc = (data, middleware, linkedMiddleware) => {
 data.forward.pop();
 if (!middleware.device.chatClient) {
  middleware.device.proxy.user.config.chatServer = {
   serverPassword: 'Proxiani',
   nickname: `Yobi`,
   username: `Erik`,
   password: `yoyoyayayayayay`,
  };
  middleware.device.chatClient = new ChatClient({
   proxy: middleware.device.proxy,
   host: 'localhost',
   port: 1235,
   autoReconnect: false,
  });
 }
};

module.exports = pc;
