const fs = require('fs');
const MAX_RAND = 10000000;
const SAMPLES = 100000;
const itemsToGet = [];
for (let i = 0; i < SAMPLES; i++) {
  const items = Math.trunc(Math.random()*MAX_RAND);
  itemsToGet.push(items)
}

const result = Object.keys(itemsToGet.reduce((res, cur)=>{
  res[cur] = 1;
  return res;
},{})).map(k => parseInt(k,10))

const randomize = (list, )=>{
  const result = [...list];
  for(let i = 0; i < result.length; i++){
    const from = Math.ceil(Math.random() * result.length);
    const to = Math.ceil(Math.random() * result.length);
    const tmp = result[to]
    result[to] = result[from]
    result[from] = tmp
  }
  return result;
}

fs.writeFileSync('test_data.json',
JSON.stringify(randomize(result)));


