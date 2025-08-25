# DreamCabin Real-Time Synchronization System

## Overview

This document describes the comprehensive real-time synchronization system implemented for the DreamCabin project. The system enables seamless bidirectional communication between the 2D floor plan editor and 3D visualization, providing users with professional-grade design tools that rival SketchUp and RoomSketcher.

## Architecture

### Core Components

1. **Shared State Management** (`/stores/designStore.ts`)
   - Centralized Zustand store with Immer integration
   - Type-safe state management for all design elements
   - Automatic change detection and persistence

2. **Synchronization System** (`/hooks/useSyncSystem.ts`)
   - Real-time change propagation between views
   - Batched updates with configurable throttling
   - Performance monitoring and optimization

3. **Enhanced 2D Editor** (`/components/design/Enhanced2DEditor.tsx`)
   - Canvas-based editor with professional drawing tools
   - Real-time sync integration
   - Advanced selection and interaction systems

4. **Enhanced 3D Viewer** (`/components/design/Enhanced3DViewer.tsx`)
   - Three.js-based 3D rendering engine
   - Dynamic scene updates from 2D changes
   - Interactive element selection and hover effects

5. **Professional Design Interface** (`/components/design/ProfessionalDesignInterface.tsx`)
   - Unified interface coordinating all views
   - Split-screen modes and view management
   - Comprehensive toolbar and status displays

## Key Features

### ✅ Real-Time Synchronization
- **Instant Updates**: Changes in 2D reflect immediately in 3D
- **Bidirectional Sync**: Both views can trigger updates to the other
- **Batched Processing**: Updates are batched (100ms default) to prevent excessive re-renders
- **Throttling**: Sync operations are throttled (50ms default) for optimal performance

### ✅ Bidirectional Element Selection
- **3D to 2D**: Click elements in 3D view to select and focus in 2D view
- **2D to 3D**: Select elements in 2D to highlight in 3D view
- **Hover Sync**: Hover effects are synchronized between both views
- **Multi-Selection**: Support for selecting multiple elements across views

### ✅ Split-Screen Coordination
- **Horizontal Split**: Side-by-side 2D and 3D views
- **Vertical Split**: Stacked 2D and 3D views
- **Active Pane**: Focus management between different view panes
- **Single View Modes**: Full 2D-only or 3D-only modes

### ✅ Measurement Overlay in 3D
- **Dynamic Measurements**: Real-time distance and dimension display
- **Toggle Mode**: Enable/disable measurement mode
- **Visual Indicators**: Clear measurement lines and labels in 3D space

### ✅ Advanced Undo/Redo System
- **Cross-View History**: Undo/redo works across both 2D and 3D views
- **Unlimited History**: Configurable history size (default: 50 operations)
- **Keyboard Shortcuts**: Standard Ctrl+Z/Ctrl+Y support
- **Action Descriptions**: Clear descriptions of each operation

### ✅ State Persistence & Auto-Save
- **Auto-Save**: Automatic saving every 30 seconds when changes are detected
- **Dirty State Tracking**: Visual indicators when project has unsaved changes
- **Export/Import**: Full project export with versioning
- **Change Detection**: Efficient tracking of what has changed

### ✅ Performance Optimization
- **Update Batching**: Prevents excessive re-renders during rapid changes
- **Change Detection**: Minimal re-renders using efficient diffing algorithms
- **FPS Monitoring**: Real-time performance tracking and display
- **Throttled Operations**: Prevents UI blocking during heavy operations

## Technical Implementation

### State Management Architecture

```typescript
// Centralized store with all design data
interface DesignState {
  // Core project data
  project: CabinProject | null;
  
  // Design elements
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  rooms: Room[];
  electricalElements: ElectricalElement[];
  plumbingElements: PlumbingElement[];
  
  // View coordination
  splitViewMode: '2d-only' | '3d-only' | 'split-horizontal' | 'split-vertical';
  activePane: '2d' | '3d';
  
  // Selection and interaction
  selectedElements: string[];
  hoveredElement: string | null;
  
  // History and persistence
  history: HistoryEntry[];
  historyIndex: number;
  isDirty: boolean;
  
  // Performance and sync
  syncEnabled: boolean;
  autoSaveEnabled: boolean;
}
```

### Synchronization Flow

1. **Change Detection**: Store subscriptions detect changes to design elements
2. **Change Batching**: Multiple changes within 100ms are batched together
3. **Update Propagation**: Batched updates are sent to registered subscribers
4. **View Updates**: Both 2D and 3D views receive updates and re-render accordingly
5. **Performance Monitoring**: FPS and update metrics are tracked throughout

### Selection Synchronization

```typescript
// Bidirectional selection sync
const useSelectionSync = () => {
  const syncSelectionFrom3DTo2D = (elementId: string, elementType: string) => {
    // Update selection in store
    store.setSelectedElements([elementId]);
    
    // Switch to appropriate view mode if needed
    if (store.splitViewMode === '3d-only') {
      store.setSplitViewMode('split-horizontal');
    }
  };
  
  const syncSelectionFrom2DTo3D = (elementId: string, elementType: string) => {
    // Selection is automatically synced through store subscriptions
    store.setSelectedElements([elementId]);
  };
};
```

## Usage Examples

### Basic Setup

```typescript
import { ProfessionalDesignInterface } from './components/design/ProfessionalDesignInterface';
import { useDesignStore } from './stores/designStore';

function MyApp() {
  const { setProject } = useDesignStore();
  
  useEffect(() => {
    // Initialize with project data
    setProject({
      id: 'cabin-1',
      name: 'My Cabin',
      width: 24,
      length: 32,
      height: 12,
      // ... other properties
    });
  }, []);

  return <ProfessionalDesignInterface />;
}
```

### Adding Elements Programmatically

```typescript
import { useDesignStore } from './stores/designStore';

function AddElements() {
  const { addWall, addDoor, addWindow } = useDesignStore();

  const handleAddWall = () => {
    addWall({
      id: `wall-${Date.now()}`,
      start: { x: 0, y: 0 },
      end: { x: 240, y: 0 },
      thickness: 6,
      type: 'exterior'
    });
  };

  const handleAddDoor = () => {
    addDoor({
      id: `door-${Date.now()}`,
      wallId: 'wall-1',
      position: 0.5,
      width: 36,
      swing: 'right',
      type: 'entry'
    });
  };
}
```

### Custom Sync Integration

```typescript
import { useSyncSystem } from './hooks/useSyncSystem';

function CustomComponent() {
  const { subscribe2D, subscribe3D, triggerSync } = useSyncSystem();

  useEffect(() => {
    // Subscribe to 2D updates
    const unsubscribe2D = subscribe2D((syncData) => {
      console.log('2D updated:', syncData.updates);
    });

    // Subscribe to 3D updates  
    const unsubscribe3D = subscribe3D((syncData) => {
      console.log('3D updated:', syncData.updates);
    });

    return () => {
      unsubscribe2D();
      unsubscribe3D();
    };
  }, []);

  return (
    <button onClick={triggerSync}>
      Force Sync
    </button>
  );
}
```

## Performance Metrics

The system includes comprehensive performance monitoring:

- **FPS Tracking**: Real-time frames per second measurement
- **Update Batching**: Configurable batch sizes and delays
- **Memory Usage**: Efficient state management with minimal memory footprint
- **Render Optimization**: Selective re-renders based on changed elements only

## Configuration Options

### Sync System Configuration

```typescript
const syncOptions = {
  batchDelay: 100,        // ms to batch updates
  maxBatchSize: 10,       // max updates per batch
  throttleInterval: 50    // ms between sync operations
};

const { subscribe2D } = useSyncSystem(syncOptions);
```

### Store Configuration

```typescript
// Maximum history entries (affects memory usage)
maxHistorySize: 50,

// Auto-save interval
autoSaveInterval: 30000, // 30 seconds

// Performance monitoring
enablePerformanceTracking: true
```

## Browser Compatibility

- **Chrome**: Fully supported (recommended)
- **Firefox**: Fully supported
- **Safari**: Supported with minor limitations
- **Edge**: Fully supported
- **Mobile**: Responsive design with touch controls

## Future Enhancements

### Planned Features
- **Real-time Collaboration**: Multi-user editing with operational transforms
- **Version Control**: Git-like branching and merging for designs
- **Cloud Synchronization**: Automatic cloud backup and sync across devices
- **VR/AR Support**: Virtual and augmented reality viewing modes
- **Advanced Materials**: PBR materials with texture management
- **Animation System**: Walkthroughs and animated presentations

### Performance Optimizations
- **Web Workers**: Off-main-thread processing for heavy computations
- **WebGL2 Support**: Enhanced 3D rendering capabilities
- **Streaming Updates**: Progressive loading for large projects
- **Caching System**: Intelligent caching of rendered elements

## Troubleshooting

### Common Issues

1. **Sync Not Working**
   - Check that `syncEnabled` is true in the store
   - Verify component subscriptions are properly set up
   - Check browser console for errors

2. **Performance Issues**
   - Reduce batch size and increase throttle interval
   - Disable unnecessary visual effects
   - Check for memory leaks in subscriptions

3. **3D Rendering Problems**
   - Ensure WebGL is supported and enabled
   - Check GPU drivers are up to date
   - Reduce scene complexity if needed

### Debug Mode

Enable debug logging by setting:

```typescript
window.DREAMCABIN_DEBUG = true;
```

This will log all sync operations, performance metrics, and state changes to the console.

## Contributing

When contributing to the synchronization system:

1. **State Changes**: Always use store actions, never mutate state directly
2. **Performance**: Consider the impact of changes on sync performance
3. **Testing**: Test both 2D and 3D views thoroughly
4. **Documentation**: Update this document when adding new features

## Conclusion

The DreamCabin synchronization system provides a robust foundation for professional-grade 2D/3D design tools. With its real-time updates, bidirectional selection sync, and comprehensive state management, it delivers the seamless user experience required for modern CAD applications.

The system is designed to be extensible and maintainable, with clear separation of concerns and comprehensive error handling. Performance has been optimized throughout, ensuring smooth operation even with complex designs.