import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types for the design elements
export interface Point {
  x: number;
  y: number;
}

export interface Point3D extends Point {
  z: number;
}

export interface Wall {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
  type: 'exterior' | 'interior' | 'structural';
  height?: number;
  material?: string;
  selected?: boolean;
  hovered?: boolean;
}

export interface Room {
  id: string;
  name: string;
  area: number;
  walls: string[];
  center: Point;
  type?: 'bedroom' | 'kitchen' | 'living' | 'bathroom' | 'utility';
  selected?: boolean;
}

export interface Door {
  id: string;
  wallId: string;
  position: number; // percentage along wall
  width: number;
  height?: number;
  swing: 'left' | 'right' | 'in' | 'out';
  type: 'entry' | 'interior' | 'sliding' | 'bifold';
  selected?: boolean;
  hovered?: boolean;
}

export interface Window {
  id: string;
  wallId: string;
  position: number;
  width: number;
  height: number;
  sillHeight: number;
  type: 'single' | 'double' | 'picture' | 'sliding' | 'casement';
  selected?: boolean;
  hovered?: boolean;
}

export interface ElectricalElement {
  id: string;
  type: 'outlet' | 'switch' | 'light' | 'panel';
  position: Point;
  wallId?: string;
  symbol: string;
  selected?: boolean;
}

export interface PlumbingElement {
  id: string;
  type: 'sink' | 'toilet' | 'shower' | 'tub' | 'water_heater';
  position: Point;
  rotation: number;
  symbol: string;
  selected?: boolean;
}

export interface CabinProject {
  id: string;
  name: string;
  width: number;
  length: number;
  height: number;
  area: number;
  style: 'a-frame' | 'log' | 'modern' | 'traditional';
  foundationType: 'slab' | 'pier' | 'basement';
  roofType: 'gabled' | 'hip' | 'shed' | 'gambrel';
  created: string;
  lastModified: string;
}

export interface ViewSettings {
  zoom: number;
  panOffset: Point;
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
  showDimensions: boolean;
  showLayers: {
    walls: boolean;
    doors: boolean;
    windows: boolean;
    electrical: boolean;
    plumbing: boolean;
    dimensions: boolean;
    grid: boolean;
  };
}

export interface Camera3DState {
  position: Point3D;
  target: Point3D;
  viewMode: 'orbit' | 'walk' | 'cinematic';
  autoRotate: boolean;
}

export interface Lighting3DState {
  timeOfDay: number; // 0-24 hours
  preset: 'day' | 'sunset' | 'night' | 'interior';
  ambientIntensity: number;
  sunIntensity: number;
  interiorLights: boolean;
}

export interface Material3D {
  id: string;
  name: string;
  type: 'wood' | 'stone' | 'metal' | 'glass' | 'concrete';
  color: string;
  roughness: number;
  metalness: number;
  diffuseMap?: string;
  normalMap?: string;
  roughnessMap?: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  description: string;
  data: Partial<DesignState>;
}

export interface DesignState {
  // Project data
  project: CabinProject | null;
  
  // Design elements
  walls: Wall[];
  rooms: Room[];
  doors: Door[];
  windows: Window[];
  electricalElements: ElectricalElement[];
  plumbingElements: PlumbingElement[];
  
  // Selection and interaction
  selectedTool: string;
  selectedElements: string[];
  hoveredElement: string | null;
  isDrawing: boolean;
  currentWall: Partial<Wall> | null;
  
  // View settings
  viewSettings: ViewSettings;
  camera3D: Camera3DState;
  lighting3D: Lighting3DState;
  
  // Materials and appearance
  materials: Material3D[];
  selectedMaterial: Material3D | null;
  showWireframe: boolean;
  
  // History for undo/redo
  history: HistoryEntry[];
  historyIndex: number;
  maxHistorySize: number;
  
  // Performance and sync
  syncEnabled: boolean;
  autoSaveEnabled: boolean;
  lastSaved: string | null;
  isDirty: boolean;
  
  // Split view mode
  splitViewMode: '2d-only' | '3d-only' | 'split-horizontal' | 'split-vertical';
  activePane: '2d' | '3d';
  
  // Measurement overlay
  measurementMode: boolean;
  measurements: Array<{
    id: string;
    start: Point3D;
    end: Point3D;
    label: string;
    visible: boolean;
  }>;
}

export interface DesignActions {
  // Project management
  setProject: (project: CabinProject) => void;
  updateProject: (updates: Partial<CabinProject>) => void;
  
  // Element management
  addWall: (wall: Wall) => void;
  updateWall: (id: string, updates: Partial<Wall>) => void;
  deleteWall: (id: string) => void;
  
  addRoom: (room: Room) => void;
  updateRoom: (id: string, updates: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
  
  addDoor: (door: Door) => void;
  updateDoor: (id: string, updates: Partial<Door>) => void;
  deleteDoor: (id: string) => void;
  
  addWindow: (window: Window) => void;
  updateWindow: (id: string, updates: Partial<Window>) => void;
  deleteWindow: (id: string) => void;
  
  addElectricalElement: (element: ElectricalElement) => void;
  updateElectricalElement: (id: string, updates: Partial<ElectricalElement>) => void;
  deleteElectricalElement: (id: string) => void;
  
  addPlumbingElement: (element: PlumbingElement) => void;
  updatePlumbingElement: (id: string, updates: Partial<PlumbingElement>) => void;
  deletePlumbingElement: (id: string) => void;
  
  // Selection and interaction
  setSelectedTool: (tool: string) => void;
  setSelectedElements: (elementIds: string[]) => void;
  addToSelection: (elementId: string) => void;
  removeFromSelection: (elementId: string) => void;
  clearSelection: () => void;
  setHoveredElement: (elementId: string | null) => void;
  
  // Drawing state
  setIsDrawing: (isDrawing: boolean) => void;
  setCurrentWall: (wall: Partial<Wall> | null) => void;
  
  // View management
  updateViewSettings: (updates: Partial<ViewSettings>) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: Point) => void;
  toggleGrid: () => void;
  toggleDimensions: () => void;
  toggleLayer: (layer: keyof ViewSettings['showLayers']) => void;
  
  // 3D view management
  updateCamera3D: (updates: Partial<Camera3DState>) => void;
  updateLighting3D: (updates: Partial<Lighting3DState>) => void;
  setViewMode: (mode: 'orbit' | 'walk' | 'cinematic') => void;
  setTimeOfDay: (hours: number) => void;
  
  // Material management
  setSelectedMaterial: (material: Material3D | null) => void;
  addMaterial: (material: Material3D) => void;
  updateMaterial: (id: string, updates: Partial<Material3D>) => void;
  toggleWireframe: () => void;
  
  // Split view
  setSplitViewMode: (mode: '2d-only' | '3d-only' | 'split-horizontal' | 'split-vertical') => void;
  setActivePane: (pane: '2d' | '3d') => void;
  
  // Measurements
  toggleMeasurementMode: () => void;
  addMeasurement: (start: Point3D, end: Point3D, label: string) => void;
  removeMeasurement: (id: string) => void;
  clearMeasurements: () => void;
  
  // History management
  saveToHistory: (description: string) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  
  // Sync and save
  toggleSync: () => void;
  markDirty: () => void;
  markClean: () => void;
  autoSave: () => void;
  
  // Bulk operations
  deleteSelectedElements: () => void;
  duplicateSelectedElements: () => void;
  
  // Room detection
  detectRooms: () => void;
  
  // Import/Export
  exportProject: () => void;
  importProject: (data: any) => void;
}

const initialState: DesignState = {
  project: null,
  walls: [],
  rooms: [],
  doors: [],
  windows: [],
  electricalElements: [],
  plumbingElements: [],
  selectedTool: 'select',
  selectedElements: [],
  hoveredElement: null,
  isDrawing: false,
  currentWall: null,
  viewSettings: {
    zoom: 1,
    panOffset: { x: 0, y: 0 },
    gridSize: 12,
    snapToGrid: true,
    showGrid: true,
    showDimensions: true,
    showLayers: {
      walls: true,
      doors: true,
      windows: true,
      electrical: true,
      plumbing: true,
      dimensions: true,
      grid: true
    }
  },
  camera3D: {
    position: { x: 50, y: 30, z: 50 },
    target: { x: 0, y: 0, z: 0 },
    viewMode: 'orbit',
    autoRotate: false
  },
  lighting3D: {
    timeOfDay: 12,
    preset: 'day',
    ambientIntensity: 0.3,
    sunIntensity: 1.0,
    interiorLights: false
  },
  materials: [
    {
      id: 'cedar-siding',
      name: 'Cedar Siding',
      type: 'wood',
      color: '#8B4513',
      roughness: 0.8,
      metalness: 0.0
    },
    {
      id: 'metal-roof',
      name: 'Metal Roofing',
      type: 'metal',
      color: '#2F4F4F',
      roughness: 0.3,
      metalness: 0.9
    },
    {
      id: 'stone-foundation',
      name: 'Stone Foundation',
      type: 'stone',
      color: '#696969',
      roughness: 0.9,
      metalness: 0.0
    },
    {
      id: 'glass-window',
      name: 'Window Glass',
      type: 'glass',
      color: '#87CEEB',
      roughness: 0.1,
      metalness: 0.0
    }
  ],
  selectedMaterial: null,
  showWireframe: false,
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,
  syncEnabled: true,
  autoSaveEnabled: true,
  lastSaved: null,
  isDirty: false,
  splitViewMode: '2d-only',
  activePane: '2d',
  measurementMode: false,
  measurements: []
};

export const useDesignStore = create<DesignState & DesignActions>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,

      // Project management
      setProject: (project: CabinProject) =>
        set((state) => {
          state.project = project;
          state.isDirty = true;
        }),

      updateProject: (updates: Partial<CabinProject>) =>
        set((state) => {
          if (state.project) {
            Object.assign(state.project, updates);
            state.project.lastModified = new Date().toISOString();
            state.isDirty = true;
          }
        }),

      // Wall management
      addWall: (wall: Wall) =>
        set((state) => {
          state.walls.push(wall);
          state.isDirty = true;
        }),

      updateWall: (id: string, updates: Partial<Wall>) =>
        set((state) => {
          const wall = state.walls.find(w => w.id === id);
          if (wall) {
            Object.assign(wall, updates);
            state.isDirty = true;
          }
        }),

      deleteWall: (id: string) =>
        set((state) => {
          state.walls = state.walls.filter(w => w.id !== id);
          // Also remove related doors and windows
          state.doors = state.doors.filter(d => d.wallId !== id);
          state.windows = state.windows.filter(w => w.wallId !== id);
          state.selectedElements = state.selectedElements.filter(e => e !== id);
          state.isDirty = true;
        }),

      // Room management
      addRoom: (room: Room) =>
        set((state) => {
          state.rooms.push(room);
          state.isDirty = true;
        }),

      updateRoom: (id: string, updates: Partial<Room>) =>
        set((state) => {
          const room = state.rooms.find(r => r.id === id);
          if (room) {
            Object.assign(room, updates);
            state.isDirty = true;
          }
        }),

      deleteRoom: (id: string) =>
        set((state) => {
          state.rooms = state.rooms.filter(r => r.id !== id);
          state.selectedElements = state.selectedElements.filter(e => e !== id);
          state.isDirty = true;
        }),

      // Door management
      addDoor: (door: Door) =>
        set((state) => {
          state.doors.push(door);
          state.isDirty = true;
        }),

      updateDoor: (id: string, updates: Partial<Door>) =>
        set((state) => {
          const door = state.doors.find(d => d.id === id);
          if (door) {
            Object.assign(door, updates);
            state.isDirty = true;
          }
        }),

      deleteDoor: (id: string) =>
        set((state) => {
          state.doors = state.doors.filter(d => d.id !== id);
          state.selectedElements = state.selectedElements.filter(e => e !== id);
          state.isDirty = true;
        }),

      // Window management
      addWindow: (window: Window) =>
        set((state) => {
          state.windows.push(window);
          state.isDirty = true;
        }),

      updateWindow: (id: string, updates: Partial<Window>) =>
        set((state) => {
          const window = state.windows.find(w => w.id === id);
          if (window) {
            Object.assign(window, updates);
            state.isDirty = true;
          }
        }),

      deleteWindow: (id: string) =>
        set((state) => {
          state.windows = state.windows.filter(w => w.id !== id);
          state.selectedElements = state.selectedElements.filter(e => e !== id);
          state.isDirty = true;
        }),

      // Electrical management
      addElectricalElement: (element: ElectricalElement) =>
        set((state) => {
          state.electricalElements.push(element);
          state.isDirty = true;
        }),

      updateElectricalElement: (id: string, updates: Partial<ElectricalElement>) =>
        set((state) => {
          const element = state.electricalElements.find(e => e.id === id);
          if (element) {
            Object.assign(element, updates);
            state.isDirty = true;
          }
        }),

      deleteElectricalElement: (id: string) =>
        set((state) => {
          state.electricalElements = state.electricalElements.filter(e => e.id !== id);
          state.selectedElements = state.selectedElements.filter(e => e !== id);
          state.isDirty = true;
        }),

      // Plumbing management
      addPlumbingElement: (element: PlumbingElement) =>
        set((state) => {
          state.plumbingElements.push(element);
          state.isDirty = true;
        }),

      updatePlumbingElement: (id: string, updates: Partial<PlumbingElement>) =>
        set((state) => {
          const element = state.plumbingElements.find(e => e.id === id);
          if (element) {
            Object.assign(element, updates);
            state.isDirty = true;
          }
        }),

      deletePlumbingElement: (id: string) =>
        set((state) => {
          state.plumbingElements = state.plumbingElements.filter(e => e.id !== id);
          state.selectedElements = state.selectedElements.filter(e => e !== id);
          state.isDirty = true;
        }),

      // Selection and interaction
      setSelectedTool: (tool: string) =>
        set((state) => {
          state.selectedTool = tool;
          if (tool !== 'wall') {
            state.isDrawing = false;
            state.currentWall = null;
          }
        }),

      setSelectedElements: (elementIds: string[]) =>
        set((state) => {
          state.selectedElements = elementIds;
        }),

      addToSelection: (elementId: string) =>
        set((state) => {
          if (!state.selectedElements.includes(elementId)) {
            state.selectedElements.push(elementId);
          }
        }),

      removeFromSelection: (elementId: string) =>
        set((state) => {
          state.selectedElements = state.selectedElements.filter(id => id !== elementId);
        }),

      clearSelection: () =>
        set((state) => {
          state.selectedElements = [];
        }),

      setHoveredElement: (elementId: string | null) =>
        set((state) => {
          state.hoveredElement = elementId;
        }),

      // Drawing state
      setIsDrawing: (isDrawing: boolean) =>
        set((state) => {
          state.isDrawing = isDrawing;
          if (!isDrawing) {
            state.currentWall = null;
          }
        }),

      setCurrentWall: (wall: Partial<Wall> | null) =>
        set((state) => {
          state.currentWall = wall;
        }),

      // View management
      updateViewSettings: (updates: Partial<ViewSettings>) =>
        set((state) => {
          Object.assign(state.viewSettings, updates);
        }),

      setZoom: (zoom: number) =>
        set((state) => {
          state.viewSettings.zoom = Math.max(0.1, Math.min(5, zoom));
        }),

      setPanOffset: (offset: Point) =>
        set((state) => {
          state.viewSettings.panOffset = offset;
        }),

      toggleGrid: () =>
        set((state) => {
          state.viewSettings.showGrid = !state.viewSettings.showGrid;
        }),

      toggleDimensions: () =>
        set((state) => {
          state.viewSettings.showDimensions = !state.viewSettings.showDimensions;
        }),

      toggleLayer: (layer: keyof ViewSettings['showLayers']) =>
        set((state) => {
          state.viewSettings.showLayers[layer] = !state.viewSettings.showLayers[layer];
        }),

      // 3D view management
      updateCamera3D: (updates: Partial<Camera3DState>) =>
        set((state) => {
          Object.assign(state.camera3D, updates);
        }),

      updateLighting3D: (updates: Partial<Lighting3DState>) =>
        set((state) => {
          Object.assign(state.lighting3D, updates);
        }),

      setViewMode: (mode: 'orbit' | 'walk' | 'cinematic') =>
        set((state) => {
          state.camera3D.viewMode = mode;
        }),

      setTimeOfDay: (hours: number) =>
        set((state) => {
          state.lighting3D.timeOfDay = Math.max(0, Math.min(24, hours));
        }),

      // Material management
      setSelectedMaterial: (material: Material3D | null) =>
        set((state) => {
          state.selectedMaterial = material;
        }),

      addMaterial: (material: Material3D) =>
        set((state) => {
          state.materials.push(material);
        }),

      updateMaterial: (id: string, updates: Partial<Material3D>) =>
        set((state) => {
          const material = state.materials.find(m => m.id === id);
          if (material) {
            Object.assign(material, updates);
          }
        }),

      toggleWireframe: () =>
        set((state) => {
          state.showWireframe = !state.showWireframe;
        }),

      // Split view
      setSplitViewMode: (mode: '2d-only' | '3d-only' | 'split-horizontal' | 'split-vertical') =>
        set((state) => {
          state.splitViewMode = mode;
        }),

      setActivePane: (pane: '2d' | '3d') =>
        set((state) => {
          state.activePane = pane;
        }),

      // Measurements
      toggleMeasurementMode: () =>
        set((state) => {
          state.measurementMode = !state.measurementMode;
        }),

      addMeasurement: (start: Point3D, end: Point3D, label: string) =>
        set((state) => {
          const measurement = {
            id: `measurement-${Date.now()}`,
            start,
            end,
            label,
            visible: true
          };
          state.measurements.push(measurement);
        }),

      removeMeasurement: (id: string) =>
        set((state) => {
          state.measurements = state.measurements.filter(m => m.id !== id);
        }),

      clearMeasurements: () =>
        set((state) => {
          state.measurements = [];
        }),

      // History management
      saveToHistory: (description: string) =>
        set((state) => {
          const currentState = {
            walls: [...state.walls],
            rooms: [...state.rooms],
            doors: [...state.doors],
            windows: [...state.windows],
            electricalElements: [...state.electricalElements],
            plumbingElements: [...state.plumbingElements]
          };

          const historyEntry: HistoryEntry = {
            id: `history-${Date.now()}`,
            timestamp: Date.now(),
            description,
            data: currentState
          };

          // Remove any entries after current index (if we're not at the end)
          if (state.historyIndex < state.history.length - 1) {
            state.history = state.history.slice(0, state.historyIndex + 1);
          }

          state.history.push(historyEntry);
          
          // Keep history size manageable
          if (state.history.length > state.maxHistorySize) {
            state.history = state.history.slice(-state.maxHistorySize);
          }

          state.historyIndex = state.history.length - 1;
        }),

      undo: () =>
        set((state) => {
          if (state.historyIndex > 0) {
            state.historyIndex--;
            const entry = state.history[state.historyIndex];
            if (entry.data) {
              Object.assign(state, entry.data);
            }
          }
        }),

      redo: () =>
        set((state) => {
          if (state.historyIndex < state.history.length - 1) {
            state.historyIndex++;
            const entry = state.history[state.historyIndex];
            if (entry.data) {
              Object.assign(state, entry.data);
            }
          }
        }),

      clearHistory: () =>
        set((state) => {
          state.history = [];
          state.historyIndex = -1;
        }),

      // Sync and save
      toggleSync: () =>
        set((state) => {
          state.syncEnabled = !state.syncEnabled;
        }),

      markDirty: () =>
        set((state) => {
          state.isDirty = true;
        }),

      markClean: () =>
        set((state) => {
          state.isDirty = false;
          state.lastSaved = new Date().toISOString();
        }),

      autoSave: () =>
        set((state) => {
          if (state.autoSaveEnabled && state.isDirty) {
            // Auto-save logic would go here
            state.lastSaved = new Date().toISOString();
            state.isDirty = false;
          }
        }),

      // Bulk operations
      deleteSelectedElements: () =>
        set((state) => {
          const { selectedElements } = state;
          
          selectedElements.forEach(id => {
            state.walls = state.walls.filter(w => w.id !== id);
            state.rooms = state.rooms.filter(r => r.id !== id);
            state.doors = state.doors.filter(d => d.id !== id);
            state.windows = state.windows.filter(w => w.id !== id);
            state.electricalElements = state.electricalElements.filter(e => e.id !== id);
            state.plumbingElements = state.plumbingElements.filter(e => e.id !== id);
          });
          
          state.selectedElements = [];
          state.isDirty = true;
        }),

      duplicateSelectedElements: () =>
        set((state) => {
          const { selectedElements } = state;
          const newElementIds: string[] = [];
          
          selectedElements.forEach(id => {
            const wall = state.walls.find(w => w.id === id);
            if (wall) {
              const newWall: Wall = {
                ...wall,
                id: `wall-${Date.now()}-${Math.random()}`,
                start: { x: wall.start.x + 24, y: wall.start.y + 24 },
                end: { x: wall.end.x + 24, y: wall.end.y + 24 }
              };
              state.walls.push(newWall);
              newElementIds.push(newWall.id);
            }
            
            // Similar logic for other element types...
          });
          
          state.selectedElements = newElementIds;
          state.isDirty = true;
        }),

      // Room detection
      detectRooms: () =>
        set((state) => {
          // Simple room detection algorithm
          // This would be more sophisticated in a real application
          if (state.walls.length >= 3) {
            const bounds = calculateWallBounds(state.walls);
            const centerX = (bounds.minX + bounds.maxX) / 2;
            const centerY = (bounds.minY + bounds.maxY) / 2;
            const width = bounds.maxX - bounds.minX;
            const height = bounds.maxY - bounds.minY;
            const area = Math.round((width * height) / (state.viewSettings.gridSize * state.viewSettings.gridSize));
            
            const existingRoom = state.rooms.find(r => r.id === 'main-room');
            if (existingRoom) {
              existingRoom.area = area;
              existingRoom.center = { x: centerX, y: centerY };
              existingRoom.walls = state.walls.map(w => w.id);
            } else {
              const newRoom: Room = {
                id: 'main-room',
                name: 'Main Area',
                area,
                walls: state.walls.map(w => w.id),
                center: { x: centerX, y: centerY },
                type: 'living'
              };
              state.rooms.push(newRoom);
            }
            
            state.isDirty = true;
          }
        }),

      // Import/Export
      exportProject: () => {
        const state = get();
        const exportData = {
          project: state.project,
          walls: state.walls,
          rooms: state.rooms,
          doors: state.doors,
          windows: state.windows,
          electricalElements: state.electricalElements,
          plumbingElements: state.plumbingElements,
          materials: state.materials,
          exportDate: new Date().toISOString(),
          version: "2.0"
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${state.project?.name || 'cabin-design'}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
      },

      importProject: (data: any) =>
        set((state) => {
          try {
            if (data.project) state.project = data.project;
            if (data.walls) state.walls = data.walls;
            if (data.rooms) state.rooms = data.rooms;
            if (data.doors) state.doors = data.doors;
            if (data.windows) state.windows = data.windows;
            if (data.electricalElements) state.electricalElements = data.electricalElements;
            if (data.plumbingElements) state.plumbingElements = data.plumbingElements;
            if (data.materials) state.materials = data.materials;
            
            state.isDirty = true;
            state.selectedElements = [];
            state.hoveredElement = null;
          } catch (error) {
            console.error('Failed to import project:', error);
          }
        })
    }))
  )
);

// Helper function
function calculateWallBounds(walls: Wall[]) {
  if (walls.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  walls.forEach(wall => {
    minX = Math.min(minX, wall.start.x, wall.end.x);
    minY = Math.min(minY, wall.start.y, wall.end.y);
    maxX = Math.max(maxX, wall.start.x, wall.end.x);
    maxY = Math.max(maxY, wall.start.y, wall.end.y);
  });
  
  return { minX, minY, maxX, maxY };
}

// Auto-save subscription
if (typeof window !== 'undefined') {
  useDesignStore.subscribe(
    (state) => state.isDirty,
    (isDirty) => {
      if (isDirty) {
        const state = useDesignStore.getState();
        if (state.autoSaveEnabled) {
          setTimeout(() => {
            state.autoSave();
          }, 30000); // Auto-save after 30 seconds
        }
      }
    }
  );
}

export default useDesignStore;