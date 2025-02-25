import styles from './index.module.css';
import { showTranslatePopup } from './popup';
import { clickElsewhereToRemove, listen, removeAfter } from './utils';

let translateButton: null | HTMLElement = null;

// 监听文本选择事件
document.addEventListener('mouseup', (e) => {
  if (!window) return;
  const selectedText = window.getSelection()?.toString().trim();
  // 如果有已存在的按钮，先移除
  if (translateButton) {
    translateButton.remove();
  }

  if (selectedText) {
    // 创建翻译按钮
    translateButton = document.createElement('div');
    translateButton.className = styles.translateButton;
    translateButton.innerHTML = '译';
    translateButton.style.position = 'absolute';
    translateButton.style.left = `${e.pageX + 10}px`;
    translateButton.style.top = `${e.pageY - 10}px`;

    listen(translateButton, 'mousedown', () => {
      showTranslatePopup(selectedText, e.pageX, e.pageY, e.clientX, e.clientY)
    });

    document.body.appendChild(translateButton);

    setTimeout(() => {
      if (!translateButton) return;
      clickElsewhereToRemove(translateButton)
    });

    removeAfter(3000, translateButton);
  }
});


