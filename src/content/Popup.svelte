<script module lang="ts">
  import { invoke } from "../lib/bridge";
  import type { TranslateIntend } from "./types";
  export type Props = {
    intend: TranslateIntend | null;
  };
</script>

<script lang="ts">
  import Word from "./components/Word.svelte";
  import Sentence from "./components/Sentence.svelte";

  let { intend = $bindable() }: Props = $props();
  let container: HTMLDivElement;
  let windowHeight = $state(0);
  let windowWidth = $state(0);
  let popupMaxWidth = 400;
  let popupMaxHeight = 400;

  /**
   * 窗口位置
   */
  const left = $derived.by(() => {
    if (!intend) return;
    const { clickPos } = intend;
    let tmp = 0;
    if (clickPos.clientX + popupMaxWidth +10> windowWidth) {
      tmp = clickPos.pageX - (clickPos.clientX + popupMaxWidth + 10 - windowWidth);
    } else {
      tmp = clickPos.pageX + 10;
    }
    return Math.max(10, tmp);
  });

  /**
   * 窗口位置
   */
  const top = $derived.by(() => {
    if (!intend) return;
    const { clickPos } = intend;
    let tmp = 0;
    if (clickPos.clientY + popupMaxHeight +10> windowHeight) {
      tmp = clickPos.pageY - (clickPos.clientY + popupMaxHeight + 10 - windowHeight);
    } else {
      tmp = clickPos.pageY + 10;
    }
    return Math.max(10, tmp);
  });

  /**
   * 点击文档其他区域关闭弹窗
   * @param e
   */
  const handleMouseUp = (e: MouseEvent) => {
    if (intend) {
      const rect = container.getBoundingClientRect();
      if (
        e.clientX > rect.left &&
        e.clientX < rect.width + rect.left &&
        e.clientY > rect.top &&
        e.clientY < rect.height + rect.top
      ) {
        return;
      }
      intend = null;
    }
  };

  /**
   * 翻译请求
   */
  let translationPromise = $derived.by(() => {
    if (!intend) return;
    if (intend.type === 'text') {
      return invoke('handleTranslate', intend.data);
    } else {
      return invoke('handleOCR', intend.data);
    }
  });
</script>

<svelte:window bind:innerHeight={windowHeight} bind:innerWidth={windowWidth} />
<svelte:document onmouseup={handleMouseUp} />

<div
  class="translate-popup"
  bind:this={container}
  style:display={intend ? 'block' : 'none'}
  style:left={`${left}px`}
  style:top={`${top}px`}
>
  {#await translationPromise}
    <div class="loading">翻译中...</div>
  {:then result}
    {#if intend && result}
      {#if typeof result == 'string'}
        <Sentence text={result} canPlay={false} />
      {:else if 'isWord' in result}
        <Word translation={result} text={intend.data} />
      {:else if !('isWord' in result)}
        <Sentence 
          tranlationStream={result} 
          text={intend.data}
        />
      {/if}
    {/if}
  {:catch error}
    {@debug error}
    <div class="error">翻译失败:{error.message}</div>
  {/await}
</div>

<style>
  .translate-popup {
    box-sizing: border-box;
    position: absolute;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 16px;
    min-width: 200px;
    max-width: 400px;
    max-height: 400px;
    overflow-y: auto;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    font-size: 14px;
    line-height: 1.5;
    z-index: 10000;
    color: #333;
  }

  .loading {
    color: #666;
  }

  .error {
    color: #ff4444;
  }
</style>
