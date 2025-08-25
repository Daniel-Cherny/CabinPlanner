import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  Move, 
  Square, 
  Minus, 
  DoorOpen, 
  RectangleHorizontal, 
  Zap, 
  Droplets,
  Home,
  Ruler,
  Layers,
  Grid3X3,
  RotateCcw,
  Undo,
  Redo,
  MousePointer
} from "lucide-react";

interface Point {
  x: number;
  y: number;
}

interface Wall {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
  type: 'exterior' | 'interior' | 'structural';
}

interface Room {
  id: string;
  name: string;
  area: number;
  walls: string[];
  center: Point;
}

interface Door {
  id: string;
  wallId: string;
  position: number; // percentage along wall
  width: number;
  swing: 'left' | 'right' | 'in' | 'out';
  type: 'entry' | 'interior' | 'sliding';
}

interface Window {
  id: string;
  wallId: string;
  position: number;
  width: number;
  height: number;
  sillHeight: number;
  type: 'single' | 'double' | 'picture' | 'sliding';
}

interface ViewportTransform {
  scale: number;
  translateX: number;
  translateY: number;
  matrix: DOMMatrix;
}

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  lastFrameTime: number;
  frameCount: number;
}

interface EditorState {
  walls: Wall[];
  rooms: Room[];
  doors: Door[];
  windows: Window[];
  selectedTool: string;
  selectedElement: string | null;
  gridSize: number;
  snapToGrid: boolean;
  showDimensions: boolean;
  showGrid: boolean;
  zoom: number;
  panOffset: Point;
  viewport: ViewportTransform;
  isDirty: boolean;
  dirtyRegions: Rectangle[];
  history: EditorState[];
  historyIndex: number;
  electricalElements?: any[];
  plumbingElements?: any[];
}

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanvasLayers {
  background: HTMLCanvasElement;
  grid: HTMLCanvasElement;
  walls: HTMLCanvasElement;
  elements: HTMLCanvasElement;
  ui: HTMLCanvasElement;
}

interface AnimationState {
  isAnimating: boolean;
  startTime: number;
  duration: number;
  startZoom: number;
  targetZoom: number;
  startPan: Point;
  targetPan: Point;
}

interface Professional2DEditorProps {
  projectData: any;
  onProjectDataChange: (updates: any) => void;
  selectedTool: string;
  onToolChange: (tool: string) => void;
}

export function Professional2DEditor({ 
  projectData, 
  onProjectDataChange, 
  selectedTool, 
  onToolChange 
}: Professional2DEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);
  const layersRef = useRef<CanvasLayers | null>(null);
  const performanceRef = useRef<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    lastFrameTime: 0,
    frameCount: 0
  });
  const isDragging = useRef(false);
  const lastMousePos = useRef<Point>({ x: 0, y: 0 });
  const animationState = useRef<AnimationState>({
    isAnimating: false,
    startTime: 0,
    duration: 0,
    startZoom: 1,
    targetZoom: 1,
    startPan: { x: 0, y: 0 },
    targetPan: { x: 0, y: 0 }
  });
  
  const [editorState, setEditorState] = useState<EditorState>(() => {
    const initialTransform = new DOMMatrix();
    return {
      walls: [],
      rooms: [],
      doors: [],
      windows: [],
      selectedTool: 'select',
      selectedElement: null,
      gridSize: 12, // 1 foot = 12 pixels at base zoom
      snapToGrid: true,
      showDimensions: true,
      showGrid: true,
      zoom: 1,
      panOffset: { x: 0, y: 0 },
      viewport: {
        scale: 1,
        translateX: 0,
        translateY: 0,
        matrix: initialTransform
      },
      isDirty: true,
      dirtyRegions: [],
      history: [],
      historyIndex: -1,
      electricalElements: [],
      plumbingElements: []
    };
  });

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWall, setCurrentWall] = useState<Partial<Wall> | null>(null);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [showFPS, setShowFPS] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    lastFrameTime: 0,
    frameCount: 0
  });

  // Initialize canvas layers
  const initializeLayers = useCallback(() => {
    const container = containerRef.current;
    if (!container) return null;

    const createLayer = (zIndex: number): HTMLCanvasElement => {
      const canvas = document.createElement('canvas');
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.zIndex = zIndex.toString();
      canvas.style.pointerEvents = 'none';
      return canvas;
    };

    const layers: CanvasLayers = {
      background: createLayer(1),
      grid: createLayer(2),
      walls: createLayer(3),
      elements: createLayer(4),
      ui: createLayer(5)
    };

    // Add layers to container
    Object.values(layers).forEach(layer => container.appendChild(layer));

    return layers;
  }, []);

  // Animation loop for smooth 60fps rendering
  const animate = useCallback((timestamp: number) => {
    const perf = performanceRef.current;
    perf.frameCount++;
    
    if (timestamp - perf.lastFrameTime >= 1000) {
      perf.fps = Math.round((perf.frameCount * 1000) / (timestamp - perf.lastFrameTime));
      perf.frameCount = 0;
      perf.lastFrameTime = timestamp;
      setPerformanceMetrics({ ...perf });
    }

    // Handle zoom/pan animations
    const anim = animationState.current;
    if (anim.isAnimating) {
      const elapsed = timestamp - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic

      const currentZoom = anim.startZoom + (anim.targetZoom - anim.startZoom) * eased;
      const currentPanX = anim.startPan.x + (anim.targetPan.x - anim.startPan.x) * eased;
      const currentPanY = anim.startPan.y + (anim.targetPan.y - anim.startPan.y) * eased;

      updateViewport(currentZoom, { x: currentPanX, y: currentPanY });

      if (progress >= 1) {
        anim.isAnimating = false;
      }
    }

    // Only redraw if dirty or animating
    if (editorState.isDirty || anim.isAnimating) {
      renderLayers();
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [editorState]);

  // Update viewport transform
  const updateViewport = useCallback((zoom: number, pan: Point) => {
    const matrix = new DOMMatrix();
    matrix.translateSelf(pan.x, pan.y);
    matrix.scaleSelf(zoom, zoom);

    setEditorState(prev => ({
      ...prev,
      zoom,
      panOffset: pan,
      viewport: {
        scale: zoom,
        translateX: pan.x,
        translateY: pan.y,
        matrix
      },
      isDirty: true
    }));
  }, []);

  // Canvas setup and rendering
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Set main canvas size and make it interactive
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '10';

    // Initialize layers
    layersRef.current = initializeLayers();

    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(animate);

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      if (layersRef.current) {
        Object.values(layersRef.current).forEach(layer => {
          layer.width = container.clientWidth;
          layer.height = container.clientHeight;
        });
      }
      
      setEditorState(prev => ({ ...prev, isDirty: true }));
    });
    
    resizeObserver.observe(container);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      resizeObserver.disconnect();
      
      // Clean up layers
      if (layersRef.current) {
        Object.values(layersRef.current).forEach(layer => {
          if (layer.parentNode) {
            layer.parentNode.removeChild(layer);
          }
        });
      }
    };
  }, [animate, initializeLayers]);

  // Layer-based rendering system
  const renderLayers = useCallback(() => {
    const layers = layersRef.current;
    if (!layers) return;

    const transform = editorState.viewport;

    // Only redraw layers that need updating
    if (editorState.isDirty) {
      // Background layer
      const bgCtx = layers.background.getContext('2d');
      if (bgCtx) {
        bgCtx.clearRect(0, 0, layers.background.width, layers.background.height);
        bgCtx.save();
        bgCtx.setTransform(transform.matrix);
        drawBackground(bgCtx);
        bgCtx.restore();
      }

      // Grid layer
      if (editorState.showGrid) {
        const gridCtx = layers.grid.getContext('2d');
        if (gridCtx) {
          gridCtx.clearRect(0, 0, layers.grid.width, layers.grid.height);
          gridCtx.save();
          gridCtx.setTransform(transform.matrix);
          drawGrid(gridCtx);
          gridCtx.restore();
        }
      } else {
        const gridCtx = layers.grid.getContext('2d');
        if (gridCtx) {
          gridCtx.clearRect(0, 0, layers.grid.width, layers.grid.height);
        }
      }

      // Walls layer
      const wallsCtx = layers.walls.getContext('2d');
      if (wallsCtx) {
        wallsCtx.clearRect(0, 0, layers.walls.width, layers.walls.height);
        wallsCtx.save();
        wallsCtx.setTransform(transform.matrix);
        
        editorState.walls.forEach(wall => drawWall(wallsCtx, wall));
        
        // Draw current wall being drawn
        if (currentWall && currentWall.start) {
          drawCurrentWall(wallsCtx);
        }

        // Draw dimensions
        if (editorState.showDimensions) {
          editorState.walls.forEach(wall => drawWallDimensions(wallsCtx, wall));
        }
        
        wallsCtx.restore();
      }

      // Elements layer (doors, windows, electrical, plumbing)
      const elementsCtx = layers.elements.getContext('2d');
      if (elementsCtx) {
        elementsCtx.clearRect(0, 0, layers.elements.width, layers.elements.height);
        elementsCtx.save();
        elementsCtx.setTransform(transform.matrix);
        
        editorState.doors.forEach(door => drawDoor(elementsCtx, door));
        editorState.windows.forEach(window => drawWindow(elementsCtx, window));
        editorState.electricalElements?.forEach(element => drawElectricalElement(elementsCtx, element));
        editorState.plumbingElements?.forEach(element => drawPlumbingElement(elementsCtx, element));
        
        // Draw rooms with professional area labels
        editorState.rooms.forEach(room => {
          drawRoom(elementsCtx, room);
          
          // Professional area labels
          if (editorState.showAreaLabels && dimensionRendererRef.current) {
            dimensionRendererRef.current.drawAreaLabel(
              room.center,
              room.area * editorState.gridSize * editorState.gridSize, // Convert to pixels
              room.name
            );
          }
        });
        
        // Draw measurement tool
        if (measurementToolRef.current) {
          measurementToolRef.current.render();
        }
        
        elementsCtx.restore();
      }

      // UI layer (selections, hover effects)
      const uiCtx = layers.ui.getContext('2d');
      if (uiCtx) {
        uiCtx.clearRect(0, 0, layers.ui.width, layers.ui.height);
        uiCtx.save();
        uiCtx.setTransform(transform.matrix);
        
        if (editorState.selectedElement) {
          drawSelection(uiCtx, editorState.selectedElement);
        }
        if (hoveredElement) {
          drawHover(uiCtx, hoveredElement);
        }
        
        uiCtx.restore();
      }
    }

    // Mark as clean
    if (editorState.isDirty) {
      setEditorState(prev => ({ ...prev, isDirty: false, dirtyRegions: [] }));
    }
  }, [editorState, currentWall, hoveredElement]);

  // Background drawing (for future use)
  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    // Could add background patterns, textures, etc.
  };

  // Optimized grid drawing with viewport culling
  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas;
    const gridSize = editorState.gridSize;
    const zoom = editorState.viewport.scale;
    const pan = editorState.panOffset;
    
    // Calculate visible area bounds
    const viewLeft = -pan.x / zoom;
    const viewTop = -pan.y / zoom;
    const viewRight = viewLeft + width / zoom;
    const viewBottom = viewTop + height / zoom;
    
    // Only draw grid lines in visible area
    const startX = Math.floor(viewLeft / gridSize) * gridSize;
    const endX = Math.ceil(viewRight / gridSize) * gridSize;
    const startY = Math.floor(viewTop / gridSize) * gridSize;
    const endY = Math.ceil(viewBottom / gridSize) * gridSize;

    // Major grid lines (every foot)
    ctx.strokeStyle = zoom > 0.5 ? '#e5e7eb' : '#f3f4f6';
    ctx.lineWidth = Math.max(0.5 / zoom, 0.1);
    ctx.setLineDash([]);

    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, viewTop);
      ctx.lineTo(x, viewBottom);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(viewLeft, y);
      ctx.lineTo(viewRight, y);
    }
    ctx.stroke();

    // Minor grid lines (every 6 inches) - only show at higher zoom levels
    if (zoom > 1) {
      ctx.strokeStyle = '#f3f4f6';
      ctx.lineWidth = Math.max(0.25 / zoom, 0.05);
      
      ctx.beginPath();
      for (let x = startX; x <= endX; x += gridSize / 2) {
        if (x % gridSize !== 0) { // Skip major grid lines
          ctx.moveTo(x, viewTop);
          ctx.lineTo(x, viewBottom);
        }
      }
      for (let y = startY; y <= endY; y += gridSize / 2) {
        if (y % gridSize !== 0) { // Skip major grid lines
          ctx.moveTo(viewLeft, y);
          ctx.lineTo(viewRight, y);
        }
      }
      ctx.stroke();
    }
  };

  const drawWall = (ctx: CanvasRenderingContext2D, wall: Wall) => {
    const isSelected = editorState.selectedElement === wall.id;
    const isHovered = hoveredElement === wall.id;
    const isEditing = editorState.wallEditing.selectedWallId === wall.id;
    
    // Calculate wall thickness in pixels (scale with grid)
    const thicknessPx = (wall.thickness / 12) * editorState.gridSize;
    
    // Wall line weight based on type
    const lineWeight = wall.type === 'exterior' ? 3 : 
                      wall.type === 'structural' ? 2.5 : 2;
    
    // Wall color
    let strokeStyle = wall.type === 'exterior' ? '#1f2937' : 
                     wall.type === 'structural' ? '#7c2d12' : '#6b7280';
    
    if (isSelected || isEditing) {
      strokeStyle = '#3b82f6';
    } else if (isHovered) {
      strokeStyle = '#60a5fa';
    }

    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWeight;
    ctx.setLineDash([]);

    // Draw main wall line
    ctx.beginPath();
    ctx.moveTo(wall.start.x, wall.start.y);
    ctx.lineTo(wall.end.x, wall.end.y);
    ctx.stroke();

    // Draw wall thickness representation
    if (thicknessPx > 4) {
      const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
      const perpAngle = angle + Math.PI / 2;
      const offset = thicknessPx / 2;

      ctx.strokeStyle = wall.type === 'exterior' ? '#374151' : 
                       wall.type === 'structural' ? '#92400e' : '#9ca3af';
      ctx.lineWidth = 1;

      // Top edge
      ctx.beginPath();
      ctx.moveTo(
        wall.start.x + Math.cos(perpAngle) * offset,
        wall.start.y + Math.sin(perpAngle) * offset
      );
      ctx.lineTo(
        wall.end.x + Math.cos(perpAngle) * offset,
        wall.end.y + Math.sin(perpAngle) * offset
      );
      ctx.stroke();

      // Bottom edge
      ctx.beginPath();
      ctx.moveTo(
        wall.start.x - Math.cos(perpAngle) * offset,
        wall.start.y - Math.sin(perpAngle) * offset
      );
      ctx.lineTo(
        wall.end.x - Math.cos(perpAngle) * offset,
        wall.end.y - Math.sin(perpAngle) * offset
      );
      ctx.stroke();

      // End caps for better corner visualization
      drawWallEndCap(ctx, wall.start, perpAngle, offset, strokeStyle);
      drawWallEndCap(ctx, wall.end, perpAngle, offset, strokeStyle);
    }

    // Draw intersections if enabled
    if (editorState.showIntersections && wall.intersections) {
      drawWallIntersections(ctx, wall);
    }
  };

  const drawWallEndCap = (ctx: CanvasRenderingContext2D, point: Point, perpAngle: number, offset: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(
      point.x + Math.cos(perpAngle) * offset,
      point.y + Math.sin(perpAngle) * offset
    );
    ctx.lineTo(
      point.x - Math.cos(perpAngle) * offset,
      point.y - Math.sin(perpAngle) * offset
    );
    ctx.stroke();
  };

  const drawWallIntersections = (ctx: CanvasRenderingContext2D, wall: Wall) => {
    if (!wall.intersections) return;

    wall.intersections.forEach(intersection => {
      ctx.fillStyle = intersection.type === 'corner' ? '#10b981' :
                     intersection.type === 'tee' ? '#f59e0b' : '#ef4444';
      
      ctx.beginPath();
      ctx.arc(intersection.point.x, intersection.point.y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  const drawCurrentWall = (ctx: CanvasRenderingContext2D) => {
    const currentWall = editorState.wallDrawing.currentWall || (isDrawing ? currentWall : null);
    if (!currentWall?.start) return;

    const constrainedEnd = getConstrainedPoint(currentWall.start, mousePos);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);

    ctx.beginPath();
    ctx.moveTo(currentWall.start.x, currentWall.start.y);
    ctx.lineTo(constrainedEnd.x, constrainedEnd.y);
    ctx.stroke();

    // Show length and angle as you draw
    const length = Math.sqrt(
      Math.pow(constrainedEnd.x - currentWall.start.x, 2) + 
      Math.pow(constrainedEnd.y - currentWall.start.y, 2)
    );
    const lengthFeet = Math.round((length / editorState.gridSize) * 12) / 12;
    const angle = Math.atan2(constrainedEnd.y - currentWall.start.y, constrainedEnd.x - currentWall.start.x) * 180 / Math.PI;
    
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(
      `${lengthFeet}' @ ${Math.round(angle)}°`,
      (currentWall.start.x + constrainedEnd.x) / 2,
      (currentWall.start.y + constrainedEnd.y) / 2 - 10
    );

    // Draw angle constraint indicator
    if (editorState.wallDrawing.angleConstraints) {
      drawAngleConstraintIndicator(ctx, currentWall.start, constrainedEnd, angle);
    }
  };

  // Enhanced Drawing Helper Functions
  const drawAngleConstraintIndicator = (ctx: CanvasRenderingContext2D, start: Point, end: Point, angle: number) => {
    const constraintAngles = [0, 45, 90, 135, 180, 225, 270, 315];
    const normalizedAngle = ((angle % 360) + 360) % 360;
    
    const closestConstraint = constraintAngles.reduce((closest, constraint) => {
      const diff = Math.abs(normalizedAngle - constraint);
      return diff < Math.abs(normalizedAngle - closest) ? constraint : closest;
    });

    if (Math.abs(normalizedAngle - closestConstraint) < 5) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      
      const constraintRadians = closestConstraint * Math.PI / 180;
      const indicatorLength = 30;
      
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(
        start.x + Math.cos(constraintRadians) * indicatorLength,
        start.y + Math.sin(constraintRadians) * indicatorLength
      );
      ctx.stroke();
    }
  };

  const drawSnapPoints = (ctx: CanvasRenderingContext2D) => {
    editorState.wallDrawing.snapPoints.forEach(snapPoint => {
      ctx.fillStyle = snapPoint.type === 'wall-end' ? '#ef4444' : 
                     snapPoint.type === 'wall-intersection' ? '#f59e0b' : 
                     snapPoint.type === 'wall-midpoint' ? '#10b981' : '#6b7280';
      
      ctx.beginPath();
      ctx.arc(snapPoint.point.x, snapPoint.point.y, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw snap point indicator
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };

  const drawWallDimensions = (ctx: CanvasRenderingContext2D, wall: Wall) => {
    const length = Math.sqrt(
      Math.pow(wall.end.x - wall.start.x, 2) + 
      Math.pow(wall.end.y - wall.start.y, 2)
    );
    const lengthFeet = Math.round((length / editorState.gridSize) * 12) / 12;
    
    // Dimension line
    const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
    const perpAngle = angle + Math.PI / 2;
    const offset = 20;

    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    // Extension lines
    ctx.beginPath();
    ctx.moveTo(wall.start.x, wall.start.y);
    ctx.lineTo(
      wall.start.x + Math.cos(perpAngle) * offset,
      wall.start.y + Math.sin(perpAngle) * offset
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(wall.end.x, wall.end.y);
    ctx.lineTo(
      wall.end.x + Math.cos(perpAngle) * offset,
      wall.end.y + Math.sin(perpAngle) * offset
    );
    ctx.stroke();

    // Dimension line
    ctx.beginPath();
    ctx.moveTo(
      wall.start.x + Math.cos(perpAngle) * offset,
      wall.start.y + Math.sin(perpAngle) * offset
    );
    ctx.lineTo(
      wall.end.x + Math.cos(perpAngle) * offset,
      wall.end.y + Math.sin(perpAngle) * offset
    );
    ctx.stroke();

    // Dimension text
    ctx.fillStyle = '#374151';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${lengthFeet}'`,
      (wall.start.x + wall.end.x) / 2 + Math.cos(perpAngle) * offset,
      (wall.start.y + wall.end.y) / 2 + Math.sin(perpAngle) * offset - 5
    );
  };

  const drawDoor = (ctx: CanvasRenderingContext2D, door: Door) => {
    const wall = editorState.walls.find(w => w.id === door.wallId);
    if (!wall) return;

    const wallLength = Math.sqrt(
      Math.pow(wall.end.x - wall.start.x, 2) + 
      Math.pow(wall.end.y - wall.start.y, 2)
    );
    
    const doorPosition = {
      x: wall.start.x + (wall.end.x - wall.start.x) * door.position,
      y: wall.start.y + (wall.end.y - wall.start.y) * door.position
    };

    // Door opening
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = door.width * editorState.gridSize / 12;
    ctx.setLineDash([]);

    const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
    const doorStart = {
      x: doorPosition.x - Math.cos(angle) * (door.width * editorState.gridSize / 24),
      y: doorPosition.y - Math.sin(angle) * (door.width * editorState.gridSize / 24)
    };
    const doorEnd = {
      x: doorPosition.x + Math.cos(angle) * (door.width * editorState.gridSize / 24),
      y: doorPosition.y + Math.sin(angle) * (door.width * editorState.gridSize / 24)
    };

    ctx.beginPath();
    ctx.moveTo(doorStart.x, doorStart.y);
    ctx.lineTo(doorEnd.x, doorEnd.y);
    ctx.stroke();

    // Door swing arc
    if (door.type !== 'sliding') {
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      const swingRadius = door.width * editorState.gridSize / 12;
      const perpAngle = angle + (door.swing.includes('left') ? -Math.PI/2 : Math.PI/2);
      
      ctx.beginPath();
      ctx.arc(
        door.swing.includes('left') ? doorStart.x : doorEnd.x,
        door.swing.includes('left') ? doorStart.y : doorEnd.y,
        swingRadius,
        angle + (door.swing.includes('left') ? 0 : Math.PI),
        angle + (door.swing.includes('left') ? Math.PI/2 : -Math.PI/2)
      );
      ctx.stroke();
    }
  };

  const drawWindow = (ctx: CanvasRenderingContext2D, window: Window) => {
    const wall = editorState.walls.find(w => w.id === window.wallId);
    if (!wall) return;

    const windowPosition = {
      x: wall.start.x + (wall.end.x - wall.start.x) * window.position,
      y: wall.start.y + (wall.end.y - wall.start.y) * window.position
    };

    // Window opening
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);

    const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
    const windowStart = {
      x: windowPosition.x - Math.cos(angle) * (window.width * editorState.gridSize / 24),
      y: windowPosition.y - Math.sin(angle) * (window.width * editorState.gridSize / 24)
    };
    const windowEnd = {
      x: windowPosition.x + Math.cos(angle) * (window.width * editorState.gridSize / 24),
      y: windowPosition.y + Math.sin(angle) * (window.width * editorState.gridSize / 24)
    };

    ctx.beginPath();
    ctx.moveTo(windowStart.x, windowStart.y);
    ctx.lineTo(windowEnd.x, windowEnd.y);
    ctx.stroke();

    // Window sill lines
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1;
    
    const perpAngle = angle + Math.PI / 2;
    const sillOffset = 4;

    ctx.beginPath();
    ctx.moveTo(
      windowStart.x + Math.cos(perpAngle) * sillOffset,
      windowStart.y + Math.sin(perpAngle) * sillOffset
    );
    ctx.lineTo(
      windowEnd.x + Math.cos(perpAngle) * sillOffset,
      windowEnd.y + Math.sin(perpAngle) * sillOffset
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(
      windowStart.x - Math.cos(perpAngle) * sillOffset,
      windowStart.y - Math.sin(perpAngle) * sillOffset
    );
    ctx.lineTo(
      windowEnd.x - Math.cos(perpAngle) * sillOffset,
      windowEnd.y - Math.sin(perpAngle) * sillOffset
    );
    ctx.stroke();
  };

  const drawRoom = (ctx: CanvasRenderingContext2D, room: Room) => {
    // Room label
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(room.name, room.center.x, room.center.y);

    // Area
    ctx.font = '12px sans-serif';
    ctx.fillText(`${room.area} sq ft`, room.center.x, room.center.y + 16);
  };

  const drawSelection = (ctx: CanvasRenderingContext2D, elementId: string) => {
    // Implementation for selection highlighting
  };

  const drawHover = (ctx: CanvasRenderingContext2D, elementId: string) => {
    // Implementation for hover effects
  };

  const drawElectricalElement = (ctx: CanvasRenderingContext2D, element: any) => {
    ctx.fillStyle = '#eab308';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(element.symbol, element.position.x, element.position.y);
    
    // Draw circle background
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(element.position.x, element.position.y, 12, 0, Math.PI * 2);
    ctx.stroke();
  };

  const drawPlumbingElement = (ctx: CanvasRenderingContext2D, element: any) => {
    ctx.fillStyle = '#06b6d4';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(element.symbol, element.position.x, element.position.y);
    
    // Draw square background
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.strokeRect(element.position.x - 12, element.position.y - 12, 24, 24);
  };

  // Enhanced mouse position calculation with viewport transform
  const getMousePos = (e: React.MouseEvent | MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'clientX' in e ? e.clientX : e.clientX;
    const clientY = 'clientY' in e ? e.clientY : e.clientY;
    
    // Transform screen coordinates to world coordinates
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    
    const worldX = (screenX - editorState.panOffset.x) / editorState.zoom;
    const worldY = (screenY - editorState.panOffset.y) / editorState.zoom;

    if (editorState.snapToGrid) {
      return {
        x: Math.round(worldX / editorState.gridSize) * editorState.gridSize,
        y: Math.round(worldY / editorState.gridSize) * editorState.gridSize
      };
    }

    return { x: worldX, y: worldY };
  };

  // Smooth zoom animation
  const animateZoom = useCallback((targetZoom: number, centerPoint?: Point) => {
    const anim = animationState.current;
    
    // Calculate new pan offset to zoom into the center point
    let targetPan = editorState.panOffset;
    if (centerPoint) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const zoomFactor = targetZoom / editorState.zoom;
        
        targetPan = {
          x: centerPoint.x - (centerPoint.x - editorState.panOffset.x) * zoomFactor,
          y: centerPoint.y - (centerPoint.y - editorState.panOffset.y) * zoomFactor
        };
      }
    }
    
    anim.isAnimating = true;
    anim.startTime = performance.now();
    anim.duration = 200; // 200ms animation
    anim.startZoom = editorState.zoom;
    anim.targetZoom = Math.max(0.1, Math.min(10, targetZoom));
    anim.startPan = editorState.panOffset;
    anim.targetPan = targetPan;
  }, [editorState.zoom, editorState.panOffset]);

  // Smooth pan animation
  const animatePan = useCallback((targetPan: Point) => {
    const anim = animationState.current;
    
    anim.isAnimating = true;
    anim.startTime = performance.now();
    anim.duration = 150; // 150ms animation
    anim.startZoom = editorState.zoom;
    anim.targetZoom = editorState.zoom;
    anim.startPan = editorState.panOffset;
    anim.targetPan = targetPan;
  }, [editorState.zoom, editorState.panOffset]);

  // Wheel event for zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const centerPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = editorState.zoom * zoomFactor;
    
    animateZoom(newZoom, centerPoint);
  }, [editorState.zoom, animateZoom]);

  // Mouse event handlers with pan support
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e);
    
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      // Middle mouse button or Ctrl+Click for panning
      isDragging.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }
    
    if (selectedTool === 'wall') {
      if (!isDrawing) {
        setIsDrawing(true);
        setCurrentWall({
          id: `wall-${Date.now()}`,
          start: pos,
          thickness: 6,
          type: 'exterior'
        });
      } else {
        // Complete wall
        if (currentWall?.start) {
          const newWall: Wall = {
            ...currentWall as Wall,
            end: pos
          };
          
          addToHistory();
          setEditorState(prev => ({
            ...prev,
            walls: [...prev.walls, newWall],
            isDirty: true
          }));
          
          setIsDrawing(false);
          setCurrentWall(null);
        }
      }
    } else if (selectedTool === 'door' || selectedTool === 'window') {
      const closestWall = findClosestWall(pos);
      if (closestWall) {
        addToHistory();
        addDoorOrWindow(closestWall, pos, selectedTool);
      }
    } else if (selectedTool === 'electrical') {
      addToHistory();
      addElectricalElement(pos);
    } else if (selectedTool === 'plumbing') {
      addToHistory();
      addPlumbingElement(pos);
    }
  }, [selectedTool, isDrawing, currentWall, getMousePos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e);
    setMousePos(pos);
    
    if (isDragging.current) {
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      
      const newPan = {
        x: editorState.panOffset.x + deltaX,
        y: editorState.panOffset.y + deltaY
      };
      
      updateViewport(editorState.zoom, newPan);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }

    // Update snap points when drawing walls
    if (editorState.wallDrawing.isActive) {
      const snapPoints = findSnapPoints(pos);
      setEditorState(prev => ({
        ...prev,
        wallDrawing: {
          ...prev.wallDrawing,
          snapPoints
        }
      }));
    }

    // Update hover
    const hoveredWall = editorState.walls.find(wall => {
      const distance = distanceToWall(pos, wall);
      return distance < 10;
    });
    setHoveredElement(hoveredWall?.id || null);
  }, [getMousePos, editorState.panOffset, editorState.zoom, editorState.wallDrawing.isActive, editorState.walls, updateViewport]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || isDragging.current) {
      isDragging.current = false;
    }
  }, []);

  // Add to history for undo/redo
  const addToHistory = useCallback(() => {
    setEditorState(prev => {
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push({ ...prev });
      
      // Limit history size
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      
      return {
        ...prev,
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    });
  }, []);

  // Undo functionality
  const undo = useCallback(() => {
    if (editorState.historyIndex > 0) {
      const previousState = editorState.history[editorState.historyIndex - 1];
      setEditorState(prev => ({
        ...previousState,
        historyIndex: prev.historyIndex - 1,
        isDirty: true
      }));
    }
  }, [editorState.history, editorState.historyIndex]);

  // Redo functionality
  const redo = useCallback(() => {
    if (editorState.historyIndex < editorState.history.length - 1) {
      const nextState = editorState.history[editorState.historyIndex + 1];
      setEditorState(prev => ({
        ...nextState,
        historyIndex: prev.historyIndex + 1,
        isDirty: true
      }));
    }
  }, [editorState.history, editorState.historyIndex]);

  // Keyboard shortcuts and wheel event setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            e.preventDefault();
            break;
          case 'y':
            redo();
            e.preventDefault();
            break;
          case '0':
            animateZoom(1);
            e.preventDefault();
            break;
        }
      }
    };

    // Attach wheel event to canvas for zoom
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo, animateZoom, handleWheel]);

  const addElectricalElement = useCallback((pos: Point) => {
    // Add electrical outlet or switch
    const elementType = Math.random() > 0.5 ? 'outlet' : 'switch';
    const newElement = {
      id: `electrical-${Date.now()}`,
      type: elementType,
      position: pos,
      symbol: elementType === 'outlet' ? '⚡' : '💡'
    };
    
    setEditorState(prev => ({
      ...prev,
      electricalElements: [...(prev.electricalElements || []), newElement],
      isDirty: true
    }));
  }, []);

  const addPlumbingElement = useCallback((pos: Point) => {
    // Add plumbing fixture
    const fixtureType = ['sink', 'toilet', 'shower'][Math.floor(Math.random() * 3)];
    const newFixture = {
      id: `plumbing-${Date.now()}`,
      type: fixtureType,
      position: pos,
      symbol: fixtureType === 'sink' ? '🚿' : fixtureType === 'toilet' ? '🚽' : '🛁'
    };
    
    setEditorState(prev => ({
      ...prev,
      plumbingElements: [...(prev.plumbingElements || []), newFixture],
      isDirty: true
    }));
  }, []);

  const findClosestWall = (point: Point): Wall | null => {
    let closestWall: Wall | null = null;
    let minDistance = 20; // Maximum distance to consider
    
    editorState.walls.forEach(wall => {
      const distance = distanceToWall(point, wall);
      if (distance < minDistance) {
        minDistance = distance;
        closestWall = wall;
      }
    });
    
    return closestWall;
  };

  const distanceToWall = (point: Point, wall: Wall): number => {
    const A = point.x - wall.start.x;
    const B = point.y - wall.start.y;
    const C = wall.end.x - wall.start.x;
    const D = wall.end.y - wall.start.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    let param = dot / lenSq;
    param = Math.max(0, Math.min(1, param));

    const xx = wall.start.x + param * C;
    const yy = wall.start.y + param * D;

    const dx = point.x - xx;
    const dy = point.y - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  };

  const addDoorOrWindow = useCallback((wall: Wall, clickPos: Point, type: 'door' | 'window') => {
    const wallLength = Math.sqrt(
      Math.pow(wall.end.x - wall.start.x, 2) + 
      Math.pow(wall.end.y - wall.start.y, 2)
    );
    
    // Calculate position along wall (0 to 1)
    const A = clickPos.x - wall.start.x;
    const B = clickPos.y - wall.start.y;
    const C = wall.end.x - wall.start.x;
    const D = wall.end.y - wall.start.y;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    const position = Math.max(0.1, Math.min(0.9, dot / lenSq));

    if (type === 'door') {
      const newDoor: Door = {
        id: `door-${Date.now()}`,
        wallId: wall.id,
        position,
        width: 36, // inches
        swing: 'right',
        type: 'entry'
      };
      
      setEditorState(prev => ({
        ...prev,
        doors: [...prev.doors, newDoor],
        isDirty: true
      }));
    } else if (type === 'window') {
      const newWindow: Window = {
        id: `window-${Date.now()}`,
        wallId: wall.id,
        position,
        width: 48, // inches
        height: 36, // inches
        sillHeight: 30, // inches
        type: 'double'
      };
      
      setEditorState(prev => ({
        ...prev,
        windows: [...prev.windows, newWindow],
        isDirty: true
      }));
    }
    
    // Auto-detect rooms after adding door/window
    detectRooms();
  }, []);

  const detectRooms = useCallback(() => {
    // Simple room detection - find enclosed areas
    const rooms: Room[] = [];
    
    // This is a simplified implementation
    // In a real CAD application, you'd use more sophisticated algorithms
    if (editorState.walls.length >= 4) {
      const bounds = calculateWallBounds();
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;
      const area = Math.round((width * height) / (editorState.gridSize * editorState.gridSize));
      
      rooms.push({
        id: 'main-room',
        name: 'Main Area',
        area,
        walls: editorState.walls.map(w => w.id),
        center: { x: centerX, y: centerY }
      });
    }
    
    setEditorState(prev => ({
      ...prev,
      rooms,
      isDirty: true
    }));
  }, [editorState.walls, editorState.gridSize]);

  const calculateWallBounds = useCallback(() => {
    if (editorState.walls.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    editorState.walls.forEach(wall => {
      minX = Math.min(minX, wall.start.x, wall.end.x);
      minY = Math.min(minY, wall.start.y, wall.end.y);
      maxX = Math.max(maxX, wall.start.x, wall.end.x);
      maxY = Math.max(maxY, wall.start.y, wall.end.y);
    });
    
    return { minX, minY, maxX, maxY };
  }, [editorState.walls]);

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false;
    if (!isDrawing) {
      setCurrentWall(null);
    }
  }, [isDrawing]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / editorState.zoom - editorState.panOffset.x;
    const y = (e.clientY - rect.top) / editorState.zoom - editorState.panOffset.y;
    
    const point = editorState.snapToGrid ? {
      x: Math.round(x / editorState.gridSize) * editorState.gridSize,
      y: Math.round(y / editorState.gridSize) * editorState.gridSize
    } : { x, y };

    // Handle measurement tool selections
    if (selectedTool.startsWith('measure-')) {
      const mode = selectedTool.replace('measure-', '') as MeasurementState['mode'];
      if (measurementToolRef.current) {
        if (!measurementState.isActive || measurementState.mode !== mode) {
          measurementToolRef.current.activate(mode);
          setMeasurementState(prev => ({ ...prev, isActive: true, mode }));
        }
        
        const handled = measurementToolRef.current.handleClick(point);
        if (handled) {
          setEditorState(prev => ({ ...prev, isDirty: true }));
          return;
        }
      }
    }
    
    // Handle measurement tool interactions when active
    if (measurementState.isActive && measurementToolRef.current) {
      const handled = measurementToolRef.current.handleClick(point);
      if (handled) {
        setEditorState(prev => ({ ...prev, isDirty: true }));
        return;
      }
    }

    // Handle existing tool logic
    if (selectedTool === 'wall') {
      if (!isDrawing) {
        setIsDrawing(true);
        setCurrentWall({
          id: `wall-${Date.now()}`,
          start: point,
          thickness: 6,
          type: 'exterior'
        });
      } else {
        if (currentWall?.start) {
          const newWall: Wall = {
            ...currentWall as Wall,
            end: point
          };
          
          setEditorState(prev => ({
            ...prev,
            walls: [...prev.walls, newWall],
            isDirty: true
          }));
          
          setIsDrawing(false);
          setCurrentWall(null);
          
          // Auto-detect rooms
          setTimeout(() => detectRooms(), 100);
        }
      }
    }
    // Add other tool handlers here...
  }, [selectedTool, isDrawing, currentWall, editorState, measurementState, detectRooms]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / editorState.zoom - editorState.panOffset.x;
    const y = (e.clientY - rect.top) / editorState.zoom - editorState.panOffset.y;
    
    const point = editorState.snapToGrid ? {
      x: Math.round(x / editorState.gridSize) * editorState.gridSize,
      y: Math.round(y / editorState.gridSize) * editorState.gridSize
    } : { x, y };

    setMousePos(point);

    // Handle measurement tool mouse move
    if (measurementState.isActive && measurementToolRef.current) {
      measurementToolRef.current.handleMouseMove(point);
      setEditorState(prev => ({ ...prev, isDirty: true }));
    }
  }, [editorState, measurementState]);

  const handleMouseUp = useCallback(() => {
    // Handle mouse up events if needed
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDrawing(false);
    setCurrentWall(null);
    
    if (measurementToolRef.current) {
      measurementToolRef.current.deactivate();
      setMeasurementState(prev => ({ ...prev, isActive: false }));
    }
  }, []);

  // Keyboard shortcuts for dimension and measurement tools
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'd':
            e.preventDefault();
            setEditorState(prev => ({ ...prev, showDimensions: !prev.showDimensions, isDirty: true }));
            break;
          case 'r':
            e.preventDefault();
            setEditorState(prev => ({ ...prev, showRunningDimensions: !prev.showRunningDimensions, isDirty: true }));
            break;
          case 'a':
            e.preventDefault();
            setEditorState(prev => ({ ...prev, showAreaLabels: !prev.showAreaLabels, isDirty: true }));
            break;
          case 'm':
            e.preventDefault();
            if (measurementToolRef.current) {
              if (measurementState.isActive) {
                measurementToolRef.current.deactivate();
                setMeasurementState(prev => ({ ...prev, isActive: false }));
              } else {
                measurementToolRef.current.activate('linear');
                setMeasurementState(prev => ({ ...prev, isActive: true, mode: 'linear' }));
              }
            }
            break;
        }
      }
      
      // Escape to cancel current operations
      if (e.key === 'Escape') {
        setIsDrawing(false);
        setCurrentWall(null);
        if (measurementToolRef.current) {
          measurementToolRef.current.deactivate();
          setMeasurementState(prev => ({ ...prev, isActive: false }));
        }
      }
      
      // Dimension precision shortcuts
      if (!e.ctrlKey && !e.metaKey) {
        switch (e.key) {
          case '1':
            setEditorState(prev => ({ ...prev, dimensionPrecision: 'exact', isDirty: true }));
            break;
          case '2':
            setEditorState(prev => ({ ...prev, dimensionPrecision: 'quarter', isDirty: true }));
            break;
          case '3':
            setEditorState(prev => ({ ...prev, dimensionPrecision: 'half', isDirty: true }));
            break;
          case '4':
            setEditorState(prev => ({ ...prev, dimensionPrecision: 'inch', isDirty: true }));
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [measurementState]);

  // Auto-update dimensions when walls change
  useEffect(() => {
    if (editorState.walls.length > 0) {
      // Generate dimensions for all walls
      const wallDimensions: Dimension[] = editorState.walls.map(wall => ({
        id: `wall-dim-${wall.id}`,
        start: wall.start,
        end: wall.end,
        type: 'wall' as const,
        value: calculateDistance(wall.start, wall.end),
        text: formatDimension(calculateDistance(wall.start, wall.end), editorState.gridSize, editorState.dimensionPrecision),
        offset: 25,
        angle: Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x),
        visible: true,
        style: {
          color: '#6b7280',
          lineWeight: 1,
          textSize: 11,
          textColor: '#374151',
          arrowSize: 8,
          extensionLineOffset: 5,
          dimensionLineOffset: 25
        }
      }));

      // Generate running dimensions
      const runningDimensions = editorState.showRunningDimensions ? 
        generateRunningDimensions(editorState.walls, editorState.gridSize) : [];

      // Update areas for rooms
      const roomAreas: Area[] = editorState.rooms.map(room => {
        const roomWalls = editorState.walls.filter(w => room.walls.includes(w.id));
        const roomPoints = roomWalls.flatMap(w => [w.start, w.end]);
        const area = roomPoints.length > 0 ? calculatePolygonArea(roomPoints) : room.area * editorState.gridSize * editorState.gridSize;
        
        return {
          id: `area-${room.id}`,
          roomId: room.id,
          points: roomPoints,
          value: area,
          text: formatArea(area, editorState.gridSize),
          center: room.center
        };
      });

      setEditorState(prev => ({
        ...prev,
        dimensions: [...wallDimensions, ...runningDimensions],
        areas: roomAreas,
        isDirty: true
      }));
    }
  }, [editorState.walls, editorState.rooms, editorState.dimensionPrecision, editorState.showRunningDimensions, editorState.gridSize]);

  // Tool configuration
  const tools = [
    { id: 'select', icon: MousePointer, name: 'Select' },
    { id: 'wall', icon: Minus, name: 'Wall' },
    { id: 'door', icon: DoorOpen, name: 'Door' },
    { id: 'window', icon: RectangleHorizontal, name: 'Window' },
    { id: 'room', icon: Square, name: 'Room' },
    { id: 'electrical', icon: Zap, name: 'Electrical' },
    { id: 'plumbing', icon: Droplets, name: 'Plumbing' },
    { id: 'measure-linear', icon: Ruler, name: 'Linear' },
    { id: 'measure-area', icon: Calculator, name: 'Area' },
    { id: 'measure-angle', icon: Triangle, name: 'Angle' },
    { id: 'measure-diagonal', icon: Maximize, name: 'Diagonal' }
  ];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="border-b bg-gray-50 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {tools.map((tool) => (
              <Button
                key={tool.id}
                variant={selectedTool === tool.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onToolChange(tool.id)}
                className={`${selectedTool === tool.id ? 'bg-blue-600 text-white' : ''} hover:bg-blue-50`}
              >
                <tool.icon className="w-4 h-4 mr-1" />
                {tool.name}
              </Button>
            ))}
            
            {/* Wall Settings */}
            {selectedTool === 'wall' && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center space-x-2">
                  <Label className="text-sm font-medium">Thickness:</Label>
                  <Select 
                    value={editorState.wallThickness.toString()} 
                    onValueChange={(value) => setEditorState(prev => ({ ...prev, wallThickness: parseInt(value) }))}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4"</SelectItem>
                      <SelectItem value="6">6"</SelectItem>
                      <SelectItem value="8">8"</SelectItem>
                      <SelectItem value="10">10"</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Label className="text-sm font-medium">Type:</Label>
                  <Select 
                    value={editorState.wallType} 
                    onValueChange={(value: 'exterior' | 'interior' | 'structural') => 
                      setEditorState(prev => ({ ...prev, wallType: value }))
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exterior">Exterior</SelectItem>
                      <SelectItem value="interior">Interior</SelectItem>
                      <SelectItem value="structural">Structural</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={undo}
              disabled={editorState.historyIndex <= 0}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={redo}
              disabled={editorState.historyIndex >= editorState.history.length - 1}
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </Button>
            <Button 
              variant={editorState.showGrid ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setEditorState(prev => ({ ...prev, showGrid: !prev.showGrid, isDirty: true }))}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button 
              variant={editorState.showDimensions ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setEditorState(prev => ({ ...prev, showDimensions: !prev.showDimensions, isDirty: true }))}
              title="Toggle Dimensions"
            >
              <Ruler className="w-4 h-4" />
            </Button>
            <Button 
              variant={editorState.showRunningDimensions ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setEditorState(prev => ({ ...prev, showRunningDimensions: !prev.showRunningDimensions, isDirty: true }))}
              title="Toggle Running Dimensions"
            >
              <Layers className="w-4 h-4" />
            </Button>
            <Button 
              variant={editorState.showAreaLabels ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setEditorState(prev => ({ ...prev, showAreaLabels: !prev.showAreaLabels, isDirty: true }))}
              title="Toggle Area Labels"
            >
              <Calculator className="w-4 h-4" />
            </Button>
            <Button 
              variant={measurementState.isActive ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => {
                if (measurementToolRef.current) {
                  if (measurementState.isActive) {
                    measurementToolRef.current.deactivate();
                    setMeasurementState(prev => ({ ...prev, isActive: false }));
                  } else {
                    measurementToolRef.current.activate('linear');
                    setMeasurementState(prev => ({ ...prev, isActive: true, mode: 'linear' }));
                  }
                }
              }}
              title="Toggle Measurement Tool"
            >
              <Triangle className="w-4 h-4" />
            </Button>
            <Button 
              variant={showFPS ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setShowFPS(!showFPS)}
              title="Show FPS Counter"
            >
              FPS
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 ${
            selectedTool === 'select' ? 'cursor-pointer' :
            selectedTool === 'wall' ? 'cursor-crosshair' :
            selectedTool === 'door' || selectedTool === 'window' ? 'cursor-copy' :
            'cursor-crosshair'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onContextMenu={(e) => e.preventDefault()}
        />
        
        {/* Status Bar */}
        <div className="absolute bottom-4 left-4 bg-white shadow-lg rounded-lg p-2">
          <div className="flex items-center space-x-4 text-sm">
            <span>Grid: {editorState.gridSize}"</span>
            <span>Zoom: {Math.round(editorState.zoom * 100)}%</span>
            <span>Snap: {editorState.snapToGrid ? 'ON' : 'OFF'}</span>
            <span>Mouse: {formatDimension(mousePos.x, editorState.gridSize, 'quarter')}, {formatDimension(mousePos.y, editorState.gridSize, 'quarter')}</span>
            <span className="text-blue-600">
              Precision: {
                editorState.dimensionPrecision === 'exact' ? '1/16"' :
                editorState.dimensionPrecision === 'quarter' ? '1/4"' :
                editorState.dimensionPrecision === 'half' ? '1/2"' :
                '1"'
              }
            </span>
            {editorState.wallDrawing.snapPoints.length > 0 && (
              <span className="text-green-600">
                Snap: {editorState.wallDrawing.snapPoints[0].type}
              </span>
            )}
            {editorState.wallDrawing.angleConstraints && (
              <span className="text-blue-600">Constraints: ON</span>
            )}
            {showFPS && (
              <span className="text-green-600 font-mono">
                FPS: {performanceMetrics.fps} ({performanceMetrics.frameTime.toFixed(1)}ms)
              </span>
            )}
          </div>
        </div>

        {/* Professional Measurement Display */}
        {isDrawing && currentWall?.start && (
          <div className="absolute top-4 right-4 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg">
            <div className="text-sm font-semibold">Real-time Length</div>
            <div className="text-lg font-mono">
              {formatDimension(
                calculateDistance(currentWall.start, mousePos),
                editorState.gridSize,
                editorState.dimensionPrecision
              )}
            </div>
          </div>
        )}

        {/* Measurement Tool Status */}
        {measurementState.isActive && (
          <div className="absolute top-20 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
            <div className="text-sm font-semibold">Measurement Tool: {measurementState.mode}</div>
            <div className="text-xs">
              {measurementState.points.length > 0 && `Points: ${measurementState.points.length}`}
            </div>
          </div>
        )}

        {/* Tool Instructions */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-xs">
          <h3 className="font-semibold text-sm mb-2">Tool: {selectedTool}</h3>
          <p className="text-xs text-gray-600">
            {selectedTool === 'select' && 'Click to select elements • Middle-click or Ctrl+Click to pan'}
            {selectedTool === 'wall' && 'Click to start a wall, click again to finish • Middle-click to pan'}
            {selectedTool === 'door' && 'Click on a wall to add a door'}
            {selectedTool === 'window' && 'Click on a wall to add a window'}
            {selectedTool === 'electrical' && 'Click to place electrical outlets and switches'}
            {selectedTool === 'plumbing' && 'Click to place plumbing fixtures'}
            {selectedTool === 'measure-linear' && 'Click two points to measure linear distance'}
            {selectedTool === 'measure-area' && 'Click points to define an area • Double-click to close'}
            {selectedTool === 'measure-angle' && 'Click three points to measure an angle'}
            {selectedTool === 'measure-diagonal' && 'Click two points to measure diagonal distance'}
          </p>
          <div className="mt-2 text-xs text-blue-600">
            <div>Mouse wheel to zoom • Ctrl+Z/Y for undo/redo • Ctrl+0 to reset zoom</div>
            <div className="mt-1">
              Ctrl+D: Dimensions • Ctrl+R: Running • Ctrl+A: Areas • Ctrl+M: Measure
            </div>
            <div className="mt-1">
              1-4: Precision (1/16", 1/4", 1/2", 1") • ESC: Cancel
            </div>
          </div>
          {editorState.walls.length > 0 && (
            <div className="mt-2 text-xs text-green-600">
              ✓ {editorState.walls.length} walls, {editorState.doors.length} doors, {editorState.windows.length} windows
            </div>
          )}
        </div>
      </div>
    </div>
  );
}