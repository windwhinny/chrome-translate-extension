export function makeGenerator(str: string) {
  return async function* () {
    let last = 0;
    for (let i = 0; i < str.length;) {
      if (i == 0) {
        i++;
        continue;
      }

      const step = Math.round(Math.random() * 1000 % 10);
      i = Math.min(i + step, str.length)

      yield str.slice(last, i);
      last = i;
    }
  };
}