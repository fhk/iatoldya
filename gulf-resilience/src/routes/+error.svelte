<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="w-screen h-screen bg-[#070A0E] flex items-center justify-center font-mono text-xs">
  <div class="border border-[#C4302B] p-8 max-w-sm w-full mx-4">
    <div class="label text-[9px] text-[#C4302B] mb-4 tracking-widest">
      SYSTEM FAULT // CODE {$page.status}
    </div>
    <div class="text-[#C8D6E5] text-sm mb-1 font-semibold">
      {$page.status === 404 ? 'TARGET NOT FOUND' : 'UNEXPECTED ERROR'}
    </div>
    <div class="text-[#4A5568] text-[10px] mt-2 leading-relaxed">
      {$page.error?.message ?? 'An unrecoverable fault has occurred.'}
    </div>
    <div class="mt-6 border-t border-[#1E2A38] pt-4">
      <a href="/" class="label text-[10px] text-[#D4820A] hover:text-[#F59E0B] transition-colors">
        ← RETURN TO ORIGIN
      </a>
    </div>
  </div>
</div>
