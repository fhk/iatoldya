<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { Deck, FlyToInterpolator } from '@deck.gl/core';
  import type { Layer } from '@deck.gl/core';

  interface Props {
    layers?: Layer[];
    cursor?: string;
    /** Pixel radius around cursor used for pick hit-testing (default 0 = pixel-perfect) */
    pickingRadius?: number;
    /** Called only when clicking empty map space (no object picked) */
    onEmptyClick?: (lat: number, lng: number) => void;
  }
  let { layers = [], cursor = 'crosshair', pickingRadius = 0, onEmptyClick }: Props = $props();

  let container: HTMLDivElement;
  let mapInstance: maplibregl.Map | null = null;
  let deckInstance: Deck | null = null;

  // Track current deck.gl view state so flyTo can preserve pitch/bearing
  let currentViewState = {
    longitude: 54.0,
    latitude: 24.5,
    zoom: 5,
    pitch: 30,
    bearing: 0
  };

  /**
   * Fly to a map location by updating deck.gl's view state with a transition.
   * deck.gl's onViewStateChange handler will sync MapLibre automatically.
   */
  export function flyTo(lng: number, lat: number, zoom = 9) {
    if (!deckInstance) return;
    deckInstance.setProps({
      initialViewState: {
        longitude: lng,
        latitude: lat,
        zoom,
        pitch: currentViewState.pitch,
        bearing: currentViewState.bearing,
        transitionDuration: 800,
        transitionInterpolator: new FlyToInterpolator({ speed: 2 })
      }
    });
  }

  onMount(() => {
    mapInstance = new maplibregl.Map({
      container,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: [54.0, 24.5],
      zoom: 5,
      pitch: 30,
      interactive: false  // deck.gl owns all interaction
    });

    deckInstance = new Deck({
      parent: container,
      initialViewState: currentViewState,
      controller: true,
      layers,
      pickingRadius,
      style: { position: 'absolute', top: '0', left: '0' },
      getCursor: ({ isDragging, isHovering }: { isDragging: boolean; isHovering: boolean }) => {
        if (isDragging) return 'grabbing';
        if (isHovering) return 'pointer';
        return cursor;
      },
      onViewStateChange: ({ viewState }: {
        viewState: { longitude: number; latitude: number; zoom: number; bearing?: number; pitch?: number }
      }) => {
        // Keep our local copy in sync for flyTo to use
        currentViewState = {
          longitude: viewState.longitude,
          latitude: viewState.latitude,
          zoom: viewState.zoom,
          pitch: viewState.pitch ?? 0,
          bearing: viewState.bearing ?? 0
        };
        // Sync MapLibre basemap to follow deck.gl
        mapInstance?.jumpTo({
          center: [viewState.longitude, viewState.latitude],
          zoom: viewState.zoom,
          bearing: viewState.bearing ?? 0,
          pitch: viewState.pitch ?? 0
        });
      },
      // Only fire onEmptyClick when no deck.gl object was picked
      onClick: (info: { object?: unknown; coordinate?: number[] }) => {
        if (!info.object && info.coordinate && onEmptyClick) {
          onEmptyClick(info.coordinate[1], info.coordinate[0]);
        }
      }
    });
  });

  // Reactively push new layers to deck without touching view state
  $effect(() => {
    if (deckInstance) deckInstance.setProps({ layers });
  });

  // Reactively update pickingRadius
  $effect(() => {
    if (deckInstance) deckInstance.setProps({ pickingRadius });
  });

  // Reactively update cursor
  $effect(() => {
    if (deckInstance) {
      const c = cursor;
      deckInstance.setProps({
        getCursor: ({ isDragging, isHovering }: { isDragging: boolean; isHovering: boolean }) => {
          if (isDragging) return 'grabbing';
          if (isHovering) return 'pointer';
          return c;
        }
      });
    }
  });

  onDestroy(() => {
    deckInstance?.finalize();
    mapInstance?.remove();
  });
</script>

<div bind:this={container} class="relative w-full h-full"></div>
