const encode = (data, { lowFilter = 0, highFilter = 1 } = {}) => {
 if (data.length === 0) return data;
 const buffers = [];
 let mode;
 let start = 0;
 for (let i=0; i<data.length; i++) {
  if (data[i] < 32) mode = lowFilter;
  else if (data[i] > 127) mode = highFilter;
  else mode = 0;
  if (mode > 0) {
   if (start !== i) buffers.push(data.slice(start, i));
   start = i + 1;
   if (mode === 1) buffers.push(Buffer.from(`%${data[i].toString(16)}`));
  }
 }
 if (start !== data.length) buffers.push(data.slice(start));
 return buffers.length === 1 ? buffers[0] : Buffer.concat(buffers);
};
const decode = (data, { lowFilter = 2, highFilter = 1 } = {}) => {
 if (data.length === 0) return data;
 const buffers = [];
 let mode;
 let start = 0;
 let i = 0;
 while ((i = data.indexOf(37, i)) !== -1 && (i + 2) < data.length) {
  const end = i;
  let v = data[++i];
  if (v < 48 || v > 102 || (v > 57 && v < 97)) continue;
  v = data[++i];
  if (v < 48 || v > 102 || (v > 57 && v < 97)) continue;
  v = parseInt(data.slice(end + 1, ++i), 16);
  if (v < 32) mode = lowFilter;
  else if (v > 127) mode = highFilter;
  else mode = 0;
  if (mode > 0) {
   if (start !== end) buffers.push(data.slice(start, end));
   start = i;
   if (mode === 1) buffers.push(Buffer.from([v]));
  }
 }
 if (start !== data.length) buffers.push(data.slice(start));
 return buffers.length === 1 ? buffers[0] : Buffer.concat(buffers);
};

module.exports = {
 encode,
 decode,
};
