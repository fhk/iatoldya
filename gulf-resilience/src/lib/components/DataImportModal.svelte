<script lang="ts">
  import { infraStore } from '../stores/infra.svelte';
  import { parseInfraCSV, parseLinksCSV, parseThreatsCSV, generateTemplateCSV } from '../csv/parser';
  import type { InfraNode, InfraEdge, ThreatScenario, ValidationError, MergeMode } from '../types';

  interface Props {
    onClose: () => void;
  }
  let { onClose }: Props = $props();

  type FileState = {
    name: string;
    rows: unknown[];
    errors: ValidationError[];
    raw: string;
  };

  let infraFile = $state<FileState | null>(null);
  let linksFile = $state<FileState | null>(null);
  let threatsFile = $state<FileState | null>(null);
  let mergeMode = $state<MergeMode>('add');
  let applyError = $state('');

  function readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  async function handleInfraDrop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    const text = await readFile(file);
    const result = parseInfraCSV(text);
    infraFile = { name: file.name, rows: result.rows, errors: result.errors, raw: text };
  }

  async function handleLinksDrop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    const text = await readFile(file);
    const nodeIds = new Set(infraFile ? (infraFile.rows as InfraNode[]).map(n => n.id) : infraStore.nodes.map(n => n.id));
    const result = parseLinksCSV(text, nodeIds);
    linksFile = { name: file.name, rows: result.rows, errors: result.errors, raw: text };
  }

  async function handleThreatsDrop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    const text = await readFile(file);
    const result = parseThreatsCSV(text);
    threatsFile = { name: file.name, rows: result.rows, errors: result.errors, raw: text };
  }

  async function handleInfraInput(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await readFile(file);
    const result = parseInfraCSV(text);
    infraFile = { name: file.name, rows: result.rows, errors: result.errors, raw: text };
  }

  async function handleLinksInput(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await readFile(file);
    const nodeIds = new Set(infraFile ? (infraFile.rows as InfraNode[]).map(n => n.id) : infraStore.nodes.map(n => n.id));
    const result = parseLinksCSV(text, nodeIds);
    linksFile = { name: file.name, rows: result.rows, errors: result.errors, raw: text };
  }

  async function handleThreatsInput(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await readFile(file);
    const result = parseThreatsCSV(text);
    threatsFile = { name: file.name, rows: result.rows, errors: result.errors, raw: text };
  }

  function applyImport() {
    applyError = '';
    try {
      if (infraFile && infraFile.errors.length === 0) {
        infraStore.mergeNodes(infraFile.rows as InfraNode[], mergeMode);
      }
      if (linksFile && linksFile.errors.length === 0) {
        infraStore.mergeEdges(linksFile.rows as InfraEdge[], mergeMode);
      }
      if (threatsFile && threatsFile.errors.length === 0) {
        for (const s of threatsFile.rows as ThreatScenario[]) {
          infraStore.saveScenario(s);
        }
      }
      infraStore.applyChanges();
      onClose();
    } catch (err) {
      applyError = String(err);
    }
  }

  function downloadTemplate(type: 'infra' | 'links' | 'threats') {
    const text = generateTemplateCSV(type);
    const blob = new Blob([text], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `template-${type}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const hasAnyData = $derived(
    (infraFile && infraFile.rows.length > 0) ||
    (linksFile && linksFile.rows.length > 0) ||
    (threatsFile && threatsFile.rows.length > 0)
  );
</script>

<!-- Modal backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onclick={(e) => e.target === e.currentTarget && onClose()}>
  <div class="bg-[#0A0F14] border border-[#1E2A38] w-[900px] max-h-[80vh] flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-[#1E2A38]">
      <div>
        <div class="label text-sm text-[#D4820A]">DATA IMPORT</div>
        <div class="text-[#4A5568] text-[10px] font-mono mt-0.5">DRAG CSV FILES OR CLICK TO SELECT · VALIDATE BEFORE APPLYING</div>
      </div>
      <button onclick={onClose} class="text-[#4A5568] hover:text-[#C8D6E5] text-xl cursor-pointer">✕</button>
    </div>

    <!-- Three columns -->
    <div class="flex flex-1 overflow-hidden divide-x divide-[#1E2A38]">
      <!-- INFRA.CSV -->
      <div class="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
        <div class="flex items-center justify-between">
          <div class="label text-[11px] text-[#00D4FF]">INFRA.CSV</div>
          <button onclick={() => downloadTemplate('infra')} class="label text-[9px] text-[#4A5568] border border-[#1E2A38] px-1 py-0.5 hover:border-[#4A5568] cursor-pointer">↓ TEMPLATE</button>
        </div>
        <div class="text-[#3A4558] text-[9px] font-mono">id, name, type, lat, lng, city, country, operator, capacity_mw</div>

        <!-- Drop zone -->
        <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
        <div
          ondragover={(e) => e.preventDefault()}
          ondrop={handleInfraDrop}
          class="border-2 border-dashed border-[#1E2A38] hover:border-[#00D4FF] p-6 text-center cursor-pointer relative"
          onclick={() => document.getElementById('infra-input')?.click()}
        >
          <input id="infra-input" type="file" accept=".csv" class="hidden" onchange={handleInfraInput} />
          {#if infraFile}
            <div class="text-[#C8D6E5] text-xs">{infraFile.name}</div>
            <div class="text-[#1A7A4A] text-[10px] mt-1">{infraFile.rows.length} valid rows</div>
            {#if infraFile.errors.length > 0}
              <div class="text-[#C4302B] text-[10px] mt-1">{infraFile.errors.length} errors</div>
            {/if}
          {:else}
            <div class="text-[#4A5568] text-[10px]">DROP FILE OR CLICK</div>
          {/if}
        </div>

        {#if infraFile?.errors.length}
          <div class="overflow-y-auto max-h-32 space-y-0.5">
            {#each infraFile.errors as err}
              <div class="text-[#C4302B] text-[9px] font-mono">ROW {err.row} · {err.field}: {err.message}</div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- LINKS.CSV -->
      <div class="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
        <div class="flex items-center justify-between">
          <div class="label text-[11px] text-[#D4820A]">LINKS.CSV</div>
          <button onclick={() => downloadTemplate('links')} class="label text-[9px] text-[#4A5568] border border-[#1E2A38] px-1 py-0.5 hover:border-[#4A5568] cursor-pointer">↓ TEMPLATE</button>
        </div>
        <div class="text-[#3A4558] text-[9px] font-mono">id, source, target, type, name, capacity_tbps, length_km</div>

        <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
        <div
          ondragover={(e) => e.preventDefault()}
          ondrop={handleLinksDrop}
          class="border-2 border-dashed border-[#1E2A38] hover:border-[#D4820A] p-6 text-center cursor-pointer"
          onclick={() => document.getElementById('links-input')?.click()}
        >
          <input id="links-input" type="file" accept=".csv" class="hidden" onchange={handleLinksInput} />
          {#if linksFile}
            <div class="text-[#C8D6E5] text-xs">{linksFile.name}</div>
            <div class="text-[#1A7A4A] text-[10px] mt-1">{linksFile.rows.length} valid rows</div>
            {#if linksFile.errors.length > 0}
              <div class="text-[#C4302B] text-[10px] mt-1">{linksFile.errors.length} errors</div>
            {/if}
          {:else}
            <div class="text-[#4A5568] text-[10px]">DROP FILE OR CLICK</div>
          {/if}
        </div>

        {#if linksFile?.errors.length}
          <div class="overflow-y-auto max-h-32 space-y-0.5">
            {#each linksFile.errors as err}
              <div class="text-[#C4302B] text-[9px] font-mono">ROW {err.row} · {err.field}: {err.message}</div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- THREATS.CSV -->
      <div class="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
        <div class="flex items-center justify-between">
          <div class="label text-[11px] text-[#C4302B]">THREATS.CSV</div>
          <button onclick={() => downloadTemplate('threats')} class="label text-[9px] text-[#4A5568] border border-[#1E2A38] px-1 py-0.5 hover:border-[#4A5568] cursor-pointer">↓ TEMPLATE</button>
        </div>
        <div class="text-[#3A4558] text-[9px] font-mono">id, name, origin_lat, origin_lng, radius_km, notes</div>

        <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
        <div
          ondragover={(e) => e.preventDefault()}
          ondrop={handleThreatsDrop}
          class="border-2 border-dashed border-[#1E2A38] hover:border-[#C4302B] p-6 text-center cursor-pointer"
          onclick={() => document.getElementById('threats-input')?.click()}
        >
          <input id="threats-input" type="file" accept=".csv" class="hidden" onchange={handleThreatsInput} />
          {#if threatsFile}
            <div class="text-[#C8D6E5] text-xs">{threatsFile.name}</div>
            <div class="text-[#1A7A4A] text-[10px] mt-1">{threatsFile.rows.length} valid rows</div>
            {#if threatsFile.errors.length > 0}
              <div class="text-[#C4302B] text-[10px] mt-1">{threatsFile.errors.length} errors</div>
            {/if}
          {:else}
            <div class="text-[#4A5568] text-[10px]">DROP FILE OR CLICK</div>
          {/if}
        </div>

        {#if threatsFile?.errors.length}
          <div class="overflow-y-auto max-h-32 space-y-0.5">
            {#each threatsFile.errors as err}
              <div class="text-[#C4302B] text-[9px] font-mono">ROW {err.row} · {err.field}: {err.message}</div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Footer -->
    <div class="p-4 border-t border-[#1E2A38] flex items-center gap-4">
      <div class="label text-[10px] text-[#4A5568]">MERGE MODE</div>
      {#each (['add', 'update', 'replace'] as MergeMode[]) as mode}
        <label class="flex items-center gap-1 cursor-pointer">
          <input type="radio" name="merge" value={mode} bind:group={mergeMode} class="accent-[#D4820A]" />
          <span class="label text-[10px] {mergeMode === mode ? 'text-[#D4820A]' : 'text-[#4A5568]'}">{mode.toUpperCase()}</span>
        </label>
      {/each}

      <div class="flex-1"></div>

      {#if applyError}
        <span class="text-[#C4302B] text-[10px] font-mono">{applyError}</span>
      {/if}

      <button onclick={onClose} class="label text-[11px] text-[#4A5568] border border-[#1E2A38] px-3 py-1.5 hover:border-[#4A5568] cursor-pointer">CANCEL</button>
      <button
        onclick={applyImport}
        disabled={!hasAnyData}
        class="label text-[11px] text-[#00D4FF] border border-[#00D4FF] px-3 py-1.5 hover:bg-[#00D4FF]/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >APPLY IMPORT</button>
    </div>
  </div>
</div>
