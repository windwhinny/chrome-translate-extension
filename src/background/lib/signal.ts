
export default class Signal<T> {
  handled = false;
  _resolve?: (value: T) => void;
  _reject?: (error: unknown) => void;

  value: T | undefined;
  error: unknown | undefined;

  resolve (value: T) {
    this.handled = true;
    this.value = value;
    this._resolve?.(value);
  }
  reject(error: unknown) {
    this.handled = true;
    this.error = this.error;
    this._reject?.(error);
  }

  wait(): Promise<T> {
    if (this.handled) {
      if (this.error) {
        return Promise.reject(this.error);
      }
      return Promise.resolve(this.value as T);
    }
    return new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }
}