<script lang="ts">
  import TranslateButton from './TranslateButton.svelte';
  import Popup from './Popup.svelte';
  import type { TranslateIntend } from './types';

  let intend: TranslateIntend | null = null;

</script>
<TranslateButton bind:intend={intend} />
<Popup bind:intend={intend} />