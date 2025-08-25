import { useRef, useEffect, useState, useCallback, RefObject } from 'react';
import { GridSystem } from '../utils/gridSnapping';
import type { useDesignStore } from '../stores/designStore';

interface Point {
  x: number;
  y: number;
}

interface UseEditorCanvasParams {
  store: ReturnType<typeof useDesignStore>;
}

interface UseEditorCanvasReturn {
  canvasRef: RefObject<HTMLCanvasElement>;
  containerRef: RefObject<HTMLDivElement>;
  handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
  mousePos: Point;
  isDrawing: boolean;
}

export function useEditorCanvas({ store }: UseEditorCanvasParams): UseEditorCanvasReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridSystemRef = useRef<GridSystem | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Extract store properties
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
  } = store;

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
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';

      walls.forEach(wall => {
        const isSelected = selectedElements.includes(wall.id);
        
        // Set style based on selection state
        if (isSelected) {
          ctx.strokeStyle = '#3b82f6'; // Blue for selected
          ctx.lineWidth = 6 / viewSettings.zoom; // Thicker for selected
        } else {
          ctx.strokeStyle = '#1f2937'; // Dark gray for normal
          ctx.lineWidth = 4 / viewSettings.zoom; // Normal thickness
        }

        ctx.beginPath();
        ctx.moveTo(wall.start.x, wall.start.y);
        ctx.lineTo(wall.end.x, wall.end.y);
        ctx.stroke();

        // Draw wall endpoints with selection colors
        ctx.fillStyle = isSelected ? '#3b82f6' : '#1f2937';
        const pointSize = isSelected ? 6 / viewSettings.zoom : 4 / viewSettings.zoom;
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
  }, [walls, doors, windows, electricalElements, plumbingElements, viewSettings, gridSettings, selectedTool, selectedElements, isDrawing, currentWallStart, mousePos, performanceMetrics]);

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

    // Handle selection
    if (selectedTool === 'select') {
      // Check if clicked near a wall
      const closestWall = findClosestWall(snappedPos, walls);
      if (closestWall && closestWall.distance < 20) {
        // Detect multi-select (Ctrl or Shift key)
        const multiSelect = e.ctrlKey || e.shiftKey;
        selectElement(closestWall.wall.id, multiSelect);
      } else {
        // Clicked on empty space - clear selection unless multi-selecting
        if (!e.ctrlKey && !e.shiftKey) {
          clearSelection();
        }
      }
    }
  }, [selectedTool, isDrawing, currentWallStart, gridSettings, screenToWorld, addWall, addDoor, addWindow, walls, selectElement, clearSelection]);

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

  return {
    canvasRef,
    containerRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    mousePos,
    isDrawing
  };
}