module.exports = (data, middleware, linkedMiddleware) => {
 if (data.input.length === 0 || data.input.startsWith('#$#')) return false;
 if (data.input[0] === '(' || data.input.startsWith('[From Outside]')) {
  const feeds = [];
  let str = data.input;
  while (feeds.length < 10) {
   if (str.startsWith('[From Outside]')) {
    feeds.push('From Outside');
    str = str.slice(15);
   }
   else {
    const m = str.match(/^\(([^)]+)\) /);
    if (m) {
     feeds.push(m[1]);
     str = str.slice(m[1].length + 3);
    }
    else break;
   }
  }
  if (feeds.length > 0) {
   const hideLabels = middleware.persistentStates.immersiveFeeds;
   if (hideLabels && (hideLabels === true || feeds.includes(hideLabels))) data.forward[0] = str;
   else if (feeds.length > 1 || feeds[0] !== 'From Outside') data.forward[0] = `(${feeds.join(' | ')}) ${str}`;
   return true;
  }
 }
};
