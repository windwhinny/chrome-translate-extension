import { describe, it, expect, beforeEach } from 'vitest';
import streamJSONParser from './streamJSONParser';
import { makeGenerator } from './lib.test';

describe('streamJSONParse', () => {
  it('should return a stream of JSON objects', async () => {
    const data = {
      name: 'John',
      age: 30,
      city: 'New York',
      address: {
        street: '123 Main St',
        city: 'New York',
        zip: '10001'
      },
      hobbies: ['reading', 'traveling', 'cooking', {
        type: 'game',
        name: 'Dota 2',
        records: [
          {
            date: '2024-01-01',
            score: 10000
          }
        ]
      }],
      isAdmin: false,
      tags: null,
      luckyNumbers: [1, 2, 3, 4, 5]
    };
    const gen = makeGenerator(JSON.stringify(data));
    const result = await streamJSONParser(gen())
    .wrap();
    expect(result).toEqual(data);
  });
});