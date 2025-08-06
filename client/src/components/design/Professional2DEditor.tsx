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
  
  const [editorState, setEditorState] = useState<EditorState>({
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
    panOffset: { x: 0, y: 0 }
  });

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWall, setCurrentWall] = useState<Partial<Wall> | null>(null);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);

  // Canvas setup and rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    drawEditor(ctx);
  }, [editorState, mousePos, hoveredElement, currentWall]);

  const drawEditor = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Save context
    ctx.save();
    
    // Apply zoom and pan
    ctx.scale(editorState.zoom, editorState.zoom);
    ctx.translate(editorState.panOffset.x, editorState.panOffset.y);

    // Draw grid
    if (editorState.showGrid) {
      drawGrid(ctx);
    }

    // Draw walls
    editorState.walls.forEach(wall => drawWall(ctx, wall));
    
    // Draw current wall being drawn
    if (currentWall && currentWall.start) {
      drawCurrentWall(ctx);
    }

    // Draw doors and windows
    editorState.doors.forEach(door => drawDoor(ctx, door));
    editorState.windows.forEach(window => drawWindow(ctx, window));

    // Draw electrical elements
    (editorState as any).electricalElements?.forEach((element: any) => drawElectricalElement(ctx, element));
    
    // Draw plumbing elements
    (editorState as any).plumbingElements?.forEach((element: any) => drawPlumbingElement(ctx, element));

    // Draw rooms and labels
    editorState.rooms.forEach(room => drawRoom(ctx, room));

    // Draw dimensions
    if (editorState.showDimensions) {
      editorState.walls.forEach(wall => drawWallDimensions(ctx, wall));
    }

    // Draw selection highlights
    if (editorState.selectedElement) {
      drawSelection(ctx, editorState.selectedElement);
    }

    // Draw hover effects
    if (hoveredElement) {
      drawHover(ctx, hoveredElement);
    }

    ctx.restore();
  };

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas;
    const gridSize = editorState.gridSize;
    
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([]);

    // Major grid lines (every foot)
    for (let x = 0; x <= width / editorState.zoom; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height / editorState.zoom);
      ctx.stroke();
    }

    for (let y = 0; y <= height / editorState.zoom; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width / editorState.zoom, y);
      ctx.stroke();
    }

    // Minor grid lines (every 6 inches)
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 0.25;
    
    for (let x = 0; x <= width / editorState.zoom; x += gridSize / 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height / editorState.zoom);
      ctx.stroke();
    }

    for (let y = 0; y <= height / editorState.zoom; y += gridSize / 2) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width / editorState.zoom, y);
      ctx.stroke();
    }
  };

  const drawWall = (ctx: CanvasRenderingContext2D, wall: Wall) => {
    const isSelected = editorState.selectedElement === wall.id;
    const isHovered = hoveredElement === wall.id;
    
    // Wall line
    ctx.strokeStyle = wall.type === 'exterior' ? '#1f2937' : '#6b7280';
    ctx.lineWidth = wall.thickness / 2;
    ctx.setLineDash([]);

    if (isSelected) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = wall.thickness / 2 + 2;
    } else if (isHovered) {
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = wall.thickness / 2 + 1;
    }

    ctx.beginPath();
    ctx.moveTo(wall.start.x, wall.start.y);
    ctx.lineTo(wall.end.x, wall.end.y);
    ctx.stroke();

    // Wall thickness representation
    if (wall.thickness > 2) {
      const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
      const perpAngle = angle + Math.PI / 2;
      const offset = wall.thickness / 4;

      ctx.strokeStyle = wall.type === 'exterior' ? '#374151' : '#9ca3af';
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
    }
  };

  const drawCurrentWall = (ctx: CanvasRenderingContext2D) => {
    if (!currentWall?.start) return;

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 6;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(currentWall.start.x, currentWall.start.y);
    ctx.lineTo(mousePos.x, mousePos.y);
    ctx.stroke();

    // Show length as you draw
    const length = Math.sqrt(
      Math.pow(mousePos.x - currentWall.start.x, 2) + 
      Math.pow(mousePos.y - currentWall.start.y, 2)
    );
    const lengthFeet = Math.round((length / editorState.gridSize) * 12) / 12;
    
    ctx.fillStyle = '#ef4444';
    ctx.font = '12px sans-serif';
    ctx.fillText(
      `${lengthFeet}'`,
      (currentWall.start.x + mousePos.x) / 2,
      (currentWall.start.y + mousePos.y) / 2 - 10
    );
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

  // Mouse event handlers
  const getMousePos = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / editorState.zoom - editorState.panOffset.x;
    const y = (e.clientY - rect.top) / editorState.zoom - editorState.panOffset.y;

    if (editorState.snapToGrid) {
      return {
        x: Math.round(x / editorState.gridSize) * editorState.gridSize,
        y: Math.round(y / editorState.gridSize) * editorState.gridSize
      };
    }

    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    
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
          
          setEditorState(prev => ({
            ...prev,
            walls: [...prev.walls, newWall]
          }));
          
          setIsDrawing(false);
          setCurrentWall(null);
        }
      }
    } else if (selectedTool === 'door' || selectedTool === 'window') {
      // Find the closest wall to the click position
      const closestWall = findClosestWall(pos);
      if (closestWall) {
        addDoorOrWindow(closestWall, pos, selectedTool);
      }
    } else if (selectedTool === 'electrical') {
      addElectricalElement(pos);
    } else if (selectedTool === 'plumbing') {
      addPlumbingElement(pos);
    }
  };

  const addElectricalElement = (pos: Point) => {
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
      electricalElements: [...(prev.electricalElements || []), newElement]
    }));
  };

  const addPlumbingElement = (pos: Point) => {
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
      plumbingElements: [...(prev.plumbingElements || []), newFixture]
    }));
  };

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

  const addDoorOrWindow = (wall: Wall, clickPos: Point, type: 'door' | 'window') => {
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
        doors: [...prev.doors, newDoor]
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
        windows: [...prev.windows, newWindow]
      }));
    }
    
    // Auto-detect rooms after adding door/window
    detectRooms();
  };

  const detectRooms = () => {
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
      rooms
    }));
  };

  const calculateWallBounds = () => {
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
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    setMousePos(pos);
  };

  const handleMouseLeave = () => {
    setIsDrawing(false);
    setCurrentWall(null);
  };

  // Tool configuration
  const tools = [
    { id: 'select', icon: MousePointer, name: 'Select' },
    { id: 'wall', icon: Minus, name: 'Wall' },
    { id: 'door', icon: DoorOpen, name: 'Door' },
    { id: 'window', icon: RectangleHorizontal, name: 'Window' },
    { id: 'room', icon: Square, name: 'Room' },
    { id: 'electrical', icon: Zap, name: 'Electrical' },
    { id: 'plumbing', icon: Droplets, name: 'Plumbing' },
    { id: 'measure', icon: Ruler, name: 'Measure' }
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
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Undo className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Redo className="w-4 h-4" />
            </Button>
            <Button 
              variant={editorState.showGrid ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setEditorState(prev => ({ ...prev, showGrid: !prev.showGrid }))}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button 
              variant={editorState.showDimensions ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setEditorState(prev => ({ ...prev, showDimensions: !prev.showDimensions }))}
            >
              <Ruler className="w-4 h-4" />
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
          onMouseLeave={handleMouseLeave}
        />
        
        {/* Status Bar */}
        <div className="absolute bottom-4 left-4 bg-white shadow-lg rounded-lg p-2">
          <div className="flex items-center space-x-4 text-sm">
            <span>Grid: {editorState.gridSize}"</span>
            <span>Zoom: {Math.round(editorState.zoom * 100)}%</span>
            <span>Snap: {editorState.snapToGrid ? 'ON' : 'OFF'}</span>
            <span>Mouse: {Math.round(mousePos.x / editorState.gridSize * 12)}", {Math.round(mousePos.y / editorState.gridSize * 12)}"</span>
          </div>
        </div>

        {/* Measurement Display */}
        {isDrawing && currentWall?.start && (
          <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-2 rounded-lg shadow-lg">
            Length: {Math.round(Math.sqrt(
              Math.pow(mousePos.x - currentWall.start.x, 2) + 
              Math.pow(mousePos.y - currentWall.start.y, 2)
            ) / editorState.gridSize * 12) / 12}'
          </div>
        )}

        {/* Tool Instructions */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-xs">
          <h3 className="font-semibold text-sm mb-2">Tool: {selectedTool}</h3>
          <p className="text-xs text-gray-600">
            {selectedTool === 'select' && 'Click to select elements'}
            {selectedTool === 'wall' && 'Click to start a wall, click again to finish'}
            {selectedTool === 'door' && 'Click on a wall to add a door'}
            {selectedTool === 'window' && 'Click on a wall to add a window'}
            {selectedTool === 'electrical' && 'Click to place electrical outlets and switches'}
            {selectedTool === 'plumbing' && 'Click to place plumbing fixtures'}
            {selectedTool === 'measure' && 'Click and drag to measure distances'}
          </p>
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