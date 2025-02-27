<script lang="ts" module>
  export type Props = {
    translation: SentenceTranslation;
    text: string;
  };
</script>
<script lang="ts">
  import type { SentenceTranslation, Frontend } from "../../background/types";
  import { invoke } from "../../bridge";
  import AudioButton, { type PlayStatus } from "./AudioButton.svelte";

  let { translation, text, }: Props = $props();

  let ttsFrontend: Frontend | null = $state(null);

  let onPlay = async () => {
    try {
      const data = await invoke('handleTTS', text, translation.language, translation.emotion);
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

  let parsedTTSFrontend = $derived.by(() => {
    if (!ttsFrontend) return;
    let textCopy = text;
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
      const index = textCopy.indexOf(word.word);
      const firstPart = textCopy.slice(0, index)
      const secondPart = textCopy.slice(index + word.word.length);
      textCopy = secondPart;
      
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
          text: textCopy,
        });
      }
    });

    return result;
  });

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

<AudioButton bind:playStatus={playStatus} onPlay={onPlay} />
<div class="longTextCN">{translation.text}</div>
<div class="longTextEN">
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
  .longTextCN {
    display: block;
    margin-bottom: 10px;
    margin-top: 10px;
  }

  .longTextEN {
    display: block;
  }

  .tts-word.hightlight {
    color: #4285f4;
  }
</style> 