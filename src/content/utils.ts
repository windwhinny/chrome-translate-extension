export function clickElsewhereToRemove(element: HTMLElement, onRemove?: () => void) {
  const fn = (e: MouseEvent) => {
    // 点击其他地方时隐藏按钮和弹窗
    if (element.contains(e.target as Node)) {
      return;
    }
    element.remove();
    document.removeEventListener('click', fn);
    onRemove && onRemove();
  };
  document.addEventListener('click', fn);
}

export function listen(element: HTMLElement, event: string, callback: EventListenerOrEventListenerObject) {
  element.addEventListener(event, callback);
  const offEvent = () => {
    element.removeEventListener(event, callback);
  }
  return offEvent;
}

export function removeAfter(time: number, element: HTMLElement) {
  setTimeout(() => {
    element.remove();
  }, time);
}