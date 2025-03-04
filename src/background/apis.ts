/// <reference types="vite/client" />
import { getSender, registorBridgeFunction } from '../lib/bridge';
import { Stream } from '../lib/stream';
import streamJSONParse from './lib/streamJSONParse';
import { OpenAI, type Message } from './services/openai';
import { OpenSpeech } from './services/openspeach';
import type { SentenceTranslation, WordTranslation, TTSResponse, Frontend } from './types';

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

const openai = new OpenAI(
  import.meta.env.VITE_OPENAI_API_KEY,
  import.meta.env.VITE_OPENAI_BASE_URL,
);
const openspeech = new OpenSpeech(
  import.meta.env.VITE_VOLC_APPID,
  import.meta.env.VITE_VOLC_TOKEN,
);

async function handleWordTranslate(text: string) {
  const messages: Message[] = [{
    role: "system",
    content: wordPrompt,
  }, {
    role: "user",
    content: text
  }];
  const resp = await openai.completions(import.meta.env.VITE_OPENAI_MODEL, messages, {
    response_format: { type: "json_object" },
  });
  const content = JSON.parse(resp);
  const result = { isWord: true, ...content } as WordTranslation;
  result.phonetic = result.phonetic?.replace(/^(\/|\[)|(\/|\])$/g, '');
  return result;
}

async function handleSentenceTranslate(text: string) {
  const messages: Message[] = [{
    role: "system",
    content: translationPrompt,
  }, {
    role: "user",
    content: text
  }];
  const resp = await openai.streamCompletions(import.meta.env.VITE_OPENAI_MODEL, messages, {
    response_format: { type: "json_object" },
  });

  const stream = new Stream<SentenceTranslation>(undefined, 'server');
  streamJSONParse<SentenceTranslation>(resp).watch((data) => {
    stream.send({
      ...data,
      isWord: false,
      done: false,
    });
  }).wrap().then((result) => {
    stream.send({ ...result, isWord: false, done: true });
  }).catch((error) => {
    stream.sendError(error);
  });

  return stream;
}
// 处理翻译请求
async function handleTranslate(text: string) {
  const isWord = /^[a-zA-Z]+$/.test(text);

  if (isWord) {
    return handleWordTranslate(text);
  } else {
    return handleSentenceTranslate(text);
  }
}

async function handleTTS(text: string, language?: string, emotion?: string) {
  let voice_type = "BV700_V2_streaming";

  return openspeech.tts(text, {
    voice_type,
    language,
    emotion,
  });
}

function getScreenshot() {
  return new Promise<string>(resolve => chrome.tabs.captureVisibleTab(resolve));
}

async function handleOCR(image: string) {
  const text = await openai.ocr(image);
  const chunks: string[] = [];
  for await (const chunk of text) {
    chunks.push(chunk);
  }
  return chunks.join('');
}

const funcs = registorBridgeFunction({
  handleTTS,
  handleTranslate,
  handleOCR,
  getScreenshot,
} as const);

export type BridgeFunctions = typeof funcs;
