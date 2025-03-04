export type ClickPos = {
    pageX: number,
    pageY: number,
    clientX: number,
    clientY: number,
}
export type TranslateIntend = {
    data: string,
    type: 'text' | 'image',
    clickPos: ClickPos,
}

