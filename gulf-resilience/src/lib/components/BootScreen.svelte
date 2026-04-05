<script lang="ts">
  import { onMount } from 'svelte';
  import { infraStore } from '../stores/infra.svelte';

  interface Props { onComplete: () => void; }
  const { onComplete }: Props = $props();

  type Phase = 'boot' | 'countdown' | 'granted' | 'fading';

  let phase      = $state<Phase>('boot');
  let lines      = $state<{ text: string; ok: boolean }[]>([]);
  let progress   = $state(0);
  let countdown  = $state(5);
  let fading     = $state(false);

  const nodeCount = infraStore.nodes.length;
  const edgeCount = infraStore.edges.length;
  const cellCount = infraStore.h3.cells.size;

  const BOOT_SEQUENCE: { text: string; ok: boolean; delay: number }[] = [
    { text: 'GULFNET RESILIENCE // BOOT SEQUENCE INITIATED',   ok: false, delay: 0   },
    { text: 'ESTABLISHING SECURE UPLINK...',                   ok: true,  delay: 320 },
    { text: `NODE REGISTRY LOADED — ${nodeCount} NODES`,       ok: true,  delay: 260 },
    { text: `EDGE TOPOLOGY MAPPED — ${edgeCount} LINKS`,       ok: true,  delay: 220 },
    { text: `H3 SPATIAL INDEX — ${cellCount} CELLS (RES 7)`,   ok: true,  delay: 220 },
    { text: 'GRAPH ENGINE — ONLINE',                           ok: true,  delay: 200 },
    { text: 'BETWEENNESS ENGINE — CALIBRATING',                ok: true,  delay: 280 },
    { text: 'STRIKE PLANNER — ARMED',                          ok: true,  delay: 220 },
    { text: 'SIMULATION MODULE — READY',                       ok: true,  delay: 200 },
    { text: '⚠  AUTHORIZATION REQUIRED — INITIATING COUNTDOWN',ok: false, delay: 380 },
  ];

  function wait(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

  onMount(async () => {
    for (let i = 0; i < BOOT_SEQUENCE.length; i++) {
      const step = BOOT_SEQUENCE[i];
      await wait(step.delay);
      lines = [...lines, { text: step.text, ok: step.ok }];
      progress = ((i + 1) / BOOT_SEQUENCE.length) * 100;
    }

    await wait(300);
    phase = 'countdown';

    for (let n = 5; n >= 1; n--) {
      countdown = n;
      await wait(480);
    }

    countdown = 0;
    await wait(200);

    phase = 'granted';
    await wait(1000);

    fading = true;
    await wait(700);
    onComplete();
  });
</script>

<!-- Full-screen overlay -->
<div
  class="fixed inset-0 z-[9999] bg-[#020507] flex flex-col items-center justify-center font-mono transition-opacity duration-700"
  class:opacity-0={fading}
>
  <!-- Scanlines -->
  <div class="absolute inset-0 pointer-events-none"
    style="background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 4px)">
  </div>

  {#if phase === 'boot'}
    <div class="w-full max-w-xl px-6 relative z-10">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <span class="label text-[11px] text-[#C4302B] border border-[#C4302B]/50 px-2 py-0.5">
          UNCLASSIFIED // FOUO
        </span>
        <span class="text-[#2A3A4E] text-[10px]">SYS-BOOT v1.0</span>
      </div>

      <!-- Logo -->
      <div class="mb-6">
        <div class="label text-2xl text-[#D4820A] tracking-[0.25em] mb-1" style="text-shadow: 0 0 20px #D4820A88">
          GULFNET RESILIENCE
        </div>
        <div class="text-[#2A3A4E] text-[10px]">NETWORK RESILIENCE ASSESSMENT SYSTEM</div>
      </div>

      <!-- Progress bar -->
      <div class="mb-4">
        <div class="h-[3px] bg-[#0D1117] w-full rounded-sm overflow-hidden">
          <div
            class="h-full transition-all duration-200 rounded-sm"
            style="width: {progress}%; background: linear-gradient(90deg, #D4820A, #C4302B)"
          ></div>
        </div>
        <div class="text-[#3A4558] text-[9px] mt-1 text-right">{Math.round(progress)}%</div>
      </div>

      <!-- Boot lines -->
      <div class="space-y-0.5 min-h-[160px]">
        {#each lines as line, i}
          <div class="flex items-start gap-2 text-[10px]"
            style="animation: bootline 0.15s ease-out both">
            <span class="text-[#2A3A4E] shrink-0 mt-px">›</span>
            <span class="{i === 0 ? 'text-[#D4820A] label' : line.ok ? 'text-[#3A5A3A]' : 'text-[#7A4A1A]'} flex-1">
              {line.text}
            </span>
            {#if line.ok}
              <span class="text-[#1A7A4A] shrink-0">OK</span>
            {/if}
          </div>
        {/each}
        <!-- Blinking cursor -->
        {#if lines.length < BOOT_SEQUENCE.length}
          <div class="text-[#D4820A] text-[10px] blink">_</div>
        {/if}
      </div>
    </div>

  {:else if phase === 'countdown'}
    <div class="flex flex-col items-center gap-8 relative z-10">
      <div class="label text-[11px] text-[#C4302B] tracking-[0.3em]">⚠  AUTHORIZATION COUNTDOWN  ⚠</div>

      <!-- Big countdown number -->
      <div
        class="relative flex items-center justify-center"
        style="width: 180px; height: 180px"
      >
        <!-- Animated ring -->
        <svg class="absolute inset-0" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r="80" fill="none" stroke="#1A0A0A" stroke-width="8"/>
          <circle cx="90" cy="90" r="80" fill="none" stroke="#C4302B" stroke-width="8"
            stroke-dasharray="{(countdown / 5) * 502} 502"
            stroke-dashoffset="125"
            style="transition: stroke-dasharray 0.4s linear"
            stroke-linecap="round"
            opacity="0.8"
          />
        </svg>
        <div
          class="label text-[80px] leading-none tabular-nums"
          style="
            color: {countdown <= 1 ? '#FF3030' : countdown === 2 ? '#D4820A' : '#C4302B'};
            text-shadow: 0 0 40px currentColor;
            transition: color 0.2s
          "
        >
          {countdown}
        </div>
      </div>

      <div class="text-[#3A4558] text-[10px] tracking-widest">SECONDS TO SYSTEM ACTIVATION</div>
    </div>

  {:else if phase === 'granted'}
    <div class="flex flex-col items-center gap-4 relative z-10" style="animation: grantpop 0.2s ease-out both">
      <div class="label text-[11px] text-[#1A7A4A] tracking-[0.3em]">AUTHORIZATION</div>
      <div
        class="label text-[52px] leading-none tracking-[0.15em]"
        style="color: #1A7A4A; text-shadow: 0 0 60px #1A7A4A, 0 0 20px #1A7A4A"
      >
        GRANTED
      </div>
      <div class="text-[#1A7A4A]/50 text-[10px] mt-2">WELCOME, OPERATOR</div>
    </div>
  {/if}
</div>

<style>
  @keyframes bootline {
    from { opacity: 0; transform: translateX(-6px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes grantpop {
    from { opacity: 0; transform: scale(0.92); }
    to   { opacity: 1; transform: scale(1); }
  }
</style>
