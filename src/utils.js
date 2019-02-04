const englishOrdinalIndicator = n => {
 const s = String(n);
 const l = s[s.length - 1];
 if ('123'.indexOf(l) !== -1 && (s.length === 1 || s[s.length - 2] !== '1')) {
  const o = { '1': 'st', '2': 'nd', '3': 'rd' };
  return `${s}${o[l]}`;
 }
 else return `${s}th`;
};

const englishMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const formatDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const formatDateWordly = d => `${englishMonths[d.getMonth()]} ${englishOrdinalIndicator(d.getDate())}, ${d.getFullYear()}`;
const formatTime = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

module.exports = {
 englishOrdinalIndicator,
 englishMonths,
 formatDate,
 formatDateWordly,
 formatTime,
};
