import { TranslateResult } from '../background/index';
import styles from './index.module.css';
import { clickElsewhereToRemove } from './utils';

function buildPopup(x: number, y: number, clientX: number, clientY: number) {
 // 创建容器元素
  popupElement = document.createElement('div');
  popupElement.style.position = 'absolute';
  // 获取视口尺寸
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let popupWidth = 400;
  let popupHeight = 400;

  let left = x + 10;
  let top = y + 10;

  if (clientX + 10 + popupWidth > viewportWidth) {
    left = left - (clientX + popupWidth - viewportWidth) - 10;
  }

  if (clientY + 10 + popupHeight > viewportHeight) {
    top = top - (clientY + popupHeight - viewportHeight) - 10;
  }

  // 确保不会超出左边界和上边界
  left = Math.max(10, left);
  top = Math.max(10, top);

  popupElement.style.left = `${left}px`;
  popupElement.style.top = `${top}px`;
  popupElement.style.zIndex = '10000';
  return popupElement;
}

let popupElement: null | HTMLElement = null;
export async function showTranslatePopup(text: string, x: number, y: number, clientX: number, clientY: number) {
  if (popupElement) {
    popupElement.remove();
  }

  popupElement = buildPopup(x, y, clientX, clientY);

  // 创建内容容器
  const container = document.createElement('div');
  container.className = styles.popup;
  container.innerHTML = `<div class="${styles.loading}">正在翻译...</div>`;

  popupElement.append(container);

  const controller = new AbortController();
  const { signal } = controller;
  document.body.appendChild(popupElement);
  clickElsewhereToRemove(popupElement, () => {
    controller.abort();
  });

  // 判断是单词还是句子
  const isWord = /^[a-zA-Z]+$/.test(text);


  try {
    const response = await chrome.runtime.sendMessage({
      type: 'translate',
      text: text,
      isWord: isWord
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    const data = response.data as TranslateResult;

    const audioIcon = `
        <span class="${styles.audioIcon}" title="播放发音">
            <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
        </span>
    `;

    if (data.isWord && data.translation) {
      const { phonetic, phoneticType, explanations, examples } = data.translation;

      const explanationDom = explanations?.map(exp => {
        return `
          <div class="${styles.explanation}">
            <div class="${styles.partOfSpeech}">${exp.partOfSpeech}</div>
            <div class="${styles.explanation}">${exp.explanation}</div>
          </div>
        `;
      }).join("");

      const exampleDom = examples?.map(ex => {
        return `
            <div class="${styles.example}">
                <div class="${styles.english}">${ex.english}</div>
                <div class="${styles.chinese}">${ex.chinese}</div>
            </div>
        `;
      }).join("");

      container.innerHTML = `
        <div class="${styles.wordHeader}">
            <div class="${styles.word}">${text}</div>
            <div class="${styles.phonetic}">
            ${phoneticType} [${phonetic || ''}] ${audioIcon}
            </div>
        </div>
        <div class="${styles.explanations}">${explanationDom}</div>
        <div class="${styles.examples}">${exampleDom}</div>
      `;
    } else {
      // 处理普通翻译结果
      container.innerHTML = `${audioIcon}<div class="${styles.longTextCN}">${data.translation}</div><div class="${styles.longTextEN}">${text}</div>`;
    }
    // 添加音频播放功能
    const icon: HTMLElement | null = container.querySelector(`.${styles.audioIcon}`);
    if (!icon) return;
    initPlayIcon(icon, text, signal);
  } catch (error) {
    console.error('Translation error:', error);
    container.innerHTML = `<div class="${styles.error}">翻译失败，请重试</div>`;
  }
}

function initPlayIcon(audioIcon: HTMLElement, text: string, signal: AbortSignal) {
  const audio = new Audio();
  audioIcon.addEventListener('click', async () => {
    try {
      if (!audio.src) {
        audioIcon.classList.add(styles.audioLoading);
        const resp = await chrome.runtime.sendMessage({
          type: 'tts',
          text: text
        });
        
        audio.src = resp.data;
      }
      audio.currentTime = 0;
      audio.play();
      audioIcon.classList.remove(styles.audioLoading);
      audioIcon.classList.add(styles.playing);

      audio.onended = () => {
        audioIcon.classList.remove(styles.playing);
      };

      signal.addEventListener('abort', () => {
        audio.pause();
      });
    } catch (e) {
      console.error('TTS error:', e);
      audioIcon.classList.remove(styles.playing);
      audioIcon.classList.remove(styles.audioLoading);
    }
  });
}