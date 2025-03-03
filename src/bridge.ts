import type { BridgeFunctions } from './background';

type MessageEvent<T> = {
  type: 'stream' | 'invoke',
  name: string,
  payload: T,
  error?: undefined,
} | {
  type: 'stream' | 'invoke',
  name: string,
  payload: undefined,
  error: Error,
}

const STREAM_TYPE = "____FIXED_STREAM_TYPE____";
export class Stream<Payload extends { done: boolean }> {
  id: string;
  cache: MessageEvent<Payload | undefined>[] = [];
  port?: chrome.runtime.Port;

  toJSON() {
    return { id: this.id };
  }

  constructor(id?: string, type: 'client' | 'server' = 'client') {
    if (!id) {
      this.id = Math.random().toString(36).substring(2, 15);
    } else {
      this.id = id;
    }
    if (type === 'server') {
      this.initServer();
    } else {
      this.initClient();
    }
  }

  initServer() {
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name !== this.id) return;
      this.port = port;
      this.flush();
    });
  }

  initClient() {
    this.port = chrome.runtime.connect({
      name: this.id,
    });
  }

  flush() {
    if (!this.port) return;
    if (this.cache.length === 0) return;
    this.port.postMessage(this.cache.shift() as MessageEvent<Payload>);
  }

  send(payload: Payload) {
    console.log('send', payload);
    this.cache.push({
      type: 'stream',
      name: this.id,
      payload,
    });
    this.flush();
  }

  sendError(error: Error) {
    this.cache.push({
      type: 'stream',
      name: this.id,
      error,
    } as MessageEvent<undefined>);
    this.flush();
  }

  on(callback: (payload?: Payload, error?: Error) => void) {
    const fn = (request: MessageEvent<Payload>) => {
      const { type, name, payload, error } = request;
      if (type !== 'stream') return;
      if (name !== this.id) return;

      if (error) {
        callback(undefined, error);
      } else {
        callback(payload);
        if (payload?.done) {
          this.port?.disconnect();
        }
      }
    };
    this.port?.onMessage.addListener(fn);
  }
}

export function registorBridgeFunction<T extends Record<string, Function>>(funcs: T) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const { type, name, payload = [] } = request as MessageEvent<any[]>;
    if (type !== 'invoke') return;
    const func = funcs[name];
    if (!func) {
      sendResponse({
        success: false,
        error: new Error(`cannot find bridge function ${name}`),
      })
      return true;
    };

    Promise.resolve(func(...payload))
      .then((result) => {
        if (result instanceof Stream) {
          result = { ...result.toJSON(), _type: STREAM_TYPE };
        }
        sendResponse({
          success: true,
          result,
        });
      }, (error) => {
        sendResponse({
          success: false,
          error,
        });
      });
    return true;
  });
  return funcs;
}

export async function invoke<
  Name extends keyof BridgeFunctions,
  Func extends BridgeFunctions[Name],
  Args extends Parameters<Func>,
  Result extends ReturnType<Func>
>(name: Name, ...payload: Args) {
  const resp = await chrome.runtime.sendMessage({
    type: 'invoke',
    name,
    payload,
  } as MessageEvent<any[]>);

  if (!resp.success) {
    throw resp.error;
  }

  if (resp.result._type === STREAM_TYPE) {
    return new Stream(resp.result.id) as Awaited<Result>;
  }
  return resp.result as Awaited<Result>;
}