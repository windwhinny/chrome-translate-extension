export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string | {
    type: string;
    image_url?: string;
    text?: string;
    min_pixels?: number;
    max_pixels?: number;
  }[];
}

export class OpenAI {

  constructor(
    public apiKey: string,
    public baseUrl: string,
  ) {
  }

  get headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  handleResponse<
    T extends boolean | undefined,
    U = T extends true ? AsyncGenerator<string> : Promise<string>,
  >(
    res: Response,
    stream: T,
  ): U {
    if (stream) {
      async function* result() {
        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error('Response body is null or undefined');
        }
        let buffer = '';
        while (true) {
          const read = await reader.read();
          if (read.done) {
            break;
          }

          const text = new TextDecoder().decode(read.value);
          buffer += text;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                return;
              }

              try {
                const json = JSON.parse(data);
                const delta = json.choices[0]?.delta;
                if (delta?.content) {
                  yield delta.content;
                }
              } catch (e) {
                console.warn('Failed to parse chunk:', e);
              }
            }
          }
        }
      }
      return result() as U;
    } else {
      return Promise.resolve(res.json())
        .then((data) => {
          if (data.error) {
            throw new Error(data.error.message);
          }
          return data.choices[0].message.content as string;
        }) as U;
    }
  }

  completionsReq(model: string, messages: Message[], stream: boolean, options: Record<string, any> = {}) {
    const url = `${this.baseUrl}/chat/completions`;
    return fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model,
        messages,
        stream,
        ...options,
      }),
    });
  }

  async streamCompletions(model: string, messages: Message[], options?: Record<string, any>) {
    const resp = await this.completionsReq(model, messages, true, options);
    return this.handleResponse(resp, true);
  }

  async completions(model: string, messages: Message[], options?: Record<string, any>) {
    const resp = await this.completionsReq(model, messages, false, options);
    return this.handleResponse(resp, false);
  }

  async ocr(image: string) {
    const resp = await this.completionsReq(import.meta.env.VITE_OPENAI_VLM_MODEL, [{
      'role': 'user',
      content: [{
        "type": "image_url",
        "image_url": image,
        "min_pixels": 28 * 28 * 4,
        "max_pixels": 28 * 28 * 1280
      }, {
        type: 'text',
        text: '将图片里的内容翻译成中文，尽量保持原有格式。'
      }]
    }], true);
    return this.handleResponse(resp, true);
  }
}
