import { JSONRoot } from "./json";
import { StreamReader, UnexpectedCharError } from "./reader";
import Signal from "./signal";

type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export default function streamJSONParser<T>(stream: AsyncGenerator<string>) {
  const reader = new StreamReader(stream);
  const root = new JSONRoot('');

  const signal = new Signal<T>();

  const handlers = {
    wrap() {
      return signal.wait();
    },
    watch(handler: (data: DeepPartial<T>) => void) {
      root.watch(() => {
        handler(root.value);
      });
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
