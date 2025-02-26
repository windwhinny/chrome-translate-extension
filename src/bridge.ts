import type { BridgeFunctions } from './background';
export function registorBridgeFunction<T extends Record<string, Function>>(funcs: T) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const { name, args } = request;
      const func = funcs[name];
      if (!func) {
        sendResponse({
          success: false,
          error: new Error(`cannot find bridge function ${name}`),
        })
        return true;
      };
  
      Promise.resolve(func(...args))
        .then((result) => {
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
>(name: Name, ...args: Args) {
  const resp = await chrome.runtime.sendMessage({
    name,
    args,
  });

  if (!resp.success) {
    throw resp.error;
  }
  return resp.result as Result;
}