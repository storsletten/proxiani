// This command lets MUDMixer communicate with Proxiani.

module.exports = (data, middleware, linkedMiddleware) => {
 const match = data.input.match(/^#\$#mx version (\d{1,5}\.\d{1,5}\.\d{1,5})$/);
 if (match) {
  middleware.device.mudMixer = { version: match[1] };
  if (linkedMiddleware && linkedMiddleware.device) linkedMiddleware.device.mudMixer = middleware.device.mudMixer;
 }
};
