// CP-1252 special character mappings.
const special = {
 9: '  ', // Horizontal tab
 130: "'", // Single low-9 quotation mark
 132: '"', // Double low-9 quotation mark
 133: '...', // Horizontal ellipsis
 139: '<', // Single left-pointing angle quotation
 145: "'", // Left single quotation mark
 146: "'", // Right single quotation mark
 147: '"', // Left double quotation mark
 148: '"', // Right double quotation mark
 150: '-', // En dash
 151: '-', // Em dash
 152: '~', // Small tilde
 153: '(TM)', // Trade mark sign
 155: '>', // Single right-pointing angle quotation
 160: ' ', // Non-breaking space
 161: '!', // Inverted exclamation mark
 169: '(COPYRIGHT)', // Copyright sign
 171: '"', // Left double angle quotes
 173: '-', // Soft hyphen
 174: '(REGISTERED TM)', // Registered trade mark sign
 187: '"', // Right double angle quotes
 191: '?', // Inverted question mark
 215: '*', // Multiplication sign
 247: '/', // Division sign
};
const oobPrefix = Buffer.from('#$#');

// lowFilter is ASCII below 32. highFilter is ASCII above 127.
// lowFilter and highFilter can be either 0 for none, 1 for translation, and 2 for removing.
const encode = (data, { lowFilter = 0, highFilter = 1, mapSpecial = 1 } = {}) => {
 if (data.length === 0 || (data.length >= oobPrefix.length && oobPrefix.compare(data, 0, 3) === 0)) return data;
 const buffers = [];
 let mode;
 let start = 0;
 for (let i=0; i<data.length; i++) {
  if (mapSpecial && special[data[i]]) {
   if (start !== i) buffers.push(data.slice(start, i));
   start = i + 1;
   buffers.push(Buffer.from(special[data[i]]));
   continue;
  }
  if (data[i] < 32) {
   if (!lowFilter) continue;
   else mode = lowFilter;
  }
  else if (data[i] > 127) {
   if (!highFilter) continue;
   else mode = highFilter;
  }
  else continue;
  if (start !== i) buffers.push(data.slice(start, i));
  start = i + 1;
  if (mode === 1) buffers.push(Buffer.from(`%&${data[i].toString(16)}`));
 }
 if (start !== data.length) buffers.push(data.slice(start));
 return buffers.length === 1 ? buffers[0] : Buffer.concat(buffers);
};
const decode = (data, { lowFilter = 2, highFilter = 1 } = {}) => {
 if (data.length === 0 || (data.length >= oobPrefix.length && oobPrefix.compare(data, 0, 3) === 0)) return data;
 const buffers = [];
 let mode;
 let start = 0;
 let i = 0;
 while ((i = data.indexOf(37, i)) !== -1 && (i + 3) < data.length) {
  const end = i;
  let v = data[++i];
  if (v !== 38) continue;
  v = data[++i];
  if (v < 48 || v > 102 || (v > 57 && v < 97)) continue;
  v = data[++i];
  if (v < 48 || v > 102 || (v > 57 && v < 97)) continue;
  v = parseInt(data.slice(end + 2, ++i), 16);
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
