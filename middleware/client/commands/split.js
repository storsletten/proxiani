const usage = `Usage: SPLIT <amount>/<people>, where <people> is the number of people who should receive the reward (including yourself).`;
const split = data => {
 data.forward.pop();
 data.command = data.input.trim().split(/\s+/);
 if (data.command.length === 1 || data.command[1].indexOf('/') < 1) data.respond.push(usage);
 else {
  const [amount, people] = data.command[1].replace(/[,\s]/g, '').split('/', 2).map(v => Number(v));
  if (isNaN(amount) || isNaN(people)) data.respond.push(usage);
  else if (people < 2) data.reward.push(`You can't split that amount with less than 2 people, including yourself.`);
  else if (amount < people) data.respond.push(`You need to give at least one credit to each person, including yourself.`);
  else data.forward.push(`share ${amount - (amount / people)}`);
 }
};

module.exports = split;
