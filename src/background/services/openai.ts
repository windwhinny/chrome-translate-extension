export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
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

  async completions(model: string, messages: Message[]) {
    const url = `${this.baseUrl}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ model, messages }),
    });

    const data = await res.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
    return data.choices[0].message;
  }
}