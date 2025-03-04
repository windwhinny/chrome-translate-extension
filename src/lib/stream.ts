import type { MessageEvent } from './type';
export const STREAM_TYPE = "____FIXED_STREAM_TYPE____";
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
