// Proxiani Datapacker v1.0.0

const crypto = require('crypto');

const aad = Buffer.from('Proxiani Datapacker v1');
const algorithm = 'aes-256-ocb';
const ivLength = 15;
const authTagLength = 16;
const maxRandomPaddingLength = 16; // Max 255
const dataLengthUIntSize = 2;
const minDataLength = ivLength + authTagLength + dataLengthUIntSize + 1;

const createKey = (input, inputEncoding) => crypto.createHash('sha256').update(input, inputEncoding).digest();
const random = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const pack = (data, key) => {
 const buffers = [Buffer.allocUnsafe(dataLengthUIntSize)];
 let totalBufferLength = dataLengthUIntSize;
 if (key !== undefined) {
  // Max output data overhead: ivLength + authTagLength + maxRandomPaddingLength + dataLengthUIntSize + 1
  // Acceptable input data length: data.length <= 256 ** dataLengthUIntSize - max output data overhead
  const randomPaddingLength = random(0, maxRandomPaddingLength);
  const randomBytes = crypto.randomBytes(ivLength + Math.ceil(randomPaddingLength / 2));
  const iv = randomBytes.slice(0, ivLength);
  const randomPadding = randomPaddingLength > 0 ? Buffer.from(randomBytes.slice(ivLength).toString('hex').slice(0, randomPaddingLength), 'binary') : Buffer.allocUnsafe(0);
  const cipher = crypto.createCipheriv(algorithm, key, iv, { authTagLength });
  cipher.setAAD(aad);
  data = cipher.update(Buffer.concat([randomPadding, Buffer.from([random(103, 255)]), data]));
  const final = cipher.final();
  buffers.push(iv, cipher.getAuthTag(), data);
  totalBufferLength += ivLength + authTagLength;
  if (final.length > 0) {
   buffers.push(final);
   totalBufferLength += final.length;
  }
 }
 else buffers.push(data);
 totalBufferLength += data.length;
 buffers[0].writeUIntBE(totalBufferLength, 0, dataLengthUIntSize);
 return Buffer.concat(buffers, totalBufferLength);
};

const unpack = (data, key) => {
 const dataLength = data.readUIntBE(0, dataLengthUIntSize);
 data = data.slice(dataLengthUIntSize, dataLength);
 if (key !== undefined) {
  let start = 0;
  let end = ivLength;
  const iv = data.slice(start, end);
  start = end;
  const authTag = data.slice(start, end += authTagLength);
  const decipher = crypto.createDecipheriv(algorithm, key, iv, { authTagLength });
  decipher.setAAD(aad);
  decipher.setAuthTag(authTag);
  data = decipher.update(data.slice(end));
  const final = decipher.final();
  if (final.length > 0) data = Buffer.concat([data, final]);
  start = 0;
  while (data[start++] < 103);
  data = data.slice(start);
 }
 return data;
};

module.exports = {
 createKey,
 pack,
 unpack,
 random,
 dataLengthUIntSize,
 minDataLength,
 maxRandomPaddingLength,
};
