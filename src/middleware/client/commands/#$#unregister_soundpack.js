module.exports = (data, middleware) => {
 middleware.device.soundpack = {};
 if (middleware.device.chatServer && middleware.device.chatServer.authorized) middleware.device.chatServer.socket.write(`#$#unregister_soundpack\n`);
};
