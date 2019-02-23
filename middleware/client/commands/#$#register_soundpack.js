module.exports = (data, middleware, linkedMiddleware) => {
 const args = data.input.match(/^[^\s]+\s(.+)$/);
 if (!args) return;
 const [name, version] = args[1].split(' | ', 2);
 middleware.device.soundpack = { name, version };
};
