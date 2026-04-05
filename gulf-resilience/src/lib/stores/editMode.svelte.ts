class EditModeStore {
  // Top-level sidebar tab
  sidebarTab = $state<'strike' | 'layers'>('strike');
  // Layer sub-tab
  layerSubTab = $state<'nodes' | 'edges' | 'scenarios'>('nodes');

  // Node being created/edited
  selectedNodeId = $state<string | null>(null);
  pendingNodeLocation = $state<{ lat: number; lng: number } | null>(null);

  // Edge draw: first click sets source, second completes edge
  edgeDrawSource = $state<string | null>(null);

  clearEdgeDraw() {
    this.edgeDrawSource = null;
  }

  selectNode(id: string | null) {
    this.selectedNodeId = id;
    if (id) {
      this.sidebarTab = 'layers';
      this.layerSubTab = 'nodes';
    }
  }

  reset() {
    this.selectedNodeId = null;
    this.pendingNodeLocation = null;
    this.edgeDrawSource = null;
  }
}

export const editModeStore = new EditModeStore();
