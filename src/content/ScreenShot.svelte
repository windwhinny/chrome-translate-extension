<script module lang="ts">
    import { invoke } from "../lib/bridge";
  import type { TranslateIntend } from "./types";
  export type Props = {
    intend: TranslateIntend | null,
  }
</script>
<script lang="ts"> 
  let { intend= $bindable() }: Props = $props();
  let show = $state(false);
  let isSelecting = $state(false);
  let startX = $state(0);
  let startY = $state(0);
  let endX = $state(0);
  let endY = $state(0);
  let streamId = $state('');

  function handleMouseDown(event: MouseEvent) {
    if (!show) return;
    event.preventDefault(); 
    isSelecting = true;
    startX = event.clientX;
    startY = event.clientY;
    endX = event.clientX;
    endY = event.clientY;
  }

  function handleMouseMove(event: MouseEvent) {
    if (!isSelecting) return;
    
    endX = event.clientX;
    endY = event.clientY;
  }

  async function handleMouseUp(event: MouseEvent) {
    if (!isSelecting) return;
    
    isSelecting = false;
    show = false;
    
    endX = event.clientX;
    endY = event.clientY;

    // Calculate the selection area parameters
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    
    await new Promise(resolve => setTimeout(resolve));
    const image = await getClipedImage(x,  y, width, height);
    const text = await invoke('handleOCR', image);
    intend = {
      text,
      clickPos: {
        clientX: event.clientX,
        clientY: event.clientY,
        pageX: event.pageX,
        pageY: event.pageY,
      },
    };
  }

  async function getClipedImage(left: number, top: number, width: number, height: number) {
    const image = new Image();
    const src = await invoke('getScreenshot');
    image.src = src;
    await new Promise(resolve => image.onload = resolve);
    let canvas = document.createElement('canvas') as HTMLCanvasElement;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('context is null');
    context.drawImage(image,
      left * devicePixelRatio, top * devicePixelRatio, width * devicePixelRatio, height * devicePixelRatio,
      0, 0, width, height,
    )
    const url =  canvas.toDataURL('image/png');
    return url;
  }

  $effect(() => {
    chrome.runtime.onMessage.addListener((request) => {
      if (request.action === 'start-clip-translate') {
        show = true;
        streamId = request.streamId;
      }
    });
  });
</script>
<svelte:document on:mousedown={handleMouseDown} on:mousemove={handleMouseMove} on:mouseup={handleMouseUp} />
<div>
  <div class={["selection-overlay", show ? 'show' : 'hide']}>
    {#if isSelecting}
      <div 
        class="selection-box"
        style=" 
                left: {Math.min(startX, endX)}px; 
                top: {Math.min(startY, endY)}px; 
                width: {Math.abs(endX - startX)}px; 
                height: {Math.abs(endY - startY)}px;">
      </div>
    {/if}
  </div>
</div>

<style>
  .selection-overlay {
    pointer-events: all;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9999;
    cursor: crosshair;
    display: none;
  }
  .selection-overlay.show {
    display: block;
  }
  
  .selection-box {
    pointer-events: none;
    position: absolute;
    border: 2px dashed #3498db;
    background-color: rgba(52, 152, 219, 0.2);
  }
</style>