<script module lang="ts">
  import type { ClickPos, TranslateIntend } from "./types";
  export type Props = {
    intend: TranslateIntend | null,
  };
</script>
<script lang="ts">
  let { intend= $bindable() }: Props = $props();
  let container: HTMLElement;
  let show = $state(false);
  let pos: ClickPos | undefined = $state();

  let selectedText: string | undefined;

  let x = $derived(pos && pos.pageX + 10);
  let y = $derived(pos && pos.pageY + 10);
  
  $effect(() => {
    if (show) {
      const i = setTimeout(() => {
        show = false;
      }, 3000)
      return () => {
        clearTimeout(i);
      }
    }
  })

  const handleMouseUp = async (e: MouseEvent) => {
    await new Promise(resolve => requestAnimationFrame(resolve));
    selectedText = window.getSelection()?.toString().trim();
    if (intend) return;
    if (selectedText) {
      show = true;
      pos = {
        pageX: e.pageX,
        pageY: e.pageY,
        clientX: e.clientX,
        clientY: e.clientY,
      }
    } else if (show) {
      if (!container.contains(e.target as HTMLElement)) {
        show = false;
      }
    }
  };

  const onClick = () => {
    if (!selectedText || !pos || intend) return;
    intend = {
      data: selectedText,
      type: 'text',
      clickPos: pos,
    };
    show = false;
  };
</script>
<svelte:document onmouseup={handleMouseUp} />
<button
  class="translate-button"
  bind:this={container}
  style:display={show ? "block" : "none"}
  style:left={`${x}px`}
  style:top={`${y}px`}
  onclick={onClick}
>
  译
</button>

<style>
  .translate-button {
    border: 0;
    display: none;
    position: absolute;
    background: #4285f4;
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 12px;
    z-index: 10000;
  }
</style>
