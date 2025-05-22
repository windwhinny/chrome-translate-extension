<script lang="ts" module>
  export type Props = {
    tranlationStream?: Stream<SentenceTranslation>;
    text: string;
    canPlay?: boolean,
  };
</script>
<script lang="ts">
  import {
    createMarkdownStreamParser,
  } from "@nlux/markdown"
  import type { SentenceTranslation, Frontend } from "../../background/types";
  import { Stream } from "../../lib/stream";
  import { invoke } from "../../lib/bridge";
  import AudioButton, { type PlayStatus } from "./AudioButton.svelte";
  import { parseTTS } from "./Sentence.lib";

  let { tranlationStream: stream, canPlay = true, text }: Props = $props();
  let markdownContainer: HTMLElement | null = $state(null);
  let translation: Partial<SentenceTranslation> | undefined = $state();
  let error: Error | undefined = $state();
  
  $effect(() => {
    if (!markdownContainer) return;
    if (!stream) return;
    const markdown = createMarkdownStreamParser(markdownContainer)
    let lastLength = 0;
    stream.on((data, e) => {
      if (e) return error = e;
      translation = data;
      const { text, done } = data || {}; 
      if (!text) return;
      let chunk = text.slice(lastLength, text.length - 1);
      chunk = chunk.replace(/\\n/g, '\n'); // 替换掉换行符
      markdown.next(chunk);
      lastLength = text.length;
      if (done) {
        markdown.complete();
      }
    });

    return () => {
      if (markdownContainer) {
        markdownContainer.innerHTML = '';
      }
    }
  });

  let ttsFrontend: Frontend | null = $state(null);

  let parsedTTSFrontend = $derived.by(() => {
    if (!ttsFrontend) return null;
    if (!text) return null;
    return parseTTS(ttsFrontend, text);
  });

  let onPlay = async () => {
    const { language, emotion, done } = translation || {};
    try {
      if (!text || !done) return;
      const data = await invoke('handleTTS', text, language, emotion);
      playStatus = {
        status: 'playing',
        progress: 0,
        url: data.audio,
        isPaused: false,
      };
      ttsFrontend = data.frontend;
    } catch (error: unknown) {
      playStatus = {
        status: 'error',
        error: error,
      };
    }
  }

  let playStatus: PlayStatus = $state({
    status: 'idle',
  });

  let current = $derived.by(() => {
    if (playStatus.status === 'playing') {
      return playStatus.progress * 1000;
    }
    return null;
  });
</script>

{#if canPlay}
  <AudioButton bind:playStatus={playStatus} onPlay={onPlay} />
{/if}
{#if stream}
  {#if error}
    <div class="error">{error.message}</div>
  {/if}
  <div class="translationResult" >
    {#if !(translation?.text)}
      <div>翻译中...</div>
    {/if}
    <div bind:this={markdownContainer} ></div>
  </div>
{/if}
<div class="originText">
  {#if current && parsedTTSFrontend}
    {#each parsedTTSFrontend as word}
      {#if word.isSpace}
        <span>{word.text}</span>
      {:else}
        <span class={['tts-word', word.start < current && current < word.end ? 'hightlight' : null]}>
          {word.text}
        </span> 
      {/if}
    {/each}
  {:else}
    {text}
  {/if}
</div>

<style>
  .translationResult {
    display: block;
    margin-bottom: 10px;
    margin-top: 10px;
  }

  .originText {
    display: block;
    white-space: pre-line; /* 保留换行符 */
  }

  .tts-word.hightlight {
    color: #4285f4;
  }
</style>