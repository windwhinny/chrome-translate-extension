<script lang="ts">
  import TranslateButton from './TranslateButton.svelte';
  import Popup from './Popup.svelte';
  import ScreenShot from './ScreenShot.svelte';
  import type { TranslateIntend } from './types';

  let intend: TranslateIntend | null = $state(null);
</script>
<TranslateButton bind:intend={intend} />
<Popup bind:intend={intend} />
<ScreenShot bind:intend={intend} />