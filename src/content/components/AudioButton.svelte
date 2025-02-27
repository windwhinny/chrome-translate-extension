<script lang="ts" module>
  export type PlayStatus =
    | {
        status: "idle";
      }
    | {
        status: "loading";
        url: string;
      }
    | {
        status: "playing";
        progress: number;
        url: string;
        isPaused: boolean;
      }
    | {
        status: "error";
        error: unknown;
      };
  export type Props = {
    onPlay: () => void;
    playStatus: PlayStatus;
  };
</script>

<script lang="ts">
  let { playStatus = $bindable(), onPlay = $bindable() }: Props = $props();
</script>

{#snippet icon()}
  <svg viewBox="0 0 24 24" width="16" height="16">
    <path
      d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"
    />
  </svg>
{/snippet}

{#if playStatus.status === "idle"}
  <button class="audio-icon" aria-label="播放" onclick={onPlay}>
    {@render icon()}
  </button>
{:else if playStatus.status === "error"}
  <button class="audio-icon error" aria-label="错误">
    {@render icon()}
  </button>
{:else if playStatus.status === "loading"}
  <button class="audio-icon loading" aria-label="加载中">
    {@render icon()}
  </button>
{:else if playStatus.status === "playing"}
  <button
    class={{
      "audio-icon": true,
      paused: playStatus.isPaused,
      playing: !playStatus.isPaused,
    }}
    onclick={() => (playStatus.isPaused = !playStatus.isPaused)}
    aria-label="播放"
  >
    {@render icon()}
  </button>
  <audio
    src={playStatus.url}
    bind:paused={playStatus.isPaused}
    autoplay={true}
    bind:currentTime={playStatus.progress}
  ></audio>
{/if}

<style>
  @keyframes loading {
    from {
      background: #ccc;
    }
    to {
      background: transparent;
    }
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

    &:hover {
      background: #e0e0e0;
    }

    &.error {
      background: rgb(255, 68, 68);

      svg {
        fill: white;
      }
    }

    svg {
      fill: #4285f4;
    }

    &.loading {
      background: #ccc;
      animation: loading 1s ease-in-out 0s infinite alternate both;
    }

    &.playing {
      background: #4285f4;
      
      svg {
        fill: white;
      }
    }
  }
</style>
