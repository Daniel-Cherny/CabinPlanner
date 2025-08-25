# Professional Grid System and Snapping Mechanics

This comprehensive grid system provides professional-grade drawing assistance for the 2D floor plan editor, including snap-to-grid functionality, angle constraints, magnetic snap points, and visual guides.

## Features

### ✅ Grid System
- **Visual grid with 1-foot increments (adjustable)**
- **Dynamic grid scaling based on zoom level**
- **Minor and major grid lines (6" and 12" increments)**
- **Configurable grid opacity and visibility**
- **Grid toggle controls**

### ✅ Snapping System
- **Snap-to-grid for precise alignment**
- **Magnetic snap points for wall endpoints and midpoints**
- **Line snapping for drawing along existing elements**
- **Point snapping for connecting to existing points**
- **Configurable snap distance threshold**

### ✅ Angle Constraints
- **45° and 90° angle constraints**
- **Visual angle guides during drawing**
- **Orthogonal drawing mode (Shift key)**
- **Configurable angle steps**

### ✅ Smart Guides
- **Extension guides (continuing existing lines)**
- **Perpendicular guides (90° from existing lines)**
- **Parallel guides (same angle as existing lines)**
- **Center guides (midpoints between objects)**
- **Intersection detection and snapping**

### ✅ Visual Feedback
- **Snap indicators with crosshair and circle**
- **Real-time distance measurements**
- **Angle indicators**
- **Dynamic guide lines**
- **Status indicators for grid and snap states**

## File Structure

```
src/utils/
├── gridSnapping.ts      # Core grid system class
├── snapHelpers.ts       # Additional snapping utilities
└── gridIntegration.tsx  # Integration example

src/hooks/
└── useGridSystem.ts     # React hook for grid system
```

## Quick Start

### 1. Basic Setup

```tsx
import { useGridSystem } from '@/hooks/useGridSystem';

function MyEditor() {
  const {
    initializeGrid,
    drawGrid,
    snapPoint,
    toggleGrid,
    toggleSnap,
    isGridVisible,
    isSnapEnabled
  } = useGridSystem({
    initialGridConfig: {
      size: 12, // 1 foot = 12 pixels
      showGrid: true,
      snapToGrid: true
    }
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      initializeGrid(canvasRef.current);
    }
  }, [initializeGrid]);

  return (
    <canvas ref={canvasRef} />
  );
}
```

### 2. Drawing with Snapping

```tsx
const handleMouseMove = useCallback((e: React.MouseEvent) => {
  const pos = getMousePosition(e);
  
  // Apply snapping with context
  const snapResult = snapPoint(pos, {
    existingWalls: walls,
    existingPoints: walls.flatMap(w => [w.start, w.end]),
    startPoint: drawingStart
  });

  setMousePosition(snapResult.point);
}, [snapPoint, walls, drawingStart]);
```

### 3. Rendering

```tsx
const draw = useCallback(() => {
  const canvas = canvasRef.current;
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw grid (handles its own transformations)
  drawGrid();

  // Draw your content
  drawWalls(ctx);
  drawCurrentDrawing(ctx);

  // Draw visual guides and snap feedback
  drawVisualGuides();
}, [drawGrid, drawVisualGuides]);
```

## API Reference

### GridSystem Class

#### Configuration
```typescript
interface GridConfig {
  size: number;              // Grid size in pixels (default: 12)
  showGrid: boolean;         // Show/hide grid
  snapToGrid: boolean;       // Enable snapping
  showMinorGrid: boolean;    // Show 6" grid lines
  showMajorGrid: boolean;    // Show 12" grid lines
  dynamicScaling: boolean;   // Scale with zoom
}

interface SnapConfig {
  enabled: boolean;          // Master snap enable
  gridSnap: boolean;         // Snap to grid intersections
  pointSnap: boolean;        // Snap to existing points
  lineSnap: boolean;         // Snap to lines/edges
  angleConstraints: boolean; // Apply angle constraints
  magneticSnap: boolean;     // Magnetic snap points
  snapDistance: number;      // Max snap distance
  angleStep: number;         // Angle step (45°, 90°)
}
```

#### Methods
```typescript
// Initialize with canvas
initialize(canvas: HTMLCanvasElement): void

// Drawing
drawGrid(): void
drawVisualGuides(): void

// Snapping
snapPoint(point: Point, existingPoints?: Point[], lines?: Line[]): SnapResult
snapToGrid(point: Point): Point

// Configuration
updateConfig(config: Partial<GridConfig>): void
updateSnapConfig(config: Partial<SnapConfig>): void
toggleGrid(): void
toggleSnap(): void

// Coordinate transformation
screenToWorld(screenPoint: Point): Point
worldToScreen(worldPoint: Point): Point

// State management
setZoom(zoom: number): void
setPanOffset(offset: Point): void
setOrthogonalMode(enabled: boolean): void
```

### useGridSystem Hook

```typescript
const {
  // Core functionality
  initializeGrid,
  drawGrid,
  drawVisualGuides,
  
  // Snapping
  snapPoint,
  snapToGrid,
  currentSnapResult,
  
  // Configuration
  updateGridConfig,
  updateSnapConfig,
  toggleGrid,
  toggleSnap,
  
  // State
  isShiftPressed,
  isGridVisible,
  isSnapEnabled,
  
  // Utilities
  calculateDistance,
  screenToWorld,
  worldToScreen
} = useGridSystem(options);
```

## Advanced Features

### Smart Guides

The system automatically generates intelligent guides based on existing geometry:

```typescript
// Extension guides - continue existing lines
// Perpendicular guides - 90° from existing lines
// Parallel guides - same angle as existing lines
// Center guides - midpoints between objects

const smartGuides = useGridSystem({
  enableSmartGuides: true
});
```

### Magnetic Snap Points

Automatically generated snap points for:
- Wall endpoints and midpoints
- Wall intersections
- Quarter points on long walls
- Centers between objects

```typescript
const magneticSnap = useGridSystem({
  enableMagneticSnap: true
});
```

### Orthogonal Drawing

Hold Shift to constrain drawing to horizontal/vertical:

```tsx
const handleMouseMove = (e) => {
  // Automatically handled by the grid system
  // Shift key constraint is applied in snapPoint()
};
```

## Key Bindings

- **Shift**: Enable orthogonal mode (horizontal/vertical constraints)
- **Alt**: Temporarily disable snapping (if implemented)
- **G**: Toggle grid visibility (implement in your app)
- **S**: Toggle snap functionality (implement in your app)

## Configuration Examples

### Basic CAD-style Grid
```typescript
{
  initialGridConfig: {
    size: 12,              // 1 foot
    showGrid: true,
    showMinorGrid: true,   // Show 6" lines
    showMajorGrid: true,   // Show 12" lines
    snapToGrid: true
  },
  initialSnapConfig: {
    enabled: true,
    snapDistance: 20,
    angleStep: 45          // 45° increments
  }
}
```

### Precision Drawing
```typescript
{
  initialGridConfig: {
    size: 24,              // 2 feet for larger scale
    showGrid: true,
    dynamicScaling: true   // Adjust for zoom
  },
  initialSnapConfig: {
    enabled: true,
    magneticSnap: true,
    angleConstraints: true,
    snapDistance: 15       // Smaller snap distance
  }
}
```

## Integration with Professional2DEditor

To integrate with your existing editor:

1. **Replace basic grid drawing** with `drawGrid()`
2. **Replace mouse position calculation** with `snapPoint()`
3. **Add visual feedback** with `drawVisualGuides()`
4. **Update coordinate transformations** with `screenToWorld()` and `worldToScreen()`
5. **Add keyboard handlers** for Shift key orthogonal mode

See `gridIntegration.tsx` for a complete example.

## Performance Considerations

- Grid rendering optimizes for visible area only
- Smart guides are generated on-demand
- Snap calculations use spatial partitioning for large datasets
- Visual guides are cleared between operations to prevent buildup

## Customization

All colors, sizes, and behaviors can be customized through the configuration objects. The system is designed to be extensible for additional snap types and guide generation.

## Troubleshooting

**Grid not visible**: Check `showGrid` config and ensure canvas is properly sized
**Snapping not working**: Verify `snapToGrid` and `enabled` configs
**Performance issues**: Reduce `snapDistance` or disable `enableSmartGuides`
**Coordinate problems**: Ensure proper zoom/pan updates with `setZoom()` and `setPanOffset()`

## Future Enhancements

- [ ] Polar coordinate snapping
- [ ] Custom snap point registration
- [ ] Measurement overlay system
- [ ] Grid presets for different scales
- [ ] Undo/redo integration
- [ ] Multi-layer grid support