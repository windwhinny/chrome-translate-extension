import { UnexpectedCharError, type StreamReader } from "./reader";

export abstract class JSONNode {
  static start?: string;
  static end?: string;
  static startWith(char: string) {
    return char === this.start;
  }

  children: JSONNode[] = [];
  abstract value: any;
  constructor(
    public firstChar: string,
  ) { };

  public abstract parse(reader: StreamReader): Promise<void>;

  watches: {
    path: string[];
    handler: (data: any, chunk: unknown) => void;
  }[] = [];

  valueUpdated(value: any, chunk?: unknown) {
    this.watches.forEach(item => {
      if (item.path.length === 0) {
        item.handler(value, chunk);
      }
    });
  }

  watch(path: string[], handler: (data: any, chunk: unknown) => void) {
    const item = { path, handler };
    this.watches.push(item)
  }
};

export class JSONObject extends JSONNode {
  static start = '{';
  static end = '}';
  children: JSONKeyValuePair[] = [];
  get value() {
    const result = {};
    this.children.forEach(child => {
      Object.assign(result, child.value);
    });
    return result;
  }
  public async parse(reader: StreamReader) {
    while(true) {
      let char = await reader.readNextCharSkipBlank();
      if (char === JSONObject.end) break;
      if (!JSONKeyValuePair.startWith(char)) throw new UnexpectedCharError(char, reader, JSONKeyValuePair.start);
      const node = new JSONKeyValuePair(char);
      node.watches = this.watches;
      this.children.push(node);
      await node.parse(reader);
      char = await reader.readNextCharSkipBlank();
      if (char === ',') continue;
      if (char === JSONObject.end) break;
      throw new UnexpectedCharError(char, reader, `${JSONObject.end} or ,`);
    }
  }
}

export class JSONString extends JSONNode {
  static start = '"';
  static end = '"';
  value = '';

  async readUnicodeEscape(reader: StreamReader) {
    const code = await reader.readNextNChars(4);
    if (!code.match(/^[0-9a-fA-F]{4}$/)) throw new UnexpectedCharError(code, reader, '4 hex digits');
    return String.fromCharCode(parseInt(code, 16));
  }

  async readEscapedChar(reader: StreamReader) {
    const c = await reader.readNextChar();
    if (c === 'u') {
      return await this.readUnicodeEscape(reader);
    } else if (c === 'n') {
      return '\n';
    } else if (c === 'r') {
      return '\r';
    } else if (c === 't') {
      return '\t';
    } else if (c === 'b') {
      return '\b';
    } else if (c === 'f') {
      return '\f';
    }
    return c;
  }

  public async parse(reader: StreamReader) {
    this.value = '';
    while(true) {
      let c = await reader.readNextChar();
      if (c === '\\') {
        c = await this.readEscapedChar(reader);
        this.value += c;
        this.valueUpdated(this.value, c)
        continue;
      }
      if (c === '"') break;
      this.value += c;
      this.valueUpdated(this.value, c)
    }
  }
}

export class JSONKeyValuePair extends JSONNode {
  static start = JSONString.start;
  keyNode?: JSONString;
  valueNode?: JSONNode;

  get value() {
    if (!this.keyNode || !this.valueNode) return null;
    return {
      [this.keyNode.value]: this.valueNode?.value,
    } ;
  }

  valueUpdated(value: any, chunk?: unknown) {
    this.watches.forEach(item => {
      if (item.path.length === 1 && item.path[0] === this.keyNode?.value) {
        item.handler(value, chunk);
      }
    });
  }

  getChildrenWatches() {
    if (!this.keyNode) return [];
    const key = this.keyNode.value;
    return this.watches
      .filter(item => item.path[0] === key)
      .map(item => ({
        ...item,
        path: item.path.slice(1),
      }));
  }

  public async parse(reader: StreamReader) {
    const key = new JSONString(this.firstChar);
    this.keyNode = key;
    await key.parse(reader);
    let char = await reader.readNextCharSkipBlank();
    if (char !== ':') throw new UnexpectedCharError(char, reader, ':');
    char = await reader.readNextCharSkipBlank();
    const Kind = [JSONArray, JSONObject, JSONString, JSONNumber, JSONBoolean, JSONNull].find(k => {
      if (k.startWith(char)) return k;
    });
    if (!Kind) throw new UnexpectedCharError(char, reader);
    const value = new Kind(char);
    value.watches = this.getChildrenWatches();
    this.valueNode = value;
    this.children.push(value);
    await value.parse(reader);

    this.valueUpdated(this.value, null);
  }
}

export class JSONArray extends JSONNode {
  static start = '[';
  static end = ']';

  get value() {
    return this.children.map(child => child.value);
  }

  getChildrenWatches(index: number) {
    return this.watches
      .filter(item => item.path[0] === String(index))
      .map(item => ({
        ...item,
        path: item.path.slice(1),
      }));
  }

  public async parse(reader: StreamReader) {
    while(true) {
      let char = await reader.readNextCharSkipBlank();
      if (char === JSONObject.end) break;
      const Kind = [JSONArray, JSONObject, JSONString, JSONNumber, JSONBoolean, JSONNull].find(k => {
        if (k.startWith(char)) return k;
      });
      if (!Kind) throw new UnexpectedCharError(char, reader);
      const value = new Kind(char);
      this.children.push(value);
      value.watches = this.getChildrenWatches(this.children.length - 1);
      await value.parse(reader);
      char = await reader.readNextCharSkipBlank();
      if (char === ',') continue;
      if (char === JSONArray.end) break;
      throw new UnexpectedCharError(char, reader, `${JSONArray.end} or ,`);
    }
  }
}

export class JSONNumber extends JSONNode {
  str = '';
  haveDot = false;
  haveE = false;
  haveSymble = false;
  get value() {
    return Number(this.str);
  }
  get lastChar() {
    return this.str[this.str.length - 1];
  }
  numbers = '0123456789';
  isNumberChar(char: string) {
    return this.numbers.includes(char);
  }

  static startWith(char: string): boolean {
    return '0123456789+-.'.split('').includes(char);
  }
  async readInt(reader: StreamReader) {
    let str = '';
    while(true) {
      const { char, restore } = await reader.peekNextChar();
      if (char === null) {
        return str;
      }
      if (!this.isNumberChar(char)) {
        restore();
        return str;
      }
      str += char;
    }
  }
  async readNotation(reader: StreamReader) {
    let str = '';
    const char = await reader.readNextChar();
    if (!['+', '-'].includes(char)) throw new UnexpectedCharError(char, reader);
    str += char;
    str += await this.readInt(reader);
    return str;
  }

  checkValue(reader: StreamReader) {
    if (isNaN(Number(this.str))) {
      throw new UnexpectedCharError(this.str, reader);
    }
  }
  
  public async parseNumber(reader: StreamReader) {
    let first = true;
    while(true) {
      let restore = () => {};
      let char = this.firstChar;
      if (!first) {
        const r = await reader.peekNextChar();
        if (r.char === null) {
          this.checkValue(reader);
          return;
        }
        char = r.char;
        restore = r.restore;
      }
      first = false;

      if (char === '') {
      } else if (char === '-' || char === '+') {
        if (this.haveDot) throw new UnexpectedCharError(char, reader);
        if (this.haveE) throw new UnexpectedCharError(char, reader);
        if (this.haveSymble) throw new UnexpectedCharError(char, reader);
        this.haveSymble = true;
        this.str += char;
      } else if (char === '.') {
        if (this.haveDot) throw new UnexpectedCharError(char, reader);
        if (this.haveE) throw new UnexpectedCharError(char, reader);
        this.haveDot = true;
        this.str += char;
      } else if (this.isNumberChar(char)) {
        if (this.haveE) throw new UnexpectedCharError(char, reader);
        this.str += char;
        this.str += await this.readInt(reader);
      } else if (char === 'e' || char === 'E') {
        if (!this.isNumberChar(this.lastChar)) throw new UnexpectedCharError(char, reader);
        this.haveE = true;
        this.str += char;
        this.str += await this.readNotation(reader);
      } else {
        restore();
        break;
      }

      this.valueUpdated(this.value, null);
    }
  }

  public async parse(reader: StreamReader) {
    await this.parseNumber(reader);
    this.valueUpdated(this.value, null);
  }
}

export class JSONBoolean extends JSONNode {
  static startWith(char: string): boolean {
    return char === 't' || char === 'f';
  }
  value = false;
  public async parse(reader: StreamReader) {
    let char = this.firstChar + await reader.readNextNChars(3);
    if (char === 'true') {
      this.value = true;
      this.valueUpdated(this.value)
      return;
    } else {
      char += await reader.readNextChar();
      if (char === 'false') {
        this.value = false;
        this.valueUpdated(this.value)
        return;
      }
    }
    throw new UnexpectedCharError(char, reader);
  }
}

export class JSONNull extends JSONNode {
  static start = 'n';
  value = null;
  public async parse(reader: StreamReader) {
    let char = this.firstChar + await reader.readNextNChars(3);
    if (char === 'null') {
      this.valueUpdated(this.value)
      return;
    }
    throw new UnexpectedCharError(char, reader);
  }
}

export class JSONRoot extends JSONNode {
  child?: JSONNode;
  get value() {
    if (!this.child) return null;
    return this.child.value;
  }
  async parse(reader: StreamReader) {
      const char = await reader.readNextCharSkipBlank();

      const Kind = [JSONObject, JSONArray, JSONString, JSONNumber, JSONBoolean, JSONNull].find(k => {
        if (k.startWith(char)) return k;
      });

      if (!Kind) throw new UnexpectedCharError(char, reader);

      const node = new Kind(char);
      this.children.push(node);
      this.child = node;
      node.watches = this.watches;
      await node.parse(reader);
  }
}