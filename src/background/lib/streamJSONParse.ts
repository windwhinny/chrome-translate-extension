import { JSONRoot } from "./json";
import { StreamReader, UnexpectedCharError } from "./reader";
import Signal from "./signal";

export default function streamJSONParse<T>(stream: AsyncGenerator<string, void, string>) {
  const reader = new StreamReader(stream);
  const root = new JSONRoot('');

  const signal = new Signal<T>();

  const handlers = {
    wrap() {
      return signal.wait();
    },
    watch(path: string, handler: (data: T, chunk: unknown) => void) {
      const pathArray = path.split('.');
      root.watch(pathArray, handler);
      return this;
    }
  };

  async function run() {
    try {
      await root.parse(reader);
      signal.resolve(root.value as T);
    } catch (error) {
      signal.reject(error);
    }
  }
  setTimeout(run);

  return handlers;
}
