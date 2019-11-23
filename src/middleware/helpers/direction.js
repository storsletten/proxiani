const calculate2d = (you, target) => {
 const [tx, ty] = [Number(target.x), Number(target.y)];
 const [yx, yy] = [Number(you.x), Number(you.y)];
 const [dx, dy] = [tx - yx, ty - yy];
 const [dxa, dya] = [Math.abs(dx), Math.abs(dy)];
 const distance = Math.max(dxa, dya);
 const dir = [];
 if (distance) {
  if (dx !== 0) dir.push(`${distance > 1 ? dxa : ''}${dx > 0 ? 'E' : 'W'}`);
  if (dy !== 0) dir.push(`${distance > 1 ? dya : ''}${dy > 0 ? 'S' : 'N'}`);
 }
 else dir.push('Here');
 return { dx, dy, dir: dir.join(' '), distance };
};
const calculate3d = (you, target) => {
 const [tx, ty, tz] = [Number(target.x), Number(target.y), Number(target.z)];
 const [yx, yy, yz] = [Number(you.x), Number(you.y), Number(you.z)];
 const [dx, dy, dz] = [tx - yx, ty - yy, tz - yz];
 const [dxa, dya, dza] = [Math.abs(dx), Math.abs(dy), Math.abs(dz)];
 const distance = Math.max(dxa, dya, dza);
 const dir = [];
 if (distance) {
  if (dx !== 0) dir.push(`${distance > 1 ? dxa : ''}${dx > 0 ? 'E' : 'W'}`);
  if (dy !== 0) dir.push(`${distance > 1 ? dya : ''}${dy > 0 ? 'S' : 'N'}`);
  if (dz !== 0) dir.push(`${distance > 1 ? dza : ''}${dz > 0 ? 'D' : 'U'}`);
 }
 else dir.push('Here');
 return { dx, dy, dz, dir: dir.join(' '), distance };
};

const here2d = (first, second) => first.x == second.x && first.y == second.y;
const here3d = (first, second) => first.x == second.x && first.y == second.y && first.z == second.z;

module.exports = {
 calculate2d,
 calculate3d,
 here2d,
 here3d,
};
