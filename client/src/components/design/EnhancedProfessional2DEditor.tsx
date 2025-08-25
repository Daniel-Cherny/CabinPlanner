import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
  MousePointer,
  Settings,
  Trash2,
  Edit,
  Split,
  Merge,
  Target,
  Lock,
  Unlock
} from "lucide-react";

interface Point {
  x: number;
  y: number;
}

interface Wall {
  id: string;
  start: Point;
  end: Point;
  thickness: number; // in inches (4, 6, 8, 10)
  type: 'exterior' | 'interior' | 'structural';
  angle?: number; // calculated angle in degrees
  length?: number; // calculated length in inches
  connectedWalls?: string[]; // IDs of connected walls
  intersections?: WallIntersection[];
  style?: {
    lineWeight: number;
    color: string;
    pattern?: 'solid' | 'dashed' | 'dotted';
  };
}

interface WallIntersection {
  wallId: string;
  point: Point;
  type: 'corner' | 'tee' | 'cross';
  angle: number; // angle between walls
}

interface SnapPoint {
  id: string;
  point: Point;
  type: 'wall-end' | 'wall-midpoint' | 'wall-intersection' | 'grid';
  wallId?: string;
  distance: number; // distance from mouse
}

interface WallDrawingState {
  isActive: boolean;
  currentWall: Partial<Wall> | null;
  snapPoints: SnapPoint[];
  previewWall: Partial<Wall> | null;
  constraintMode: 'none' | 'horizontal' | 'vertical' | '45degree';
  snapTolerance: number;
  showSnapPoints: boolean;
  angleConstraints: boolean;
}

interface WallEditingState {
  selectedWallId: string | null;
  editMode: 'none' | 'move' | 'resize' | 'split' | 'merge';
  dragHandle: 'start' | 'end' | 'middle' | null;
  originalWall: Wall | null;
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
  wallDrawing: WallDrawingState;
  wallEditing: WallEditingState;
  wallThickness: number;
  wallType: 'exterior' | 'interior' | 'structural';
  showIntersections: boolean;
}

interface Professional2DEditorProps {
  projectData: any;
  onProjectDataChange: (updates: any) => void;
  selectedTool: string;
  onToolChange: (tool: string) => void;
}

export function EnhancedProfessional2DEditor({ 
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
    panOffset: { x: 0, y: 0 },
    wallDrawing: {
      isActive: false,
      currentWall: null,
      snapPoints: [],
      previewWall: null,
      constraintMode: 'none',
      snapTolerance: 15,
      showSnapPoints: true,
      angleConstraints: true
    },
    wallEditing: {
      selectedWallId: null,
      editMode: 'none',
      dragHandle: null,
      originalWall: null
    },
    wallThickness: 6, // default 6 inches
    wallType: 'exterior',
    showIntersections: true
  });

  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [showWallPropertiesPanel, setShowWallPropertiesPanel] = useState(false);

  // Wall thickness options
  const wallThicknessOptions = [
    { value: 4, label: '2x4 (3.5")' },
    { value: 6, label: '2x6 (5.5")' },
    { value: 8, label: '2x8 (7.25")' },
    { value: 10, label: '2x10 (9.25")' }
  ];

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
  }, [editorState, mousePos, hoveredElement]);

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

    // Draw snap points
    if (editorState.wallDrawing.showSnapPoints && editorState.wallDrawing.snapPoints.length > 0) {
      drawSnapPoints(ctx);
    }

    // Draw walls with intersections
    editorState.walls.forEach(wall => drawWall(ctx, wall));
    
    // Draw wall intersections
    if (editorState.showIntersections) {
      editorState.walls.forEach(wall => drawWallIntersections(ctx, wall));
    }
    
    // Draw current wall being drawn
    if (editorState.wallDrawing.currentWall && editorState.wallDrawing.currentWall.start) {
      drawCurrentWall(ctx);
    }

    // Draw preview wall
    if (editorState.wallDrawing.previewWall) {
      drawPreviewWall(ctx);
    }

    // Draw doors and windows
    editorState.doors.forEach(door => drawDoor(ctx, door));
    editorState.windows.forEach(window => drawWindow(ctx, window));

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

    // Draw wall editing handles
    if (editorState.wallEditing.selectedWallId) {
      drawWallEditingHandles(ctx, editorState.wallEditing.selectedWallId);
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
    const currentWall = editorState.wallDrawing.currentWall;
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

  const drawPreviewWall = (ctx: CanvasRenderingContext2D) => {
    const previewWall = editorState.wallDrawing.previewWall;
    if (!previewWall?.start || !previewWall?.end) return;

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(previewWall.start.x, previewWall.start.y);
    ctx.lineTo(previewWall.end.x, previewWall.end.y);
    ctx.stroke();
  };

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

  const drawWallEditingHandles = (ctx: CanvasRenderingContext2D, wallId: string) => {
    const wall = editorState.walls.find(w => w.id === wallId);
    if (!wall) return;

    const handleSize = 6;
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    // Start handle
    ctx.beginPath();
    ctx.rect(wall.start.x - handleSize/2, wall.start.y - handleSize/2, handleSize, handleSize);
    ctx.fill();
    ctx.stroke();

    // End handle
    ctx.beginPath();
    ctx.rect(wall.end.x - handleSize/2, wall.end.y - handleSize/2, handleSize, handleSize);
    ctx.fill();
    ctx.stroke();

    // Middle handle
    const midX = (wall.start.x + wall.end.x) / 2;
    const midY = (wall.start.y + wall.end.y) / 2;
    ctx.beginPath();
    ctx.arc(midX, midY, handleSize/2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  };

  // Utility functions for wall drawing and editing
  const getConstrainedPoint = (start: Point, end: Point): Point => {
    if (!editorState.wallDrawing.angleConstraints) return end;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const length = Math.sqrt(dx * dx + dy * dy);

    // Snap to 45-degree increments
    const constraintAngle = Math.round(angle / 45) * 45;
    const constraintRadians = constraintAngle * Math.PI / 180;

    return {
      x: start.x + Math.cos(constraintRadians) * length,
      y: start.y + Math.sin(constraintRadians) * length
    };
  };

  const findSnapPoints = (mousePos: Point): SnapPoint[] => {
    const snapPoints: SnapPoint[] = [];
    const tolerance = editorState.wallDrawing.snapTolerance;

    // Wall endpoints
    editorState.walls.forEach(wall => {
      const startDistance = Math.sqrt(
        Math.pow(mousePos.x - wall.start.x, 2) + Math.pow(mousePos.y - wall.start.y, 2)
      );
      const endDistance = Math.sqrt(
        Math.pow(mousePos.x - wall.end.x, 2) + Math.pow(mousePos.y - wall.end.y, 2)
      );

      if (startDistance <= tolerance) {
        snapPoints.push({
          id: `${wall.id}-start`,
          point: wall.start,
          type: 'wall-end',
          wallId: wall.id,
          distance: startDistance
        });
      }

      if (endDistance <= tolerance) {
        snapPoints.push({
          id: `${wall.id}-end`,
          point: wall.end,
          type: 'wall-end',
          wallId: wall.id,
          distance: endDistance
        });
      }

      // Wall midpoints
      const midX = (wall.start.x + wall.end.x) / 2;
      const midY = (wall.start.y + wall.end.y) / 2;
      const midDistance = Math.sqrt(
        Math.pow(mousePos.x - midX, 2) + Math.pow(mousePos.y - midY, 2)
      );

      if (midDistance <= tolerance) {
        snapPoints.push({
          id: `${wall.id}-mid`,
          point: { x: midX, y: midY },
          type: 'wall-midpoint',
          wallId: wall.id,
          distance: midDistance
        });
      }
    });

    // Grid snapping
    if (editorState.snapToGrid) {
      const gridX = Math.round(mousePos.x / editorState.gridSize) * editorState.gridSize;
      const gridY = Math.round(mousePos.y / editorState.gridSize) * editorState.gridSize;
      const gridDistance = Math.sqrt(
        Math.pow(mousePos.x - gridX, 2) + Math.pow(mousePos.y - gridY, 2)
      );

      if (gridDistance <= tolerance) {
        snapPoints.push({
          id: `grid-${gridX}-${gridY}`,
          point: { x: gridX, y: gridY },
          type: 'grid',
          distance: gridDistance
        });
      }
    }

    // Sort by distance and return closest
    return snapPoints.sort((a, b) => a.distance - b.distance);
  };

  const detectWallIntersections = (walls: Wall[]): Wall[] => {
    const updatedWalls = walls.map(wall => ({ ...wall, intersections: [] }));

    for (let i = 0; i < updatedWalls.length; i++) {
      for (let j = i + 1; j < updatedWalls.length; j++) {
        const wall1 = updatedWalls[i];
        const wall2 = updatedWalls[j];
        
        const intersection = findLineIntersection(wall1, wall2);
        if (intersection) {
          const intersectionData: WallIntersection = {
            wallId: wall2.id,
            point: intersection,
            type: determineIntersectionType(wall1, wall2, intersection),
            angle: calculateIntersectionAngle(wall1, wall2)
          };

          wall1.intersections?.push(intersectionData);
          wall2.intersections?.push({
            ...intersectionData,
            wallId: wall1.id
          });
        }
      }
    }

    return updatedWalls;
  };

  const findLineIntersection = (wall1: Wall, wall2: Wall): Point | null => {
    const x1 = wall1.start.x, y1 = wall1.start.y;
    const x2 = wall1.end.x, y2 = wall1.end.y;
    const x3 = wall2.start.x, y3 = wall2.start.y;
    const x4 = wall2.end.x, y4 = wall2.end.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null; // Lines are parallel

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1)
      };
    }

    return null;
  };

  const determineIntersectionType = (wall1: Wall, wall2: Wall, intersection: Point): 'corner' | 'tee' | 'cross' => {
    // Check if intersection is at endpoints (corner) or in middle (tee/cross)
    const tolerance = 5;
    
    const isWall1End = Math.min(
      Math.sqrt(Math.pow(intersection.x - wall1.start.x, 2) + Math.pow(intersection.y - wall1.start.y, 2)),
      Math.sqrt(Math.pow(intersection.x - wall1.end.x, 2) + Math.pow(intersection.y - wall1.end.y, 2))
    ) < tolerance;

    const isWall2End = Math.min(
      Math.sqrt(Math.pow(intersection.x - wall2.start.x, 2) + Math.pow(intersection.y - wall2.start.y, 2)),
      Math.sqrt(Math.pow(intersection.x - wall2.end.x, 2) + Math.pow(intersection.y - wall2.end.y, 2))
    ) < tolerance;

    if (isWall1End && isWall2End) return 'corner';
    if (isWall1End || isWall2End) return 'tee';
    return 'cross';
  };

  const calculateIntersectionAngle = (wall1: Wall, wall2: Wall): number => {
    const angle1 = Math.atan2(wall1.end.y - wall1.start.y, wall1.end.x - wall1.start.x);
    const angle2 = Math.atan2(wall2.end.y - wall2.start.y, wall2.end.x - wall2.start.x);
    return Math.abs(angle1 - angle2) * 180 / Math.PI;
  };

  const smartWallJoining = (newWall: Wall, existingWalls: Wall[]): Wall[] => {
    const joinTolerance = 10; // pixels
    let updatedWalls = [...existingWalls];
    let finalWall = { ...newWall };

    // Check for walls to join at start point
    const startJoinWall = findNearbyWallEnd(finalWall.start, updatedWalls, joinTolerance);
    if (startJoinWall) {
      finalWall.start = startJoinWall.point;
      
      // Update connected walls
      finalWall.connectedWalls = finalWall.connectedWalls || [];
      finalWall.connectedWalls.push(startJoinWall.wallId);
      
      const connectedWall = updatedWalls.find(w => w.id === startJoinWall.wallId);
      if (connectedWall) {
        connectedWall.connectedWalls = connectedWall.connectedWalls || [];
        connectedWall.connectedWalls.push(finalWall.id);
      }
    }

    // Check for walls to join at end point
    const endJoinWall = findNearbyWallEnd(finalWall.end, updatedWalls, joinTolerance);
    if (endJoinWall) {
      finalWall.end = endJoinWall.point;
      
      // Update connected walls
      finalWall.connectedWalls = finalWall.connectedWalls || [];
      finalWall.connectedWalls.push(endJoinWall.wallId);
      
      const connectedWall = updatedWalls.find(w => w.id === endJoinWall.wallId);
      if (connectedWall) {
        connectedWall.connectedWalls = connectedWall.connectedWalls || [];
        connectedWall.connectedWalls.push(finalWall.id);
      }
    }

    // Add the new wall
    updatedWalls.push(finalWall);

    // Detect and update all intersections
    updatedWalls = detectWallIntersections(updatedWalls);

    return updatedWalls;
  };

  const findNearbyWallEnd = (point: Point, walls: Wall[], tolerance: number) => {
    for (const wall of walls) {
      const startDistance = Math.sqrt(
        Math.pow(point.x - wall.start.x, 2) + Math.pow(point.y - wall.start.y, 2)
      );
      const endDistance = Math.sqrt(
        Math.pow(point.x - wall.end.x, 2) + Math.pow(point.y - wall.end.y, 2)
      );

      if (startDistance <= tolerance) {
        return { point: wall.start, wallId: wall.id, isStart: true };
      }
      if (endDistance <= tolerance) {
        return { point: wall.end, wallId: wall.id, isStart: false };
      }
    }
    return null;
  };

  // Enhanced drawing functions (keeping existing ones for doors, windows, rooms, etc.)
  const drawWallDimensions = (ctx: CanvasRenderingContext2D, wall: Wall) => {
    const length = Math.sqrt(
      Math.pow(wall.end.x - wall.start.x, 2) + 
      Math.pow(wall.end.y - wall.start.y, 2)
    );
    const lengthFeet = Math.round((length / editorState.gridSize) * 12) / 12;
    
    // Dimension line
    const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
    const perpAngle = angle + Math.PI / 2;
    const offset = 25;

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

    // Dimension text with background
    const textX = (wall.start.x + wall.end.x) / 2 + Math.cos(perpAngle) * offset;
    const textY = (wall.start.y + wall.end.y) / 2 + Math.sin(perpAngle) * offset;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(textX - 15, textY - 8, 30, 16);
    
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${lengthFeet}'`, textX, textY + 3);
  };

  const drawDoor = (ctx: CanvasRenderingContext2D, door: Door) => {
    const wall = editorState.walls.find(w => w.id === door.wallId);
    if (!wall) return;

    const doorPosition = {
      x: wall.start.x + (wall.end.x - wall.start.x) * door.position,
      y: wall.start.y + (wall.end.y - wall.start.y) * door.position
    };

    // Door opening (white gap in wall)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = (door.width / 12) * editorState.gridSize;
    ctx.setLineDash([]);

    const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
    const doorHalfWidth = (door.width / 24) * editorState.gridSize;
    
    const doorStart = {
      x: doorPosition.x - Math.cos(angle) * doorHalfWidth,
      y: doorPosition.y - Math.sin(angle) * doorHalfWidth
    };
    const doorEnd = {
      x: doorPosition.x + Math.cos(angle) * doorHalfWidth,
      y: doorPosition.y + Math.sin(angle) * doorHalfWidth
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

      const swingRadius = (door.width / 12) * editorState.gridSize;
      const swingCenter = door.swing.includes('left') ? doorStart : doorEnd;
      
      ctx.beginPath();
      ctx.arc(
        swingCenter.x,
        swingCenter.y,
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

    // Window opening (blue line)
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 4;
    ctx.setLineDash([]);

    const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
    const windowHalfWidth = (window.width / 24) * editorState.gridSize;
    
    const windowStart = {
      x: windowPosition.x - Math.cos(angle) * windowHalfWidth,
      y: windowPosition.y - Math.sin(angle) * windowHalfWidth
    };
    const windowEnd = {
      x: windowPosition.x + Math.cos(angle) * windowHalfWidth,
      y: windowPosition.y + Math.sin(angle) * windowHalfWidth
    };

    ctx.beginPath();
    ctx.moveTo(windowStart.x, windowStart.y);
    ctx.lineTo(windowEnd.x, windowEnd.y);
    ctx.stroke();

    // Window sill lines
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1;
    
    const perpAngle = angle + Math.PI / 2;
    const sillOffset = 6;

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
    const wall = editorState.walls.find(w => w.id === elementId);
    if (wall) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 4]);
      
      ctx.beginPath();
      ctx.moveTo(wall.start.x, wall.start.y);
      ctx.lineTo(wall.end.x, wall.end.y);
      ctx.stroke();
    }
  };

  const drawHover = (ctx: CanvasRenderingContext2D, elementId: string) => {
    const wall = editorState.walls.find(w => w.id === elementId);
    if (wall) {
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 2]);
      
      ctx.beginPath();
      ctx.moveTo(wall.start.x, wall.start.y);
      ctx.lineTo(wall.end.x, wall.end.y);
      ctx.stroke();
    }
  };

  // Mouse event handlers
  const getMousePos = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / editorState.zoom - editorState.panOffset.x;
    const y = (e.clientY - rect.top) / editorState.zoom - editorState.panOffset.y;

    // Find snap points
    const snapPoints = findSnapPoints({ x, y });
    
    // Return snapped position if available
    if (snapPoints.length > 0) {
      return snapPoints[0].point;
    }

    // Grid snapping
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
      handleWallDrawing(pos);
    } else if (selectedTool === 'select') {
      handleSelection(pos);
    } else if (selectedTool === 'door' || selectedTool === 'window') {
      handleDoorWindowPlacement(pos, selectedTool);
    }
  };

  const handleWallDrawing = (pos: Point) => {
    if (!editorState.wallDrawing.isActive) {
      // Start drawing new wall
      const newWall: Partial<Wall> = {
        id: `wall-${Date.now()}`,
        start: pos,
        thickness: editorState.wallThickness,
        type: editorState.wallType
      };

      setEditorState(prev => ({
        ...prev,
        wallDrawing: {
          ...prev.wallDrawing,
          isActive: true,
          currentWall: newWall
        }
      }));
    } else {
      // Complete the wall
      if (editorState.wallDrawing.currentWall?.start) {
        const constrainedEnd = getConstrainedPoint(editorState.wallDrawing.currentWall.start, pos);
        
        const completedWall: Wall = {
          ...editorState.wallDrawing.currentWall as Wall,
          end: constrainedEnd,
          length: Math.sqrt(
            Math.pow(constrainedEnd.x - editorState.wallDrawing.currentWall.start.x, 2) + 
            Math.pow(constrainedEnd.y - editorState.wallDrawing.currentWall.start.y, 2)
          ),
          angle: Math.atan2(
            constrainedEnd.y - editorState.wallDrawing.currentWall.start.y,
            constrainedEnd.x - editorState.wallDrawing.currentWall.start.x
          ) * 180 / Math.PI
        };

        // Apply smart wall joining
        const updatedWalls = smartWallJoining(completedWall, editorState.walls);

        setEditorState(prev => ({
          ...prev,
          walls: updatedWalls,
          wallDrawing: {
            ...prev.wallDrawing,
            isActive: false,
            currentWall: null
          }
        }));

        // Auto-detect rooms
        detectRooms();
      }
    }
  };

  const handleSelection = (pos: Point) => {
    // Find clicked element
    const clickedWall = editorState.walls.find(wall => {
      const distance = distanceToWall(pos, wall);
      return distance < 10; // 10 pixel tolerance
    });

    if (clickedWall) {
      setEditorState(prev => ({
        ...prev,
        selectedElement: clickedWall.id,
        wallEditing: {
          ...prev.wallEditing,
          selectedWallId: clickedWall.id,
          editMode: 'none'
        }
      }));
      setShowWallPropertiesPanel(true);
    } else {
      setEditorState(prev => ({
        ...prev,
        selectedElement: null,
        wallEditing: {
          ...prev.wallEditing,
          selectedWallId: null,
          editMode: 'none'
        }
      }));
      setShowWallPropertiesPanel(false);
    }
  };

  const handleDoorWindowPlacement = (pos: Point, type: 'door' | 'window') => {
    const closestWall = findClosestWall(pos);
    if (closestWall) {
      addDoorOrWindow(closestWall, pos, type);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    setMousePos(pos);

    // Update snap points
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
  };

  const handleMouseLeave = () => {
    setEditorState(prev => ({
      ...prev,
      wallDrawing: {
        ...prev.wallDrawing,
        isActive: false,
        currentWall: null
      }
    }));
  };

  // Utility functions
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

  const findClosestWall = (point: Point): Wall | null => {
    let closestWall: Wall | null = null;
    let minDistance = 20;
    
    editorState.walls.forEach(wall => {
      const distance = distanceToWall(point, wall);
      if (distance < minDistance) {
        minDistance = distance;
        closestWall = wall;
      }
    });
    
    return closestWall;
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
    const rooms: Room[] = [];
    
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

  // Tool configuration
  const tools = [
    { id: 'select', icon: MousePointer, name: 'Select' },
    { id: 'wall', icon: Minus, name: 'Wall' },
    { id: 'door', icon: DoorOpen, name: 'Door' },
    { id: 'window', icon: RectangleHorizontal, name: 'Window' },
    { id: 'room', icon: Square, name: 'Room' },
    { id: 'measure', icon: Ruler, name: 'Measure' }
  ];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Enhanced Toolbar */}
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
            
            <Separator orientation="vertical" className="h-6" />
            
            {/* Wall Settings */}
            <div className="flex items-center space-x-2">
              <Label className="text-sm font-medium">Thickness:</Label>
              <Select 
                value={editorState.wallThickness.toString()} 
                onValueChange={(value) => setEditorState(prev => ({ ...prev, wallThickness: parseInt(value) }))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {wallThicknessOptions.map(option => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
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
            <Button 
              variant={editorState.wallDrawing.angleConstraints ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setEditorState(prev => ({
                ...prev,
                wallDrawing: { ...prev.wallDrawing, angleConstraints: !prev.wallDrawing.angleConstraints }
              }))}
            >
              {editorState.wallDrawing.angleConstraints ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </Button>
            <Button 
              variant={editorState.wallDrawing.showSnapPoints ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setEditorState(prev => ({
                ...prev,
                wallDrawing: { ...prev.wallDrawing, showSnapPoints: !prev.wallDrawing.showSnapPoints }
              }))}
            >
              <Target className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
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
              {editorState.wallDrawing.snapPoints.length > 0 && (
                <span className="text-green-600">
                  Snap: {editorState.wallDrawing.snapPoints[0].type}
                </span>
              )}
            </div>
          </div>

          {/* Measurement Display */}
          {editorState.wallDrawing.isActive && editorState.wallDrawing.currentWall?.start && (
            <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-2 rounded-lg shadow-lg">
              <div className="text-sm">
                Length: {Math.round(Math.sqrt(
                  Math.pow(mousePos.x - editorState.wallDrawing.currentWall.start.x, 2) + 
                  Math.pow(mousePos.y - editorState.wallDrawing.currentWall.start.y, 2)
                ) / editorState.gridSize * 12) / 12}'
              </div>
              <div className="text-xs opacity-90">
                Angle: {Math.round(Math.atan2(
                  mousePos.y - editorState.wallDrawing.currentWall.start.y,
                  mousePos.x - editorState.wallDrawing.currentWall.start.x
                ) * 180 / Math.PI)}°
              </div>
            </div>
          )}

          {/* Tool Instructions */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-xs">
            <h3 className="font-semibold text-sm mb-2">Tool: {selectedTool}</h3>
            <p className="text-xs text-gray-600">
              {selectedTool === 'select' && 'Click to select elements. Click wall endpoints to edit.'}
              {selectedTool === 'wall' && 'Click to start wall, click again to finish. Walls auto-join at corners.'}
              {selectedTool === 'door' && 'Click on a wall to add a door'}
              {selectedTool === 'window' && 'Click on a wall to add a window'}
              {selectedTool === 'measure' && 'Click and drag to measure distances'}
            </p>
            {editorState.walls.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="text-xs text-green-600">
                  ✓ {editorState.walls.length} walls, {editorState.doors.length} doors, {editorState.windows.length} windows
                </div>
                {editorState.wallDrawing.angleConstraints && (
                  <div className="text-xs text-blue-600">
                    🔒 Angle constraints active (45° increments)
                  </div>
                )}
                {editorState.wallDrawing.showSnapPoints && (
                  <div className="text-xs text-purple-600">
                    🎯 Smart snapping enabled
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Wall Properties Panel */}
        {showWallPropertiesPanel && editorState.wallEditing.selectedWallId && (
          <Card className="w-64 m-4">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Wall Properties</h3>
              
              {(() => {
                const selectedWall = editorState.walls.find(w => w.id === editorState.wallEditing.selectedWallId);
                if (!selectedWall) return null;
                
                return (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm">Thickness</Label>
                      <Select 
                        value={selectedWall.thickness.toString()}
                        onValueChange={(value) => {
                          const thickness = parseInt(value);
                          setEditorState(prev => ({
                            ...prev,
                            walls: prev.walls.map(w => 
                              w.id === selectedWall.id ? { ...w, thickness } : w
                            )
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {wallThicknessOptions.map(option => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-sm">Type</Label>
                      <Select 
                        value={selectedWall.type}
                        onValueChange={(value: 'exterior' | 'interior' | 'structural') => {
                          setEditorState(prev => ({
                            ...prev,
                            walls: prev.walls.map(w => 
                              w.id === selectedWall.id ? { ...w, type: value } : w
                            )
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exterior">Exterior</SelectItem>
                          <SelectItem value="interior">Interior</SelectItem>
                          <SelectItem value="structural">Structural</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Separator />
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Length: {selectedWall.length ? Math.round(selectedWall.length / editorState.gridSize * 12) / 12 : 0}'</div>
                      <div>Angle: {selectedWall.angle ? Math.round(selectedWall.angle) : 0}°</div>
                      <div>Connected: {selectedWall.connectedWalls?.length || 0} walls</div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          // Split wall functionality
                        }}
                      >
                        <Split className="w-3 h-3 mr-1" />
                        Split
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          // Delete wall functionality
                          setEditorState(prev => ({
                            ...prev,
                            walls: prev.walls.filter(w => w.id !== selectedWall.id),
                            selectedElement: null,
                            wallEditing: {
                              ...prev.wallEditing,
                              selectedWallId: null
                            }
                          }));
                          setShowWallPropertiesPanel(false);
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}