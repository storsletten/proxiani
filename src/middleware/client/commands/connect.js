module.exports = (data, middleware, linkedMiddleware) => {
 middleware.device.lastConnectCommand = data.input;
};
