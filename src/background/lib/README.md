# streamJSONParser
json.ts 是一个流式 JSON 解析工具

## 使用方法
```typescript
import streamJSONParser from "./streamJSONParser";
const parser = new streamJSONParser();

const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time));

const stream = async function* () {
  yield '{"key1":';
  await sleep(100);
  yield '"value", "key2": 1234,';
  await sleep(100);
  yield '"key3": true }';
};

await streamJSONParser(stream())
  .watch((result) => {
    console.log(result);
  })
  .wrap();

// output
{ key1: 'value' }
{ key1: 'value', key2: 1234 }
{ key1: 'value', key2: 1234, key3: true }
```