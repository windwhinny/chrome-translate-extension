import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { OpenAI } from './openai';

describe('OpenAI', () => {
  let openai: OpenAI;
  const model = import.meta.env.VITE_OPENAI_MODEL;

  beforeEach(() => {
    openai = new OpenAI(
      import.meta.env.VITE_OPENAI_API_KEY,
      import.meta.env.VITE_OPENAI_BASE_URL,
    );
  })

  it('stream completions should return AsyncGenerator with correct content', async () => {
    const res = await openai.streamCompletions(model, [{
      role: 'user',
      content: '严格输出下列文字：大炮不能打蚊子',
    }]);
    
    const chunks: string[] = [];
    expect(res).not.toBe('大炮不能打蚊子');
    for await (const chunk of res) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toBe('大炮不能打蚊子');
  });

  it('completions should return string with correct content', async () => {
    const res = await openai.completions(model, [{
      role: 'user',
      content: '严格输出下列文字：大炮不能打蚊子',
    }]);
    expect(res).toBe('大炮不能打蚊子');
  });
});
