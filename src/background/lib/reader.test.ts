import { beforeEach, describe, expect, it } from "vitest";
import { StreamReader } from "./reader";
import { makeGenerator } from "./lib.test";

describe('StreamReader', () => {
  let reader: StreamReader;
  beforeEach(() => {
    const generator = makeGenerator(' \n{  "a": b } ');
    reader = new StreamReader(generator());
  });

  describe('readNextChar', () => {
    it('should read correct  char', async () => {
      let char = await reader.readNextChar();
      expect(char).toBe(' ');
      char = await reader.readNextChar();
      expect(char).toBe('\n');
      char = await reader.readNextChar();
      expect(char).toBe('{');
    });
  });

  describe('readNextCharSkipBlank', () => {
    it('should read correct  char', async () => {
      let char = await reader.readNextCharSkipBlank();
      expect(char).toBe('{');
    });
  });

  describe('readUntil', () => {
    it('should read correct  char', async () => {
      let str = await reader.readUntil('}');
      expect(str).toBe(' \n{  "a": b ');
    });

    it('should throw error when read until not found', () => {
      return expect(reader.readUntil(']')).rejects.toThrow();
    });
  });
});