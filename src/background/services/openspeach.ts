import type { Frontend, TTSResponse } from "../types";

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export class OpenSpeech {
  constructor(
    public appid: string,
    public token: string,
  ) {
  }

  get headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer;${this.token}`,
    };
  }
  
  async tts(text: string, props: {
    language?: string,
    emotion?: string,
    voice_type?: string,
  }) {
    const url = 'https://openspeech.bytedance.com/api/v1/tts';

    const payload = {
        app: {
            appid: this.appid,
            token: "1234",
            cluster: "volcano_tts",
        },
        user: {
            uid: "1234"
        },
        audio: {
            voice_type: props.voice_type,
            encoding: 'mp3',
            language: props.language,
            emotion: props.emotion,
        },
        request: {
            reqid: uuid(),
            text: text,
            operation: "query",
            with_timestamp: 1,
        }
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json() as TTSResponse;

    return {
        audio: `data:audio/mp3;base64,${data.data}`,
        duration: Number(data.addition.duration),
        frontend: JSON.parse(data.addition.frontend) as Frontend,
    }
  }
}