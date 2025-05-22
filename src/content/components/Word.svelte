<script lang="ts" module>
  import type {  WordTranslation } from "../../background/types";
    import { invoke } from "../../lib/bridge";
  export type Props = {
    translation: WordTranslation,
    text: string,
  }
</script>
<script lang="ts">
  import AudioButton, { type PlayStatus } from "./AudioButton.svelte";

  let { translation, text }: Props = $props();
  let playStatus: PlayStatus = $state({
    status: 'idle',
  });

  let onPlay = async () => {
    try {
      const data = await invoke('handleTTS', text);
      playStatus = {
        status: 'playing',
        progress: 0,
        url: data.audio,
        isPaused: false,
      };
    } catch (error: unknown) {
      playStatus = {
        status: 'error',
        error: error,
      };
    }
  }
</script>

<div class="wordHeader">
  <div class="word">{text}</div>
  <div class="phonetic">
    {translation.phoneticType}
    {translation.phonetic}
    <AudioButton bind:playStatus={playStatus} onPlay={onPlay} />
  </div>
</div>

<div class="explanations">
  {#each translation.explanations as exp}
    <div class="explanation-item">
      <span class="partOfSpeech">{exp.partOfSpeech}</span>
      <span class="explanation">{exp.explanation}</span>
    </div> 
  {/each}
</div>

<style>
  .word {
    font-size: 24px;
    font-weight: 500;
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

  .partOfSpeech {
    color: #1a73e8;
    font-weight: 500;
    margin-right: 1em;
  }
</style> 