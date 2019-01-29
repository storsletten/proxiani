module.exports = (data, middleware) => data.forward[0] = middleware.device.oob;
