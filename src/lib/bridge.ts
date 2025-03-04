import type { BridgeFunctions } from '../background/apis';
import type { MessageEvent } from './type';
import { Stream, STREAM_TYPE } from './stream';

let sender: chrome.runtime.MessageSender | null = null;
export function getSender() {
  return sender;
}

export function setSender(s: chrome.runtime.MessageSender) {
  sender = s;
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

    setSender(sender);
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
          error: {
            message: error.message,
            stack: error.stack,
          },
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