import type { Stream } from "../bridge"

export type Frontend = {
  words: {
    word: string,
    start_time: number,
    end_time: number,
    unit_type: 'text' | 'mark',
  }[]
}

export type TTSResponse = {
  data: string,
  addition: {
    duration: string,
    first_pkg: string,
    frontend: string,
  }
}

export type SentenceTranslation = {
  isWord: false,
  done: boolean,
  text?: string,
  language?: string,
  emotion?: string,
}

export type WordTranslation = {
  isWord: true,
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
export type Translation = WordTranslation | SentenceTranslation;