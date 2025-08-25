/**
 * Grid System Integration Example
 * Shows how to integrate the grid system into Professional2DEditor
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { useGridSystem } from '@/hooks/useGridSystem';
import { Point } from './gridSnapping';

interface GridIntegrationProps {
  walls: { id: string; start: Point; end: Point; thickness: number }[];
  doors: { id: string; wallId: string; position: number; width: number }[];
  windows: { id: string; wallId: string; position: number; width: number }[];
  selectedTool: string;
  zoom: number;
  panOffset: Point;
  onWallCreate: (wall: { start: Point; end: Point }) => void;
  onElementCreate: (element: any, position: Point) => void;
}

export function GridIntegratedCanvas({
  walls,
  doors,
  windows,
  selectedTool,
  zoom,
  panOffset,
  onWallCreate,
  onElementCreate
}: GridIntegrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [drawingStart, setDrawingStart] = React.useState<Point | null>(null);
  const [mousePosition, setMousePosition] = React.useState<Point>({ x: 0, y: 0 });

  // Initialize grid system
  const {
    initializeGrid,
    drawGrid,
    drawVisualGuides,
    snapPoint,
    screenToWorld,
    worldToScreen,
    toggleGrid,
    toggleSnap,
    setZoom,
    setPanOffset,
    calculateDistance,
    isShiftPressed,
    currentSnapResult,
    smartGuides,
    clearGuides,
    isGridVisible,
    isSnapEnabled,
    getGridSize
  } = useGridSystem({
    initialGridConfig: {
      size: 12, // 1 foot = 12 pixels
      showGrid: true,
      snapToGrid: true,
      showMinorGrid: true,
      showMajorGrid: true,
      dynamicScaling: true
    },
    initialSnapConfig: {
      enabled: true,
      gridSnap: true,
      pointSnap: true,
      lineSnap: true,
      angleConstraints: true,
      magneticSnap: true,
      snapDistance: 20,
      angleStep: 45
    },
    enableSmartGuides: true,
    enableMagneticSnap: true
  });

  // Initialize canvas and grid
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (canvas && container) {
      // Set canvas size
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      // Initialize grid system
      initializeGrid(canvas);
    }
  }, [initializeGrid]);

  // Update zoom and pan
  useEffect(() => {
    setZoom(zoom);
    setPanOffset(panOffset);
  }, [zoom, panOffset, setZoom, setPanOffset]);

  // Get mouse position with snapping
  const getMousePos = useCallback((e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const screenPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    // Convert to world coordinates
    const worldPoint = screenToWorld(screenPoint);

    // Apply snapping
    const snapResult = snapPoint(worldPoint, {
      existingWalls: walls,
      existingPoints: walls.flatMap(w => [w.start, w.end]),
      startPoint: drawingStart || undefined
    });

    return snapResult.point;
  }, [screenToWorld, snapPoint, walls, drawingStart]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e);
    
    if (selectedTool === 'wall') {
      if (!isDrawing) {
        setIsDrawing(true);
        setDrawingStart(pos);
      } else {
        // Complete wall
        if (drawingStart) {
          onWallCreate({ start: drawingStart, end: pos });
          setIsDrawing(false);
          setDrawingStart(null);
          clearGuides();
        }
      }
    } else if (selectedTool === 'select') {
      // Handle selection
      setIsDrawing(false);
      setDrawingStart(null);
      clearGuides();
    } else {
      // Handle other tools (door, window, etc.)
      onElementCreate({ type: selectedTool }, pos);
    }
  }, [selectedTool, isDrawing, drawingStart, getMousePos, onWallCreate, onElementCreate, clearGuides]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e);
    setMousePosition(pos);
  }, [getMousePos]);

  const handleMouseLeave = useCallback(() => {
    setIsDrawing(false);
    setDrawingStart(null);
    clearGuides();
  }, [clearGuides]);

  // Drawing functions
  const drawWalls = useCallback((ctx: CanvasRenderingContext2D) => {
    walls.forEach(wall => {
      // Convert world coordinates to screen coordinates for drawing
      const screenStart = worldToScreen(wall.start);
      const screenEnd = worldToScreen(wall.end);

      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = wall.thickness / 2;
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.moveTo(screenStart.x, screenStart.y);
      ctx.lineTo(screenEnd.x, screenEnd.y);
      ctx.stroke();
    });
  }, [walls, worldToScreen]);

  const drawCurrentWall = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!isDrawing || !drawingStart) return;

    const screenStart = worldToScreen(drawingStart);
    const screenEnd = worldToScreen(mousePosition);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(screenStart.x, screenStart.y);
    ctx.lineTo(screenEnd.x, screenEnd.y);
    ctx.stroke();

    // Draw length indicator
    const distance = calculateDistance(drawingStart, mousePosition);
    ctx.fillStyle = '#ef4444';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      distance,
      (screenStart.x + screenEnd.x) / 2,
      (screenStart.y + screenEnd.y) / 2 - 10
    );
  }, [isDrawing, drawingStart, mousePosition, worldToScreen, calculateDistance]);

  const drawSnapIndicator = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!currentSnapResult?.snapped) return;

    const screenPos = worldToScreen(currentSnapResult.point);
    
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    const size = 8;
    
    // Draw crosshair
    ctx.beginPath();
    ctx.moveTo(screenPos.x - size, screenPos.y);
    ctx.lineTo(screenPos.x + size, screenPos.y);
    ctx.moveTo(screenPos.x, screenPos.y - size);
    ctx.lineTo(screenPos.x, screenPos.y + size);
    ctx.stroke();

    // Draw circle
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
    ctx.stroke();
  }, [currentSnapResult, worldToScreen]);

  const drawSmartGuides = useCallback((ctx: CanvasRenderingContext2D) => {
    smartGuides.forEach(guide => {
      const screenStart = worldToScreen(guide.line.start);
      const screenEnd = worldToScreen(guide.line.end);

      ctx.strokeStyle = guide.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      ctx.beginPath();
      ctx.moveTo(screenStart.x, screenStart.y);
      ctx.lineTo(screenEnd.x, screenEnd.y);
      ctx.stroke();
    });
  }, [smartGuides, worldToScreen]);

  // Main drawing function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid (handles its own coordinate transformation)
    drawGrid();

    // Draw elements (these handle coordinate transformation)
    drawWalls(ctx);
    drawCurrentWall(ctx);
    drawSmartGuides(ctx);
    drawSnapIndicator(ctx);

    // Draw visual guides (handles its own coordinate transformation)
    drawVisualGuides();
  }, [drawGrid, drawVisualGuides, drawWalls, drawCurrentWall, drawSmartGuides, drawSnapIndicator]);

  // Render loop
  useEffect(() => {
    draw();
  }, [draw, walls, mousePosition, isDrawing, currentSnapResult, smartGuides]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        draw();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b bg-gray-50 p-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleGrid}
            className={`px-3 py-1 rounded ${isGridVisible() ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Grid {isGridVisible() ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={toggleSnap}
            className={`px-3 py-1 rounded ${isSnapEnabled() ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
          >
            Snap {isSnapEnabled() ? 'ON' : 'OFF'}
          </button>
          <span className="text-sm text-gray-600">
            Grid Size: {getGridSize()}" | Zoom: {Math.round(zoom * 100)}%
          </span>
          {isShiftPressed && (
            <span className="text-sm text-blue-600 font-semibold">
              ORTHOGONAL MODE
            </span>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 ${
            selectedTool === 'select' ? 'cursor-pointer' :
            selectedTool === 'wall' ? 'cursor-crosshair' :
            'cursor-copy'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
        
        {/* Status indicators */}
        {isDrawing && drawingStart && (
          <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-2 rounded shadow-lg">
            Length: {calculateDistance(drawingStart, mousePosition)}
            {isShiftPressed && <div className="text-xs">Constrained to orthogonal</div>}
          </div>
        )}

        {currentSnapResult?.snapped && (
          <div className="absolute bottom-4 right-4 bg-blue-600 text-white px-3 py-2 rounded shadow-lg text-sm">
            Snapped to {currentSnapResult.snapType}
            {currentSnapResult.constrainedAngle !== undefined && 
              ` (${Math.round(currentSnapResult.constrainedAngle)}°)`
            }
          </div>
        )}
      </div>
    </div>
  );
}

// Example usage in Professional2DEditor
export function ExampleIntegration() {
  const [walls, setWalls] = React.useState<{ id: string; start: Point; end: Point; thickness: number }[]>([]);
  const [selectedTool, setSelectedTool] = React.useState('wall');
  const [zoom, setZoom] = React.useState(1);
  const [panOffset, setPanOffset] = React.useState<Point>({ x: 0, y: 0 });

  const handleWallCreate = useCallback((wall: { start: Point; end: Point }) => {
    const newWall = {
      id: `wall-${Date.now()}`,
      ...wall,
      thickness: 6
    };
    setWalls(prev => [...prev, newWall]);
  }, []);

  const handleElementCreate = useCallback((element: any, position: Point) => {
    console.log('Create element:', element, 'at position:', position);
    // Handle door, window, electrical, plumbing placement
  }, []);

  return (
    <GridIntegratedCanvas
      walls={walls}
      doors={[]}
      windows={[]}
      selectedTool={selectedTool}
      zoom={zoom}
      panOffset={panOffset}
      onWallCreate={handleWallCreate}
      onElementCreate={handleElementCreate}
    />
  );
}