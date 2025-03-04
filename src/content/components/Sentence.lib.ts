import type { Frontend } from "../../background/types";

export function parseTTS(ttsFrontend: Frontend, text: string) {
  let result: (
    | {
      start: number;
      end: number;
      text: string;
      isSpace: false;
    }
    | {
      text: string;
      isSpace: true;
    }
  )[] = [];

  const { words } = ttsFrontend;
  words.forEach((word) => {
    const index = text.indexOf(word.word);
    if (index == -1) return;
    const firstPart = text.slice(0, index);
    const secondPart = text.slice(index + word.word.length);
    text = secondPart;

    if (firstPart) {
      result.push({
        isSpace: true,
        text: firstPart,
      });
    }
    result.push({
      start: word.start_time,
      end: word.end_time,
      isSpace: false,
      text: word.word,
    });
  });

  result.push({
    isSpace: true,
    text: text,
  });

  return result;
}
