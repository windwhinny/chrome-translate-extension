import { describe, it, expect } from "vitest";
import { JSONNumber } from "./json";
import { makeGenerator } from "./lib.test";
import { StreamReader } from "./reader";

describe('JSONNumber', () => {
  const cases = ['123', '.3', '123.456', '-123.456', '+123.456', '-32.', '123e-456', '123e+456', '123e-1', '123e+3'];
  it('should parse number', async () => {
    for (let str of cases) {
      const generator = makeGenerator(str);
      const num = new JSONNumber('');
      await num.parse(new StreamReader(generator()));
      expect(num.str).toBe(str);
    }
  });

  const faildCases = ['123e', '123e-', '123e+', '123e-1-', '123e+1+', '12-', '.-'];
  it('should faild', async () => {
    for (let str of faildCases) {
      const generator = makeGenerator(str);
      const num = new JSONNumber('');
      const result = num.parse(new StreamReader(generator()));
      expect(result).rejects.toThrow();
    }
  });
});