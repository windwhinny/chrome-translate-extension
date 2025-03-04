export type MessageEvent<T> = {
  type: 'stream' | 'invoke',
  name: string,
  payload: T,
  error?: undefined,
} | {
  type: 'stream' | 'invoke',
  name: string,
  payload: undefined,
  error: Error,
}
