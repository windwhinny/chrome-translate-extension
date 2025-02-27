<script module lang="ts">
  import { invoke } from "../bridge";
  import type { TranslateIntend } from "./types";
  export type Props = {
    intend: TranslateIntend | null;
  };
</script>

<script lang="ts">
  import WordTranslation from "./components/WordTranslation.svelte";
  import SentenceTranslation from "./components/SentenceTranslation.svelte";

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
  let translationPromise = $derived(intend && invoke('handleTranslate', intend.text));
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
    {#if intend && result?.isWord}
      <WordTranslation translation={result} text={intend.text} />
    {:else if intend && result && !result.isWord}
      <SentenceTranslation 
        translation={result} 
        text={intend.text}
      />
    {/if}
  {:catch error}
    {@debug error}
    <div class="error">翻译失败:{error.message}</div>
  {/await}
</div>

<style>
  .translate-popup {
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
