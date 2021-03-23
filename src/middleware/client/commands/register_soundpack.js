module.exports = (data, middleware, linkedMiddleware) => {
 const args = data.input.match(/^[^\s]+\s(.+)$/);
 if (!args) return;
 const [name, version] = args[1].split(' | ', 2);
 middleware.device.soundpack = { name, version };
 if (middleware.device.chatServer && middleware.device.chatServer.authorized) middleware.device.chatServer.socket.write(`#$#register_soundpack ${name}\n`);
 if (linkedMiddleware && linkedMiddleware.device && linkedMiddleware.device.hasRegisteredSoundpack) data.forward.pop();
};
