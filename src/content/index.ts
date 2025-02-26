import { mount } from 'svelte'
import App from './App.svelte'
const container = document.createElement('div')
document.body.append(container);
const shadowRoot = container.attachShadow({ mode: "open" });

mount(App, {
  target: shadowRoot,
})