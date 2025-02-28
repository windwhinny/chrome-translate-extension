export class NOFError extends Error {
  constructor(
    public reader: StreamReader,
    public expected?: string,
  ) {
    super()
    this.message = `Unexpected EOF while parsing at ${reader.currentPos} line ${reader.currentLines}` + (expected ? `, expected ${expected}` : '');
  }
}

export class UnexpectedCharError extends Error {
  constructor(
    public char: string,
    public reader: StreamReader,
    public expected?: string,
  ) {
    super();
    this.message = `Unexpected char: ${char} at ${reader.currentPos} line ${reader.currentLines}`+ (expected ? `, expected ${expected}` : '');
  }
}

export class StreamReader {
  buffer = '';
  loadingFinished: boolean | undefined = false;
  index = 0;
  currentLines = 0;
  currentPos = 0;

  constructor(private stream: AsyncGenerator<string, unknown, string>) {
  }

  async _readNextChar() {
    if (this.index >= this.buffer.length) {
      if (!this.loadingFinished) {
        let tmp = '';
        // If we've reached the end of the buffer, load more data
        while(true) {
          const { value, done} = await this.stream.next();
          this.loadingFinished = done;
          // If we've reached the end of the stream and got nothing, return null
          if (done) throw new NOFError(this);
          // If we got a empty string, continue reading
          if (!value) continue;
          // If we got a character, add it to the buffer and break
          tmp += value;
          break;
        }
        this.buffer += tmp;
      } else {
      // If we've already read the entire buffer, return null
        throw new NOFError(this);
      }
    }

    const char = this.buffer[this.index++];
    this.currentPos++;
    return char;
  }

  async readNextChar() {
    const char = await this._readNextChar();
    if (char === '\n') {
      this.currentLines++;
      this.currentPos = 0;
    }
    return char;
  }

  async readNextCharSkipBlank() {
    while(true) {
      const char = await this.readNextChar();
      if (char === ' ' || char === '\n') continue;
      return char;
    }
  }

  async readUntil(end: string) {
    let result = '';
    while(true) {
      let c = await this.readNextChar();
      if (c === end) return result;
      result += c;
    }
  }

  async readNextNChars(n: number) {
    let result = '';
    for (let i = 0; i < n; i++) {
      result += await this.readNextChar();
    }
    return result;
  }

  async peekNextChar() {
    let index = this.index;
    let currentPos = this.currentPos;
    let currentLines = this.currentLines;

    try {
      const char = await this.readNextChar();
      return {
        char, 
        restore: () => {
          [this.index, index] = [ index, this.index];
          [this.currentLines, currentLines] = [ currentLines, this.currentLines];
          [this.currentPos, currentPos] = [ currentPos, this.currentPos];
        },
      };
    } catch(e) {
      if (e instanceof NOFError) return {
        char: null,
        restore: () => {},
      };
      throw e;
    }
  }
}
