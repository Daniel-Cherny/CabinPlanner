import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

// Import our new state management and utilities
import { useDesignStore } from '../../stores/designStore';
import { GridSystem } from '../../utils/gridSnapping';

interface Point {
  x: number;
  y: number;
}

interface Professional2DEditorProps {
  projectData?: any;
  onProjectDataChange?: (data: any) => void;
}

export function Professional2DEditor({ projectData, onProjectDataChange }: Professional2DEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridSystemRef = useRef<GridSystem | null>(null);
  const animationFrameRef = useRef<number>(0);
  
  // Get state and actions from our global store
  const {
    walls,
    doors,
    windows,
    rooms,
    electricalElements,
    plumbingElements,
    selectedTool,
    selectedElements,
    viewSettings,
    gridSettings,
    editorState,
    addWall,
    addDoor,
    addWindow,
    setSelectedTool,
    selectElement,
    clearSelection,
    updateViewSettings,
    updateGridSettings,
    undo,
    redo,
    canUndo,
    canRedo
  } = useDesignStore();

  // Local state for drawing interaction
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWallStart, setCurrentWallStart] = useState<Point | null>(null);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [performanceMetrics, setPerformanceMetrics] = useState({ fps: 60, frameTime: 0 });

  // Initialize grid system
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    gridSystemRef.current = new GridSystem({
      gridSize: gridSettings.size,
      snapEnabled: gridSettings.enabled,
      snapThreshold: gridSettings.snapThreshold,
      angleConstraints: gridSettings.angleConstraints,
      showGrid: viewSettings.showLayers.grid,
      majorInterval: gridSettings.majorInterval
    });

    // Update grid settings when they change
    gridSystemRef.current.updateSettings({
      gridSize: gridSettings.size,
      snapEnabled: gridSettings.enabled,
      snapThreshold: gridSettings.snapThreshold,
      angleConstraints: gridSettings.angleConstraints,
      showGrid: viewSettings.showLayers.grid,
      majorInterval: gridSettings.majorInterval
    });
  }, [gridSettings, viewSettings.showLayers.grid]);

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback((screenX: number, screenY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (screenX - rect.left - viewSettings.panOffset.x) / viewSettings.zoom;
    const y = (screenY - rect.top - viewSettings.panOffset.y) / viewSettings.zoom;
    
    return { x, y };
  }, [viewSettings.zoom, viewSettings.panOffset]);

  // Convert world coordinates to screen coordinates
  const worldToScreen = useCallback((worldX: number, worldY: number): Point => {
    const x = worldX * viewSettings.zoom + viewSettings.panOffset.x;
    const y = worldY * viewSettings.zoom + viewSettings.panOffset.y;
    return { x, y };
  }, [viewSettings.zoom, viewSettings.panOffset]);

  // Main render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context state
    ctx.save();

    // Apply viewport transform
    ctx.translate(viewSettings.panOffset.x, viewSettings.panOffset.y);
    ctx.scale(viewSettings.zoom, viewSettings.zoom);

    // Draw grid using our grid system
    if (viewSettings.showLayers.grid && gridSystemRef.current) {
      gridSystemRef.current.drawGrid(ctx, canvas.width, canvas.height, viewSettings.zoom, viewSettings.panOffset);
    }

    // Draw walls from the store
    if (viewSettings.showLayers.walls) {
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 4 / viewSettings.zoom;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';

      walls.forEach(wall => {
        ctx.beginPath();
        ctx.moveTo(wall.start.x, wall.start.y);
        ctx.lineTo(wall.end.x, wall.end.y);
        ctx.stroke();

        // Draw wall endpoints
        ctx.fillStyle = '#1f2937';
        const pointSize = 4 / viewSettings.zoom;
        ctx.fillRect(wall.start.x - pointSize/2, wall.start.y - pointSize/2, pointSize, pointSize);
        ctx.fillRect(wall.end.x - pointSize/2, wall.end.y - pointSize/2, pointSize, pointSize);
      });
    }

    // Draw current wall being drawn
    if (isDrawing && currentWallStart && selectedTool === 'walls') {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 4 / viewSettings.zoom;
      ctx.setLineDash([5 / viewSettings.zoom, 5 / viewSettings.zoom]);
      
      ctx.beginPath();
      ctx.moveTo(currentWallStart.x, currentWallStart.y);
      ctx.lineTo(mousePos.x, mousePos.y);
      ctx.stroke();
      
      ctx.setLineDash([]);

      // Draw measurement
      const distance = Math.sqrt(
        Math.pow(mousePos.x - currentWallStart.x, 2) + 
        Math.pow(mousePos.y - currentWallStart.y, 2)
      );
      const midPoint = {
        x: (currentWallStart.x + mousePos.x) / 2,
        y: (currentWallStart.y + mousePos.y) / 2
      };
      
      ctx.fillStyle = '#3b82f6';
      ctx.font = `${12 / viewSettings.zoom}px Arial`;
      ctx.fillText(`${(distance / 12).toFixed(1)}'`, midPoint.x, midPoint.y - 5 / viewSettings.zoom);
    }

    // Draw doors
    if (viewSettings.showLayers.doors) {
      doors.forEach(door => {
        const wall = walls.find(w => w.id === door.wallId);
        if (!wall) return;

        const wallLength = Math.sqrt(
          Math.pow(wall.end.x - wall.start.x, 2) + 
          Math.pow(wall.end.y - wall.start.y, 2)
        );
        const wallAngle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
        
        const doorPos = {
          x: wall.start.x + (wall.end.x - wall.start.x) * door.position,
          y: wall.start.y + (wall.end.y - wall.start.y) * door.position
        };

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2 / viewSettings.zoom;
        ctx.beginPath();
        ctx.arc(doorPos.x, doorPos.y, door.width / 2, wallAngle - Math.PI/2, wallAngle + Math.PI/2);
        ctx.stroke();
      });
    }

    // Draw windows
    if (viewSettings.showLayers.windows) {
      windows.forEach(window => {
        const wall = walls.find(w => w.id === window.wallId);
        if (!wall) return;

        const windowPos = {
          x: wall.start.x + (wall.end.x - wall.start.x) * window.position,
          y: wall.start.y + (wall.end.y - wall.start.y) * window.position
        };

        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3 / viewSettings.zoom;
        ctx.strokeRect(
          windowPos.x - window.width / 2,
          windowPos.y - 4 / viewSettings.zoom,
          window.width,
          8 / viewSettings.zoom
        );
      });
    }

    // Draw electrical elements
    if (viewSettings.showLayers.electrical) {
      ctx.fillStyle = '#eab308';
      electricalElements.forEach(element => {
        ctx.beginPath();
        ctx.arc(element.position.x, element.position.y, 6 / viewSettings.zoom, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw plumbing elements
    if (viewSettings.showLayers.plumbing) {
      ctx.fillStyle = '#06b6d4';
      plumbingElements.forEach(element => {
        ctx.fillRect(
          element.position.x - 8 / viewSettings.zoom,
          element.position.y - 8 / viewSettings.zoom,
          16 / viewSettings.zoom,
          16 / viewSettings.zoom
        );
      });
    }

    // Draw snap indicators if snapping
    if (gridSystemRef.current && gridSettings.enabled) {
      const snapIndicators = gridSystemRef.current.getSnapIndicators(mousePos, walls);
      if (snapIndicators.length > 0) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
        snapIndicators.forEach(indicator => {
          ctx.beginPath();
          ctx.arc(indicator.x, indicator.y, 5 / viewSettings.zoom, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }

    // Restore context state
    ctx.restore();

    // Draw UI elements (not affected by transform)
    drawUI(ctx, canvas);
  }, [walls, doors, windows, electricalElements, plumbingElements, viewSettings, gridSettings, selectedTool, isDrawing, currentWallStart, mousePos]);

  // Draw UI elements
  const drawUI = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // Draw FPS counter
    if (viewSettings.showPerformance) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(canvas.width - 80, 10, 70, 25);
      ctx.fillStyle = '#00ff00';
      ctx.font = '12px monospace';
      ctx.fillText(`FPS: ${performanceMetrics.fps}`, canvas.width - 75, 27);
    }

    // Draw coordinates
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.font = '12px Arial';
    ctx.fillText(`X: ${mousePos.x.toFixed(0)}" Y: ${mousePos.y.toFixed(0)}"`, 10, canvas.height - 10);
  };

  // Animation loop
  const animate = useCallback((timestamp: number) => {
    render();
    
    // Calculate FPS
    if (!performanceMetrics.frameTime) {
      setPerformanceMetrics(prev => ({ ...prev, frameTime: timestamp }));
    } else if (timestamp - performanceMetrics.frameTime >= 1000) {
      const fps = Math.round(1000 / (timestamp - performanceMetrics.frameTime) * 60);
      setPerformanceMetrics({ fps, frameTime: timestamp });
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [render, performanceMetrics]);

  // Start animation loop
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    
    // Handle middle mouse button for panning
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Apply snapping if grid system is available
    let snappedPos = worldPos;
    if (gridSystemRef.current && gridSettings.enabled) {
      snappedPos = gridSystemRef.current.snapToGrid(worldPos);
      
      // Apply angle constraints if drawing a wall
      if (isDrawing && currentWallStart && gridSettings.angleConstraints) {
        snappedPos = gridSystemRef.current.snapToAngle(currentWallStart, snappedPos);
      }
    }

    // Handle wall drawing
    if (selectedTool === 'walls') {
      if (!isDrawing) {
        // Start drawing a new wall
        setIsDrawing(true);
        setCurrentWallStart(snappedPos);
      } else if (currentWallStart) {
        // Complete the wall and add it to the store
        const newWall = {
          id: `wall-${Date.now()}`,
          start: currentWallStart,
          end: snappedPos,
          thickness: 6,
          type: 'exterior' as const
        };
        
        // Add wall to global store
        addWall(newWall);
        
        // Reset drawing state
        setIsDrawing(false);
        setCurrentWallStart(null);
      }
    }
    
    // Handle door placement
    if (selectedTool === 'doors' && walls.length > 0) {
      // Find closest wall
      const closestWall = findClosestWall(snappedPos, walls);
      if (closestWall) {
        const position = getPositionOnWall(snappedPos, closestWall.wall);
        const newDoor = {
          id: `door-${Date.now()}`,
          wallId: closestWall.wall.id,
          position,
          width: 36,
          swing: 'left' as const,
          type: 'interior' as const
        };
        addDoor(newDoor);
      }
    }
    
    // Handle window placement
    if (selectedTool === 'windows' && walls.length > 0) {
      const closestWall = findClosestWall(snappedPos, walls);
      if (closestWall) {
        const position = getPositionOnWall(snappedPos, closestWall.wall);
        const newWindow = {
          id: `window-${Date.now()}`,
          wallId: closestWall.wall.id,
          position,
          width: 48,
          height: 36,
          sillHeight: 36,
          type: 'double' as const
        };
        addWindow(newWindow);
      }
    }
  }, [selectedTool, isDrawing, currentWallStart, gridSettings, screenToWorld, addWall, addDoor, addWindow, walls]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    
    // Handle panning
    if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      
      updateViewSettings({
        panOffset: {
          x: viewSettings.panOffset.x + deltaX,
          y: viewSettings.panOffset.y + deltaY
        }
      });
      
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Apply snapping
    let snappedPos = worldPos;
    if (gridSystemRef.current && gridSettings.enabled) {
      snappedPos = gridSystemRef.current.snapToGrid(worldPos);
      
      // Apply angle constraints if drawing
      if (isDrawing && currentWallStart && gridSettings.angleConstraints) {
        snappedPos = gridSystemRef.current.snapToAngle(currentWallStart, snappedPos);
      }
    }
    
    setMousePos(snappedPos);
  }, [isPanning, panStart, viewSettings.panOffset, isDrawing, currentWallStart, gridSettings, screenToWorld, updateViewSettings]);

  // Handle mouse up
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || isPanning) {
      setIsPanning(false);
    }
  }, [isPanning]);

  // Handle mouse wheel for zoom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(10, viewSettings.zoom * delta));
    
    // Zoom towards mouse position
    const worldPos = screenToWorld(e.clientX, e.clientY);
    const newPanOffset = {
      x: e.clientX - worldPos.x * newZoom,
      y: e.clientY - worldPos.y * newZoom
    };
    
    updateViewSettings({
      zoom: newZoom,
      panOffset: newPanOffset
    });
  }, [viewSettings.zoom, screenToWorld, updateViewSettings]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey && canUndo()) {
        undo();
      }
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        if (canRedo()) redo();
      }
      
      // Cancel current drawing
      if (e.key === 'Escape') {
        setIsDrawing(false);
        setCurrentWallStart(null);
        clearSelection();
      }
      
      // Tool shortcuts
      if (e.key === 'w') setSelectedTool('walls');
      if (e.key === 'd') setSelectedTool('doors');
      if (e.key === 'n') setSelectedTool('windows');
      if (e.key === 's') setSelectedTool('select');
      
      // Toggle grid
      if (e.key === 'g') {
        updateViewSettings({
          showLayers: {
            ...viewSettings.showLayers,
            grid: !viewSettings.showLayers.grid
          }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo, clearSelection, setSelectedTool, viewSettings.showLayers, updateViewSettings]);

  // Helper functions
  const findClosestWall = (point: Point, walls: any[]) => {
    let closestWall = null;
    let minDistance = Infinity;

    walls.forEach(wall => {
      const distance = pointToLineDistance(point, wall.start, wall.end);
      if (distance < minDistance && distance < 20) { // 20 pixel threshold
        minDistance = distance;
        closestWall = { wall, distance };
      }
    });

    return closestWall;
  };

  const pointToLineDistance = (point: Point, lineStart: Point, lineEnd: Point) => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getPositionOnWall = (point: Point, wall: any) => {
    const wallLength = Math.sqrt(
      Math.pow(wall.end.x - wall.start.x, 2) + 
      Math.pow(wall.end.y - wall.start.y, 2)
    );
    
    const projection = (
      (point.x - wall.start.x) * (wall.end.x - wall.start.x) +
      (point.y - wall.start.y) * (wall.end.y - wall.start.y)
    ) / (wallLength * wallLength);
    
    return Math.max(0.1, Math.min(0.9, projection));
  };

  // Resize canvas
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b p-2">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 border-r pr-2">
            <Button
              variant={selectedTool === 'select' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTool('select')}
              title="Select (S)"
            >
              <MousePointer className="w-4 h-4" />
              <span className="ml-1 text-xs">Select</span>
            </Button>
            <Button
              variant={selectedTool === 'walls' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTool('walls')}
              title="Wall (W)"
            >
              <Minus className="w-4 h-4" />
              <span className="ml-1 text-xs">Wall</span>
            </Button>
            <Button
              variant={selectedTool === 'doors' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTool('doors')}
              title="Door (D)"
            >
              <DoorOpen className="w-4 h-4" />
              <span className="ml-1 text-xs">Door</span>
            </Button>
            <Button
              variant={selectedTool === 'windows' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTool('windows')}
              title="Window (N)"
            >
              <RectangleHorizontal className="w-4 h-4" />
              <span className="ml-1 text-xs">Window</span>
            </Button>
            <Button
              variant={selectedTool === 'rooms' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTool('rooms')}
              title="Room"
            >
              <Home className="w-4 h-4" />
              <span className="ml-1 text-xs">Room</span>
            </Button>
            <Button
              variant={selectedTool === 'electrical' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTool('electrical')}
              title="Electrical"
            >
              <Zap className="w-4 h-4" />
              <span className="ml-1 text-xs">Electrical</span>
            </Button>
            <Button
              variant={selectedTool === 'plumbing' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTool('plumbing')}
              title="Plumbing"
            >
              <Droplets className="w-4 h-4" />
              <span className="ml-1 text-xs">Plumbing</span>
            </Button>
            <Button
              variant={selectedTool === 'measure' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTool('measure')}
              title="Measure"
            >
              <Ruler className="w-4 h-4" />
              <span className="ml-1 text-xs">Measure</span>
            </Button>
          </div>

          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => undo()}
              disabled={!canUndo()}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => redo()}
              disabled={!canRedo()}
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                updateViewSettings({ zoom: 1, panOffset: { x: 0, y: 0 } });
              }}
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant={viewSettings.showLayers.grid ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                updateViewSettings({
                  showLayers: {
                    ...viewSettings.showLayers,
                    grid: !viewSettings.showLayers.grid
                  }
                });
              }}
              title="Toggle Grid (G)"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewSettings.showLayers.dimensions ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                updateViewSettings({
                  showLayers: {
                    ...viewSettings.showLayers,
                    dimensions: !viewSettings.showLayers.dimensions
                  }
                });
              }}
              title="Toggle Dimensions"
            >
              <Ruler className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                updateViewSettings({
                  showLayers: {
                    ...viewSettings.showLayers,
                    walls: !viewSettings.showLayers.walls,
                    doors: !viewSettings.showLayers.doors,
                    windows: !viewSettings.showLayers.windows
                  }
                });
              }}
              title="Toggle Layers"
            >
              <Layers className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        />
        
        {/* Status Bar */}
        <div className="absolute bottom-4 left-4 bg-white shadow-lg rounded-lg p-2">
          <div className="flex items-center space-x-4 text-sm">
            <span>Grid: {gridSettings.size}"</span>
            <span>Zoom: {Math.round(viewSettings.zoom * 100)}%</span>
            <span>Snap: {gridSettings.enabled ? 'ON' : 'OFF'}</span>
            <span>Mouse: {mousePos.x.toFixed(0)}", {mousePos.y.toFixed(0)}"</span>
            {gridSettings.angleConstraints && <Badge variant="secondary">Angle Lock</Badge>}
          </div>
        </div>

        {/* Tool Info */}
        <div className="absolute top-4 left-4 bg-white shadow-lg rounded-lg p-3">
          <h3 className="font-semibold text-sm mb-1">Tool: {selectedTool}</h3>
          <p className="text-xs text-gray-600">
            {selectedTool === 'walls' && 'Click to start wall, click again to end'}
            {selectedTool === 'doors' && 'Click on a wall to place door'}
            {selectedTool === 'windows' && 'Click on a wall to place window'}
            {selectedTool === 'select' && 'Click to select elements'}
          </p>
          <div className="text-xs text-gray-500 mt-1">
            Elements: {walls.length} walls, {doors.length} doors, {windows.length} windows
          </div>
        </div>
      </div>
    </div>
  );
}