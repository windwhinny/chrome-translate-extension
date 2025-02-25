import { ENV } from '../config/keys';

// ... 其他代码保持不变 ...
const wordPrompt = `
你是一个专业的英语词典助手，负责提供精确的单词信息。当用户输入查询单词时，请按照以下规范返回信息：
首先接收用户输入的{{查询单词}}：

请按照以下顺序提供信息：
1. 音标：使用国际音标(IPA)标注英式/美式发音，不包含音标开始和结束符号 []
- 若存在多个发音变体，优先列出主要发音
2. 释义：
- 列出前3个最常用的词性及对应释义
示例：
   • [动词] 释义内容
   • [名词] 释义内容
3. 例句：
- 为每个词性提供2-3个例句
- 包含对应中文翻译
必须遵守以下规则：
- 若单词不存在，回复："未找到'{{查询单词}}'的词典记录，请确认拼写"
- 例句必须真实存在，不得自行编造
请首先确认单词有效性，严格按以下结构输出 JSON:
{
// 音标
phonetic: string,
// 音标类型：美式、英式
phoneticType: string,
explanations: {
// 词性
partOfSpeech: string
//释义
explanation: string
}[],
// 例句
examples: {
// 英文例句
english: string,
// 中文翻译
chinese: string
}[]
}
`

type Translation = {
  // 音标
  phonetic: string,
  // 音标类型：美式、英式
  phoneticType: string,
  explanations: {
  // 词性
  partOfSpeech: string
  //释义
  explanation: string
  }[],
  // 例句
  examples: {
  // 英文例句
  english: string,
  // 中文翻译
  chinese: string
  }[]
}

export type TranslateResult = Awaited<ReturnType<typeof handleTranslate>>;

// 处理翻译请求
async function handleTranslate(text: string, isWord: boolean) {
  try {
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ENV.ARK_TOKEN}`
      },
      body: JSON.stringify({
        model: ENV.ARK_MODEL,
        messages: [{
          role: "system",
          content: isWord ? 
            wordPrompt:
            "你是一个翻译助手。请直接返回翻译结果，不要包含任何解释或额外信息。"
        }, {
          role: "user",
          content: text
        }]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    const content = data.choices[0].message.content;

    return {
        isWord,
        translation: isWord ? JSON.parse(content) as Translation : content as string,
    } as {
      isWord: true,
      translation: Translation,
    } | {
      isWord: false,
      translation: string,
    };
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function handleTTS(text: string) {
  const response = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer;${ENV.VOLC_TOKEN}`,
    },
    body: JSON.stringify({
        app: {
            appid: ENV.VOLC_APPID,
            token: "1234",
            cluster: "volcano_tts",
        },
        user: {
            uid: "1234"
        },
        audio: {
            voice_type: "BV421_streaming",
            encoding: 'mp3'
        },
        request: {
            reqid: uuid(),
            text: text,
            operation: "query",
        }
    }),
  });

  const data = await response.json();

  return `data:audio/mp3;base64,${data.data}`;
}

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('划词翻译扩展已安装');
});

// 处理来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'translate') {
    handleTranslate(request.text, request.isWord)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开放，等待异步响应
  } else if (request.type === 'tts') {
    handleTTS(request.text)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开放，等待异步响应
  }
});
