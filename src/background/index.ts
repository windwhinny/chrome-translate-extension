/// <reference types="vite/client" />
import { registorBridgeFunction } from '../bridge';
import type { SentenceTranslation, WordTranslation, TTSResponse, Frontend } from './types';

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

const emotionMap = {
  "严肃": "serious",
  "旁白-舒缓": "narrator",
  "旁白-沉浸": "narrator_immersive",
  "安慰鼓励": "comfort",
  "撒娇": "lovey-dovey",
  "可爱元气": "energetic",
  "绿茶": "conniving",
  "傲娇": "tsundere",
  "娇媚": "charming",
  "讲故事": "storytelling",
  "情感电台": "radio",
  "瑜伽": "yoga",
  "广告": "advertising",
  "助手": "assistant",
  "自然对话": "chat",
  "愉悦": "pleased",
  "抱歉": "sorry",
  "嗔怪": "annoyed",
  "开心": "happy",
  "悲伤": "sad",
  "愤怒": "angry",
  "害怕": "scare",
  "厌恶": "hate",
  "惊讶": "surprise",
  "哭腔": "tear",
  "平和": "novel_dialog"
  }

const translationPrompt = `
将下面语句翻译成中文/英文。
给出原始文本的{语种}，语种可以为： en/zh/jp/kr/fr。
根据原文内容，判断原文的{语气}，语气可以为：严肃、旁白-舒缓、旁白-沉浸、安慰鼓励、撒娇、可爱元气、绿茶、傲娇、娇媚、讲故事、情感电台、瑜伽、广告、助手、自然对话、愉悦、抱歉、嗔怪、开心、悲伤、愤怒、害怕、厌恶、惊讶、哭腔、平和

将结果严格按照以下JSON格式输出：
{
"origin": "{原始文本}",
"text": "{翻译结果}",
"language": "{语种}",
"emotion": "{语气}"
}`

export type TranslateResult = Awaited<ReturnType<typeof handleTranslate>>;

// 处理翻译请求
async function handleTranslate(text: string) {
  const isWord = /^[a-zA-Z]+$/.test(text);
  try {
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_ARK_TOKEN}`
      },
      body: JSON.stringify({
        model: import.meta.env.VITE_ARK_MODEL,
        messages: [{
          role: "system",
          content: isWord ?  wordPrompt: translationPrompt
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

    const content = JSON.parse(data.choices[0].message.content);

    if (!isWord) {
      content.emotion = emotionMap[content.emotion as keyof typeof emotionMap];
    }
    
    return { isWord, ...content } as WordTranslation | SentenceTranslation;
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

export type TTSResule = Awaited<ReturnType<typeof handleTTS>>;
async function handleTTS(text: string, language?: string, emotion?: string) {
  let voice_type = "BV700_V2_streaming";

  if (language === 'zh'){
    voice_type = "BV700_V2_streaming";
  } else if (language === 'en') {
    voice_type = 'BV138_streaming';
  } else if (language === 'jp') {
    voice_type = 'BV421_streaming';
  }
  const response = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer;${import.meta.env.VITE_VOLC_TOKEN}`,
    },
    body: JSON.stringify({
        app: {
            appid: import.meta.env.VITE_VOLC_APPID,
            token: "1234",
            cluster: "volcano_tts",
        },
        user: {
            uid: "1234"
        },
        audio: {
            voice_type,
            encoding: 'mp3',
            language,
            emotion,
        },
        request: {
            reqid: uuid(),
            text: text,
            operation: "query",
            with_timestamp: 1,
        }
    }),
  });

  const data = await response.json() as TTSResponse;

  return {
    audio: `data:audio/mp3;base64,${data.data}`,
    duration: Number(data.addition.duration),
    frontend: JSON.parse(data.addition.frontend) as Frontend,
  }
}

const funcs = registorBridgeFunction({
  handleTTS,
  handleTranslate,
} as const);

export type BridgeFunctions = typeof funcs;
