import './index.css';

let translateButton = null;
let popupElement = null;

function listen(element, event, callback) {
    element.addEventListener(event, callback);
    const offEvent = () => {
        element.removeEventListener(event, callback);
    }
    return offEvent;
}

// 监听文本选择事件
document.addEventListener('mouseup', (e) => {
    const selectedText = window.getSelection().toString().trim();
    // 如果有已存在的按钮，先移除
    if (translateButton) {
        translateButton.remove();
    }

    if (selectedText) {
        // 创建翻译按钮
        translateButton = document.createElement('div');
        translateButton.className = 'translate-button';
        translateButton.innerHTML = '译';
        translateButton.style.position = 'absolute';
        translateButton.style.left = `${e.pageX + 10}px`;
        translateButton.style.top = `${e.pageY - 10}px`;

        listen(translateButton, 'mousedown', () => {
            showTranslatePopup(selectedText, e.pageX, e.pageY, e.clientX, e.clientY)
        });

        document.body.appendChild(translateButton);

        setTimeout(() => {
            clickElsewhereToRemove(translateButton)
        });
    }
});

function clickElsewhereToRemove(element, onRemove) {
    const fn = (e) => {
        // 点击其他地方时隐藏按钮和弹窗
        if (element.contains(e.target)) {
            return;
        }
        element.remove();
        document.removeEventListener('click', fn);
        onRemove && onRemove();
    };
    document.addEventListener('click', fn);
}


async function showTranslatePopup(text, x, y, clientX, clientY) {
    if (popupElement) {
        popupElement.remove();
    }

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

    // 创建 shadow root
    const shadow = popupElement.attachShadow({ mode: 'closed' });

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
    .translate-popup {
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 16px;
      min-width: 200px;
      max-width: 400px;
      max-height: 400px;
      overflow-y: auto;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
    }
    .word{
      font-size: 24px;
      font-weight: 500;
    }

    .loading {
      color: #666;
    }

    .error {
      color: #ff4444;
    }

    .word-header {
      margin-bottom: 12px;
    }

    .phonetic {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #666;
      font-family: "Lucida Sans Unicode", sans-serif;
    }

    .audio-icon {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      padding: 4px;
      border-radius: 50%;
      background: #f0f0f0;
      transition: background-color 0.2s;
    }

    .audio-icon:hover {
      background: #e0e0e0;
    }

    .audio-icon svg {
      fill: #4285f4;
    }

    .audio-icon.playing {
      background: #4285f4;
    }

    .audio-icon.loading {
      background: #ccc;
    }

    .audio-icon.playing svg {
      fill: white;
    }

    .explanations {
      margin-bottom: 16px;
    }

    .explanation {
      margin-bottom: 12px;
    }

    .part-of-speech {
      color: #1a73e8;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .examples {
      border-top: 1px solid #eee;
      padding-top: 12px;
    }

    .example {
      margin-bottom: 12px;
      padding-left: 12px;
      border-left: 2px solid #eee;
    }

    .example .english {
      color: #333;
      margin-bottom: 4px;
    }

    .example .chinese {
      color: #666;
    }
  `;

    // 创建内容容器
    const container = document.createElement('div');
    container.className = 'translate-popup';
    container.innerHTML = '<div class="loading">正在翻译...</div>';

    // 添加样式和内容到 shadow DOM
    shadow.appendChild(style);
    shadow.appendChild(container);

    const controller = new AbortController();
    const { signal } = controller;
    document.body.appendChild(popupElement);
    clickElsewhereToRemove(popupElement, () => {
        controller.abort();
    });

    // 判断是单词还是句子
    const isWord = /^[a-zA-Z]+$/.test(text);

    const audioIcon = `
        <span class="audio-icon" title="播放发音">
            <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
        </span>
    `;

    try {
        const response = await chrome.runtime.sendMessage({
            type: 'translate',
            text: text,
            isWord: isWord
        });

        if (!response.success) {
            throw new Error(response.error);
        }

        const data = response.data;

        if (isWord && data.translation) {
            const { phonetic, phoneticType, explanations, examples } = data.translation;

            const explanationDom = explanations?.map(exp => {
                return `
          <div class="explanation">
            <div class="part-of-speech">${exp.partOfSpeech}</div>
            <div class="explanation">${exp.explanation}</div>
          </div>
        `;
            }).join("");

            const exampleDom = examples?.map(ex => {
                return `
                    <div class="example">
                        <div class="english">${ex.english}</div>
                        <div class="chinese">${ex.chinese}</div>
                    </div>
                `;
            }).join("");

            container.innerHTML = `
                <div class="content">
                <div class="word-header">
                    <div class="word">${text}</div>
                    <div class="phonetic">
                    ${phoneticType} [${phonetic || ''}] ${audioIcon}
                    </div>
                </div>
                <div class="explanations">${explanationDom}</div>
                <div class="examples">${exampleDom}</div>
                </div>
            `;
        } else {
            // 处理普通翻译结果
            container.innerHTML = `${audioIcon} <div class="content">${data.translation}<br/>${text}</div>`;
        }
        // 添加音频播放功能
        const icon = shadow.querySelector('.audio-icon');
        initPlayIcon(icon, text, signal);
    } catch (error) {
        console.error('Translation error:', error);
        container.innerHTML = '<div class="error">翻译失败，请重试</div>';
    }
} 

function initPlayIcon(audioIcon, text, signal) {
    audioIcon.addEventListener('click', async () => {
        try{
            const resp = await chrome.runtime.sendMessage({
                type: 'tts',
                text: text
            });
            const audio = new Audio();
            audio.src = resp.data;
            audio.play();
            audioIcon.classList.add('playing');

            audio.onended = () => {
                audioIcon.classList.remove('playing');
            };

            signal.addEventListener('abort', () => {
                audio.pause();
            });
        } catch(e) {
            console.error('TTS error:', e);
            audioIcon.classList.remove('playing');
            audioIcon.classList.remove('loading');
        }
    });
}