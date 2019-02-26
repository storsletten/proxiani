const fs = require('fs');
const path = require('path');

process.setUncaughtExceptionCaptureCallback(error => {
 try { process.send({ error }); }
 catch (error) {}
 process.exit(1);
});

process.once('message', options => {
 if (!options.searchPhrase || !options.logDir || !options.loggerID) throw `Missing options`;
 const searchPhrase = Buffer.isBuffer(options.searchPhrase) ? options.searchPhrase : Buffer.from(options.searchPhrase);
 const eol = options.eol || Buffer.from("\r\n");
 const startdate = new Date();
 const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
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
 }).sort(collator.compare).forEach(year => {
  const nYear = Number(year);
  fs.readdirSync(path.join(options.logDir, year)).filter(month => {
   if (!(/^\d{1,2}$/.test(month))) return false;
   const nMonth = Number(month);
   if (nMonth < 1 || nMonth > 12) return false;
   else if (nYear === fromYear && nYear === toYear) return nMonth >= fromMonth && nMonth <= toMonth;
   else if (nYear === fromYear) return nMonth >= fromMonth;
   else if (nYear === toYear) return nMonth <= toMonth;
   else return true;
  }).sort(collator.compare).forEach(month => {
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
   }).sort(collator.compare).forEach(fileName => {
    files.push(path.join(year, month, fileName));
   });
  });
 });
 process.send({ files });
 files.reverse().forEach(file => {
  const content = fs.readFileSync(path.join(options.logDir, file));
  const match = content.indexOf(searchPhrase);
  if (match !== -1) {
   const lineStart = content.lastIndexOf(eol, match);
   const lineEnd = content.indexOf(eol, match);
   const line = content.slice(lineStart !== -1 ? lineStart + eol.length : 0, lineEnd !== -1 ? lineEnd : content.length - 1);
   process.send({
    file,
    line: String(line),
   });
  }
 });
 process.exit();
});
