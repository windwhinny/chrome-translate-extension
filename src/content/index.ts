import { mount } from 'svelte'
import App from './App.svelte'

const container = document.createElement('div');
document.body.appendChild(container);
mount(App, {
  target: container
});
