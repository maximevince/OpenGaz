<script lang="ts">
  /**
   * Collapsible JSON tree. Recursive: it imports itself for the children.
   *
   * Every row carries its own dotted path, so the raw view doubles as the place you find the
   * path to put in a watch or hand to the path editor — clicking a row copies it.
   */
  import { untrack } from 'svelte';
  import Self from './JsonTree.svelte';
  import { brief } from './path';

  let {
    value,
    name = '',
    path = '',
    depth = 0,
    filter = '',
    onpick,
  }: {
    value: unknown;
    name?: string;
    path?: string;
    depth?: number;
    filter?: string;
    onpick?: (path: string) => void;
  } = $props();

  const isObj = $derived(value !== null && typeof value === 'object');
  const entries = $derived(
    isObj
      ? Array.isArray(value)
        ? (value as unknown[]).map((v, i) => [String(i), v] as const)
        : Object.entries(value as Record<string, unknown>)
      : [],
  );
  const summary = $derived(Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`);
  // deep trees open lazily; the top two levels are what you almost always want to see. `depth`
  // is fixed for the life of a row, so reading it once here is the whole story.
  let open = $state(untrack(() => depth) < 1);
  const shown = $derived(filter ? entries.filter(([k, v]) => hit(k, v, filter)) : entries);

  /** does this key, or anything under it, contain the filter text? */
  function hit(key: string, v: unknown, f: string, level = 0): boolean {
    const needle = f.toLowerCase();
    if (key.toLowerCase().includes(needle)) return true;
    if (v === null || typeof v !== 'object') return String(v).toLowerCase().includes(needle);
    if (level > 4) return false;
    const kids = Array.isArray(v)
      ? (v as unknown[]).map((x, i) => [String(i), x] as const)
      : Object.entries(v as Record<string, unknown>);
    return kids.some(([k2, v2]) => hit(k2, v2, f, level + 1));
  }

  const childPath = (k: string) =>
    Array.isArray(value) ? `${path}[${k}]` : path ? `${path}.${k}` : k;
</script>

{#if !isObj}
  <button class="jt-leaf" onclick={() => onpick?.(path)} title={path}>
    <span class="jt-key">{name}</span><span class="jt-val" class:jt-str={typeof value === 'string'}
      >{brief(value, 120)}</span
    >
  </button>
{:else}
  <div class="jt-node">
    <button class="jt-twist" onclick={() => (open = !open)} title={path}>
      <span class="jt-caret">{open ? '▾' : '▸'}</span><span class="jt-key">{name}</span><span
        class="jt-dim">{summary}</span
      >
    </button>
    {#if open}
      <div class="jt-kids">
        {#each shown as [k, v] (k)}
          <Self value={v} name={k} path={childPath(k)} depth={depth + 1} {filter} {onpick} />
        {/each}
        {#if filter && shown.length === 0}<div class="jt-dim jt-empty">no match</div>{/if}
      </div>
    {/if}
  </div>
{/if}
