const fs = require('fs');
const path = require('path');

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const beginSearch = options => {
 const caseSensitive = options.caseSensitive !== false;
 const searchPhrase = caseSensitive ? options.searchPhrase : options.searchPhrase.toLowerCase();
 const maxHitsPerFile = options.maxHitsPerFile || 1;
 const eol = options.eol || "\r\n";
 const startdate = new Date();
 const fromDateObject = options.fromDateObject || new Date(0);
 const toDateObject = options.toDateObject || new Date();
 const fromYear = fromDateObject.getFullYear();
 const toYear = toDateObject.getFullYear();
 const fromMonth = fromDateObject.getMonth() + 1;
 const toMonth = toDateObject.getMonth() + 1;
 const fromDate = fromDateObject.getDate();
 const toDate = toDateObject.getDate();
 const fileNameEnding = `, ${options.loggerID}.txt`;
 const files = [];
 fs.readdirSync(options.logDir).filter(year => {
  if (!(/^\d{4}$/.test(year))) return false;
  const nYear = Number(year);
  return nYear >= fromYear && nYear <= toYear;
 }).sort(collator.compare).reverse().forEach(year => {
  const nYear = Number(year);
  fs.readdirSync(path.join(options.logDir, year)).filter(month => {
   if (!(/^\d{1,2}$/.test(month))) return false;
   const nMonth = Number(month);
   if (nMonth < 1 || nMonth > 12) return false;
   else if (nYear === fromYear && nYear === toYear) return nMonth >= fromMonth && nMonth <= toMonth;
   else if (nYear === fromYear) return nMonth >= fromMonth;
   else if (nYear === toYear) return nMonth <= toMonth;
   else return true;
  }).sort(collator.compare).reverse().forEach(month => {
   const nMonth = Number(month);
   fs.readdirSync(path.join(options.logDir, year, month)).filter(fileName => {
    if (!fileName.endsWith(fileNameEnding)) return false;
    const m = fileName.match(/^(\d{1,2})\w/);
    if (!m) return false;
    const nDate = Number(m[1]);
    if (nDate < 1 || nDate > 31) return false;
    const bFrom = nYear === fromYear && nMonth === fromMonth;
    const bTo = nYear === toYear && nMonth === toMonth;
    if (bFrom && bTo) return nDate >= fromDate && nDate <= toDate;
    else if (bFrom) return nDate >= fromDate;
    else if (bTo) return nDate <= toDate;
    else return true;
   }).sort(collator.compare).reverse().forEach(fileName => {
    const content = fs.readFileSync(path.join(options.logDir, year, month, fileName), { encoding: 'binary' });
    const contentLowercase = caseSensitive ? null : content.toLowerCase();
    let pos = 0;
    for (let fileHit=0; fileHit<maxHitsPerFile; fileHit++) {
     const match = caseSensitive ? content.indexOf(searchPhrase, pos) : contentLowercase.indexOf(searchPhrase, pos);
     if (match !== -1) {
      const [date] = fileName.match(/^\d+/);
      let lineStart = content.lastIndexOf(eol, match);
      lineStart = lineStart !== -1 ? lineStart + eol.length : 0;
      let lineEnd = content.indexOf(eol, match);
      if (lineEnd === -1) lineEnd = content.length;
      let line = content.slice(lineStart, lineEnd);
      const m = line.match(/\t\[(\d{2}:\d{2}:\d{2})\]$/);
      let time;
      if (m) {
       line = line.slice(0, line.length - m[0].length);
       time = m[1];
      }
      else {
       const i = content.lastIndexOf("\t[", lineStart - 1);
       if (i !== -1) {
        const m = content.slice(i, lineStart).match(/^\t\[(\d{2}:\d{2}:\d{2})\]/);
        if (m) time = m[1];
       }
      }
      process.send({ year, month, date, time, line });
      pos = lineEnd + eol.length;
     }
     else break;
    }
   });
  });
 });
};

process.once('message', options => {
 try {
  if (!options.searchPhrase || !options.logDir || !options.loggerID) throw `Missing options`;
  beginSearch(options);
  process.exit();
 }
 catch (error) {
  process.send({ error: error.message });
  process.exit(1);
 }
});
