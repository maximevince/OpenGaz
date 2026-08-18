import { mount } from 'svelte';
import './ui/global.css';
import App from './App.svelte';
import { game } from './ui/game.svelte';
import { online } from './net/online.svelte';

const app = mount(App, { target: document.getElementById('app')! });

// handy for debugging from the console
(window as unknown as { opengaz: unknown }).opengaz = { game, online };

export default app;
