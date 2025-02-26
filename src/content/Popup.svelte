<script module lang="ts">
  import { invoke } from "../bridge";
  import type { TranslateIntend } from "./types";
  export type Props = {
    intend: TranslateIntend | null;
  };
</script>
<script lang="ts">
  import type { Translation, Frontend } from "../background/types";

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
  
  /**
   * 需要播放的文字
   */
  let translation: Translation | undefined = $state();

  $effect(() => {
    if (!translationPromise) translation = undefined;
  });

  /**
   * 语音合成请求
   */
  let ttsPromise = $derived.by(() => {
    if (!intend || !translation) return;
    if (translation.isWord) {
      return invoke('handleTTS', intend.text );
    } else {
      return invoke('handleTTS', intend.text, translation.language, translation.emotion);
    }
  });
  /**
   * 播放停止状态
   */
  let paused = $state(false);

  let ttsFrontend: Frontend | null = $state(null);

  let parsedTTSFrontend = $derived.by(() => {
    if (!ttsFrontend || !intend) return;
    let { text } = intend;
    let result: ({
      start: number,
      end: number,
      text: string,
      isSpace: false,
    } | {
      text: string,
      isSpace: true,
    })[] = [];
    const { words } = ttsFrontend;
    words.forEach((word, forEachIndex) => {
      const index = text.indexOf(word.word);
      const firstPart = text.slice(0, index)
      const secondPart = text.slice(index + word.word.length, text.length);
      text = secondPart;
      if (firstPart) {
        result.push({
          isSpace: true,
          text: firstPart,
        });
      }
      result.push({
        start: word.start_time,
        end: word.end_time,
        isSpace: false,
        text: word.word,
      });
      if(forEachIndex === words.length - 1) {
        result.push({
          isSpace: true,
          text,
        });
      }
    });

    return result;
  });

  
  let currentTime: number | null = $state(null);
  let currentTimeInMS = $derived(currentTime && currentTime * 1000);
  $effect(() => {
    if (!ttsPromise) {
      ttsFrontend = null;
      currentTime = null;
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
  {#snippet audioIcon(trans: Translation)}
    {#snippet icon(props: {
      onClick?: () => void,
      status?: 'loading' | 'playing' | 'paused' | 'error',
    })}
      <button class={['audio-icon', props.status]} onclick={props.onClick} aria-label="播放">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
        </svg>
      </button>
    {/snippet}
    {#if !ttsPromise}
      {@render icon({ onClick: () =>  translation = trans})}
    {:else}
      {#await ttsPromise}
        {@render icon({ status: 'loading' })}
      {:then tts} 
        {@render icon({ status: paused ? 'paused' : 'playing', onClick: () => paused = !paused })}
        <audio src={tts.audio} bind:paused autoplay={true} onplaying={() => ttsFrontend = tts.frontend } bind:currentTime={currentTime}></audio>
      {:catch error} 
        {@render icon({ status: 'error', onClick: () => translation = undefined })}
      {/await}
    {/if}
  {/snippet}
  {#await translationPromise}
    <div class="loading">翻译中...</div>
  {:then result}
    {#if intend && result?.isWord}
      <div class="wordHeader">
        <div class="word">{intend?.text}</div>
        <div class="phonetic">
          {result.phoneticType}
          [{result.phonetic}]
          {@render audioIcon(result)}
        </div>
      </div>
      <div class="explanations">
        {#each result.explanations as exp}
          <div class="explanation-item">
            <span class="partOfSpeech">{exp.partOfSpeech}</span>
            <span class="explanation">{exp.explanation}</span>
          </div> 
        {/each}
      </div>
      <div class="examples">
        {#each result.examples as example}
          <div class="example-item">
            <div class="english">{example.english}</div>
            <div class="chinese">{example.chinese}</div>
          </div> 
        {/each}
      </div>
    {:else if intend && result && !result.isWord}
      {@render audioIcon(result)}
      <div class="longTextCN">{result.text}</div>
      <div class="longTextEN">
        {#if currentTimeInMS && parsedTTSFrontend}
          {#each parsedTTSFrontend as word}
            {#if word.isSpace}
              <span>{word.text}</span>
            {:else}
              <span class={['tts-word', word.start < currentTimeInMS && currentTimeInMS < word.end ? 'hightlight' : null]}>{word.text}</span> 
            {/if}
          {/each}
        {:else}
          {intend?.text}
        {/if}
      </div>
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

  .word {
    font-size: 24px;
    font-weight: 500;
  }

  .loading {
    color: #666;
  }

  .error {
    color: #ff4444;
  }

  .wordHeader {
    margin-bottom: 12px;
  }

  .phonetic {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #666;
    font-family: "Lucida Sans Unicode", sans-serif;
  }

  .explanations {
    margin-bottom: 16px;
  }

  .explanation-item {
    margin-bottom: 12px;
  }

  .audio-icon {
    border: 0;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    padding: 4px;
    border-radius: 50%;
    background: #f0f0f0;
    transition: background-color 0.2s;
  }

  .audio-icon:hover {
    background: #e0e0e0;
  }

  .audio-icon.error{
    background: rgb(255, 68, 68);
  }
  .audio-icon.error svg {
    fill: white;
  }

  .audio-icon svg {
    fill: #4285f4;
  }

  .audio-icon.playing {
    background: #4285f4;
  }

  @keyframes loading {
    from {
      background: #ccc;
    }
    to {
      background: transparent;
    }
  }

  .audio-icon.loading {
    background: #ccc;
    animation: loading 1s ease-in-out 0s infinite alternate both;
  }

  .audio-icon.playing svg {
    fill: white;
  }

  .partOfSpeech {
    color: #1a73e8;
    font-weight: 500;
    margin-right: 1em;
  }

  .examples {
    border-top: 1px solid #eee;
    padding-top: 12px;
  }

  .example-item {
    margin-bottom: 12px;
    padding-left: 12px;
    border-left: 2px solid #eee;
  }

  .english {
    color: #333;
    margin-bottom: 4px;
  }

  .chinese {
    color: #666;
  }

  .longTextCN {
    display: block;
    margin-bottom: 10px;
    margin-top: 10px;
  }

  .longTextEN {
    display: block;
  }

  .tts-word.hightlight{
    color: #4285f4;
  }
</style>
