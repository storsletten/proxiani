const datapacker = require('./datapacker.js');

const iacSE = Buffer.from([255, 240]);
const eol = Buffer.from([13, 10]);

class Datapacker {
 constructor(options) {
  this.key = options.key;
  this.buffer = Buffer.allocUnsafe(0);
 }
 incoming({ data, ...rest }) {
  const chunks = [];
  if (this.buffer.length > 0) data = Buffer.concat([this.buffer, data]);
  let i;
  while (data.length >= datapacker.minDataLength && (i = data.readUIntBE(0, datapacker.dataLengthUIntSize)) <= data.length) {
   chunks.push({ ...rest, data: datapacker.unpack(data.slice(0, i), this.key) });
   data = data.slice(i);
  }
  this.buffer = data;
  return chunks;
 }
 outgoing({ data, ...rest }) {
  return [{ ...rest, data: datapacker.pack(data, this.key), passThrough: true }];
 }
}

class Line {
 constructor(options) {
  this.eol = options.eol || eol;
  this.filterBlankLines = options.filterBlankLines || false;
  this.maxBufferLength = options.maxBufferLength || 5000000;
  this.buffer = Buffer.allocUnsafe(0);
 }
 incoming({ data, ...rest }) {
  const lines = [];
  let i = this.buffer.length;
  if (i > 0) {
   data = Buffer.concat([this.buffer, data]);
   if (data.length > this.maxBufferLength) throw `Exceeded maxBufferLength`;
   i = Math.max(0, i - this.eol.length + 1);
  }
  while ((i = data.indexOf(this.eol, i)) !== -1) {
   if (i > 0 || !this.filterBlankLines) lines.push({ ...rest, data: data.slice(0, i) });
   data = data.slice(i + this.eol.length);
   i = 0;
  }
  this.buffer = data;
  return lines;
 }
 outgoing({ data, ...rest }) {
  return [{ ...rest, data: Buffer.concat([data, this.eol]) }];
 }
}

class Telnet {
 constructor(options) {
  this.rejectIAC = options.rejectIAC || false;
  this.maxBufferLength = options.maxBufferLength || 10000;
  this.buffer = Buffer.allocUnsafe(0);
 }
 incoming({ data, ...rest }) {
  const chunks = [];
  let i;
  if (this.buffer.length > 0) {
   i = 0;
   data = Buffer.concat([this.buffer, data]);
   if (data.length > this.maxBufferLength) throw `Exceeded maxBufferLength`;
  }
  else i = data.indexOf(0xff);
  while (i !== -1) {
   if (i > 0) {
    chunks.push({ ...rest, data: data.slice(0, i) });
    data = data.slice(i);
   }
   if (data.length < 3) {
    this.buffer = data;
    return chunks;
   }
   else if (data[1] === 250) {
    i = data.indexOf(iacSE, 3);
    if (i === -1) {
     this.buffer = data;
     return chunks;
    }
    i += 2;
   }
   else i = 3;
   const iac = data.slice(0, i);
   data = data.slice(i);
   chunks.push(this.rejectIAC ? { ...rest, data: Buffer.from([255, iac[1] === 253 ? 252 : 254, iac[2]]), passThrough: true, respond: true } : { ...rest, data: iac, passThrough: true, forward: true });
   i = data.indexOf(0xff);
  }
  if (data.length > 0) chunks.push({ ...rest, data });
  if (this.buffer.length > 0) this.buffer = Buffer.allocUnsafe(0);
  return chunks;
 }
}

module.exports = {
 Datapacker,
 Line,
 Telnet,
};
