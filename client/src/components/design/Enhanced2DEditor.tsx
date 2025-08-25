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
  MousePointer,
  Copy,
  Trash2,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { useDesignStore } from '../../stores/designStore';
import { useSyncSystem, useSelectionSync } from '../../hooks/useSyncSystem';
import type { Point, Wall, Door, Window, ElectricalElement, PlumbingElement } from '../../stores/designStore';

interface Enhanced2DEditorProps {
  onElementClick?: (elementId: string, elementType: string) => void;
}

export function Enhanced2DEditor({ onElementClick }: Enhanced2DEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Store subscriptions
  const {
    walls,
    doors,
    windows,
    rooms,
    electricalElements,
    plumbingElements,
    selectedTool,
    selectedElements,
    hoveredElement,
    viewSettings,
    isDrawing,
    currentWall,
    syncEnabled,
    addWall,
    updateWall,
    deleteWall,
    addDoor,
    addWindow,
    addElectricalElement,
    addPlumbingElement,
    setSelectedTool,
    setSelectedElements,
    setHoveredElement,
    setIsDrawing,
    setCurrentWall,
    setZoom,
    setPanOffset,
    toggleGrid,
    toggleDimensions,
    undo,
    redo,
    deleteSelectedElements,
    duplicateSelectedElements,
    detectRooms,
    saveToHistory,
    markDirty
  } = useDesignStore();

  // Sync system
  const { subscribe2D, triggerSync } = useSyncSystem();
  const { 
    syncSelectionFrom2DTo3D, 
    syncHoverFrom2DTo3D 
  } = useSelectionSync();

  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [selectionBox, setSelectionBox] = useState<{start: Point, end: Point} | null>(null);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = container.clientWidth * window.devicePixelRatio;
    canvas.height = container.clientHeight * window.devicePixelRatio;
    canvas.style.width = container.clientWidth + 'px';
    canvas.style.height = container.clientHeight + 'px';
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    drawEditor(ctx);
  }, [
    walls, doors, windows, rooms, electricalElements, plumbingElements,
    viewSettings, mousePos, hoveredElement, selectedElements, currentWall,
    selectionBox
  ]);

  // Subscribe to sync updates
  useEffect(() => {
    const unsubscribe = subscribe2D((syncData) => {
      // Handle incoming sync updates from 3D view
      if (syncData.updates) {
        // The store is already updated, just trigger a re-render
        markDirty();
      }
    });

    return unsubscribe;
  }, [subscribe2D, markDirty]);

  const drawEditor = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Save context
    ctx.save();
    
    // Apply zoom and pan
    ctx.scale(viewSettings.zoom, viewSettings.zoom);
    ctx.translate(viewSettings.panOffset.x, viewSettings.panOffset.y);

    // Draw grid
    if (viewSettings.showGrid && viewSettings.showLayers.grid) {
      drawGrid(ctx);
    }

    // Draw walls
    if (viewSettings.showLayers.walls) {
      walls.forEach(wall => drawWall(ctx, wall));
    }
    
    // Draw current wall being drawn
    if (currentWall && currentWall.start) {
      drawCurrentWall(ctx);
    }

    // Draw doors and windows
    if (viewSettings.showLayers.doors) {
      doors.forEach(door => drawDoor(ctx, door));
    }
    if (viewSettings.showLayers.windows) {
      windows.forEach(window => drawWindow(ctx, window));
    }

    // Draw electrical and plumbing elements
    if (viewSettings.showLayers.electrical) {
      electricalElements.forEach(element => drawElectricalElement(ctx, element));
    }
    if (viewSettings.showLayers.plumbing) {
      plumbingElements.forEach(element => drawPlumbingElement(ctx, element));
    }

    // Draw rooms and labels
    rooms.forEach(room => drawRoom(ctx, room));

    // Draw dimensions
    if (viewSettings.showDimensions && viewSettings.showLayers.dimensions) {
      walls.forEach(wall => drawWallDimensions(ctx, wall));
    }

    // Draw selection highlights
    selectedElements.forEach(elementId => drawSelection(ctx, elementId));

    // Draw hover effects
    if (hoveredElement) {
      drawHover(ctx, hoveredElement);
    }

    // Draw selection box
    if (selectionBox) {
      drawSelectionBox(ctx, selectionBox);
    }

    ctx.restore();
  };

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas;
    const gridSize = viewSettings.gridSize;
    const zoom = viewSettings.zoom;
    
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5 / zoom;
    ctx.setLineDash([]);

    // Calculate visible bounds
    const visibleLeft = -viewSettings.panOffset.x;
    const visibleTop = -viewSettings.panOffset.y;
    const visibleRight = visibleLeft + width / zoom;
    const visibleBottom = visibleTop + height / zoom;

    // Major grid lines (every foot)
    const startX = Math.floor(visibleLeft / gridSize) * gridSize;
    const endX = Math.ceil(visibleRight / gridSize) * gridSize;
    const startY = Math.floor(visibleTop / gridSize) * gridSize;
    const endY = Math.ceil(visibleBottom / gridSize) * gridSize;

    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, visibleTop);
      ctx.lineTo(x, visibleBottom);
      ctx.stroke();
    }

    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(visibleLeft, y);
      ctx.lineTo(visibleRight, y);
      ctx.stroke();
    }

    // Minor grid lines (every 6 inches) - only if zoomed in enough
    if (zoom > 0.5) {
      ctx.strokeStyle = '#f3f4f6';
      ctx.lineWidth = 0.25 / zoom;
      
      for (let x = startX; x <= endX; x += gridSize / 2) {
        ctx.beginPath();
        ctx.moveTo(x, visibleTop);
        ctx.lineTo(x, visibleBottom);
        ctx.stroke();
      }

      for (let y = startY; y <= endY; y += gridSize / 2) {
        ctx.beginPath();
        ctx.moveTo(visibleLeft, y);
        ctx.lineTo(visibleRight, y);
        ctx.stroke();
      }
    }
  };

  const drawWall = (ctx: CanvasRenderingContext2D, wall: Wall) => {
    const isSelected = selectedElements.includes(wall.id);
    const isHovered = hoveredElement === wall.id;
    const zoom = viewSettings.zoom;
    
    // Wall line
    ctx.strokeStyle = wall.type === 'exterior' ? '#1f2937' : '#6b7280';
    ctx.lineWidth = (wall.thickness / 2) / zoom;
    ctx.setLineDash([]);

    if (isSelected) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = (wall.thickness / 2 + 2) / zoom;
    } else if (isHovered) {
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = (wall.thickness / 2 + 1) / zoom;
    }

    ctx.beginPath();
    ctx.moveTo(wall.start.x, wall.start.y);
    ctx.lineTo(wall.end.x, wall.end.y);
    ctx.stroke();

    // Wall thickness representation
    if (wall.thickness > 2 && zoom > 0.3) {
      const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
      const perpAngle = angle + Math.PI / 2;
      const offset = wall.thickness / 4;

      ctx.strokeStyle = wall.type === 'exterior' ? '#374151' : '#9ca3af';
      ctx.lineWidth = 1 / zoom;

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

    const zoom = viewSettings.zoom;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 6 / zoom;
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
    const lengthFeet = Math.round((length / viewSettings.gridSize) * 12) / 12;
    
    ctx.fillStyle = '#ef4444';
    ctx.font = `${12 / zoom}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(
      `${lengthFeet}'`,
      (currentWall.start.x + mousePos.x) / 2,
      (currentWall.start.y + mousePos.y) / 2 - 10 / zoom
    );
  };

  const drawWallDimensions = (ctx: CanvasRenderingContext2D, wall: Wall) => {
    const zoom = viewSettings.zoom;
    const length = Math.sqrt(
      Math.pow(wall.end.x - wall.start.x, 2) + 
      Math.pow(wall.end.y - wall.start.y, 2)
    );
    const lengthFeet = Math.round((length / viewSettings.gridSize) * 12) / 12;
    
    // Dimension line
    const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
    const perpAngle = angle + Math.PI / 2;
    const offset = 20 / zoom;

    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1 / zoom;
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
    ctx.font = `${11 / zoom}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(
      `${lengthFeet}'`,
      (wall.start.x + wall.end.x) / 2 + Math.cos(perpAngle) * offset,
      (wall.start.y + wall.end.y) / 2 + Math.sin(perpAngle) * offset - 5 / zoom
    );
  };

  const drawDoor = (ctx: CanvasRenderingContext2D, door: Door) => {
    const wall = walls.find(w => w.id === door.wallId);
    if (!wall) return;

    const zoom = viewSettings.zoom;
    const isSelected = selectedElements.includes(door.id);
    const isHovered = hoveredElement === door.id;

    const doorPosition = {
      x: wall.start.x + (wall.end.x - wall.start.x) * door.position,
      y: wall.start.y + (wall.end.y - wall.start.y) * door.position
    };

    // Door opening
    ctx.strokeStyle = isSelected ? '#3b82f6' : isHovered ? '#60a5fa' : '#ffffff';
    ctx.lineWidth = (door.width * viewSettings.gridSize / 12) / zoom;
    ctx.setLineDash([]);

    const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
    const doorHalfWidth = (door.width * viewSettings.gridSize / 24);
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
    if (door.type !== 'sliding' && zoom > 0.3) {
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([2, 2]);

      const swingRadius = door.width * viewSettings.gridSize / 12;
      
      ctx.beginPath();
      ctx.arc(
        door.swing.includes('left') ? doorStart.x : doorEnd.x,
        door.swing.includes('left') ? doorStart.y : doorEnd.y,
        swingRadius / zoom,
        angle + (door.swing.includes('left') ? 0 : Math.PI),
        angle + (door.swing.includes('left') ? Math.PI/2 : -Math.PI/2)
      );
      ctx.stroke();
    }
  };

  const drawWindow = (ctx: CanvasRenderingContext2D, window: Window) => {
    const wall = walls.find(w => w.id === window.wallId);
    if (!wall) return;

    const zoom = viewSettings.zoom;
    const isSelected = selectedElements.includes(window.id);
    const isHovered = hoveredElement === window.id;

    const windowPosition = {
      x: wall.start.x + (wall.end.x - wall.start.x) * window.position,
      y: wall.start.y + (wall.end.y - wall.start.y) * window.position
    };

    // Window opening
    ctx.strokeStyle = isSelected ? '#3b82f6' : isHovered ? '#60a5fa' : '#3b82f6';
    ctx.lineWidth = 3 / zoom;
    ctx.setLineDash([]);

    const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
    const windowHalfWidth = (window.width * viewSettings.gridSize / 24);
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
    if (zoom > 0.5) {
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1 / zoom;
      
      const perpAngle = angle + Math.PI / 2;
      const sillOffset = 4 / zoom;

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
    }
  };

  const drawRoom = (ctx: CanvasRenderingContext2D, room: any) => {
    const zoom = viewSettings.zoom;
    
    // Room label
    ctx.fillStyle = '#374151';
    ctx.font = `bold ${14 / zoom}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(room.name, room.center.x, room.center.y);

    // Area
    ctx.font = `${12 / zoom}px sans-serif`;
    ctx.fillText(`${room.area} sq ft`, room.center.x, room.center.y + 16 / zoom);
  };

  const drawElectricalElement = (ctx: CanvasRenderingContext2D, element: ElectricalElement) => {
    const zoom = viewSettings.zoom;
    const isSelected = selectedElements.includes(element.id);
    const isHovered = hoveredElement === element.id;
    
    ctx.fillStyle = isSelected ? '#3b82f6' : isHovered ? '#60a5fa' : '#eab308';
    ctx.font = `${16 / zoom}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(element.symbol, element.position.x, element.position.y);
    
    // Draw circle background
    ctx.strokeStyle = isSelected ? '#3b82f6' : isHovered ? '#60a5fa' : '#eab308';
    ctx.lineWidth = 2 / zoom;
    ctx.beginPath();
    ctx.arc(element.position.x, element.position.y, 12 / zoom, 0, Math.PI * 2);
    ctx.stroke();
  };

  const drawPlumbingElement = (ctx: CanvasRenderingContext2D, element: PlumbingElement) => {
    const zoom = viewSettings.zoom;
    const isSelected = selectedElements.includes(element.id);
    const isHovered = hoveredElement === element.id;
    
    ctx.fillStyle = isSelected ? '#3b82f6' : isHovered ? '#60a5fa' : '#06b6d4';
    ctx.font = `${16 / zoom}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(element.symbol, element.position.x, element.position.y);
    
    // Draw square background
    ctx.strokeStyle = isSelected ? '#3b82f6' : isHovered ? '#60a5fa' : '#06b6d4';
    ctx.lineWidth = 2 / zoom;
    const size = 12 / zoom;
    ctx.strokeRect(element.position.x - size, element.position.y - size, size * 2, size * 2);
  };

  const drawSelection = (ctx: CanvasRenderingContext2D, elementId: string) => {
    const zoom = viewSettings.zoom;
    
    // Find the element to highlight
    const wall = walls.find(w => w.id === elementId);
    if (wall) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3 / zoom;
      ctx.setLineDash([5, 5]);
      ctx.globalAlpha = 0.7;
      
      ctx.beginPath();
      ctx.moveTo(wall.start.x, wall.start.y);
      ctx.lineTo(wall.end.x, wall.end.y);
      ctx.stroke();
      
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    }
  };

  const drawHover = (ctx: CanvasRenderingContext2D, elementId: string) => {
    // Similar to selection but with different color/style
    const zoom = viewSettings.zoom;
    
    const wall = walls.find(w => w.id === elementId);
    if (wall) {
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([3, 3]);
      ctx.globalAlpha = 0.5;
      
      ctx.beginPath();
      ctx.moveTo(wall.start.x, wall.start.y);
      ctx.lineTo(wall.end.x, wall.end.y);
      ctx.stroke();
      
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    }
  };

  const drawSelectionBox = (ctx: CanvasRenderingContext2D, box: {start: Point, end: Point}) => {
    const zoom = viewSettings.zoom;
    
    ctx.strokeStyle = '#3b82f6';
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([2, 2]);
    
    const width = box.end.x - box.start.x;
    const height = box.end.y - box.start.y;
    
    ctx.fillRect(box.start.x, box.start.y, width, height);
    ctx.strokeRect(box.start.x, box.start.y, width, height);
    
    ctx.setLineDash([]);
  };

  // Mouse event handlers
  const getMousePos = useCallback((e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / viewSettings.zoom - viewSettings.panOffset.x;
    const y = (e.clientY - rect.top) / viewSettings.zoom - viewSettings.panOffset.y;

    if (viewSettings.snapToGrid) {
      return {
        x: Math.round(x / viewSettings.gridSize) * viewSettings.gridSize,
        y: Math.round(y / viewSettings.gridSize) * viewSettings.gridSize
      };
    }

    return { x, y };
  }, [viewSettings]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e);
    
    if (e.button === 2) { // Right click for panning
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewSettings.panOffset.x, y: e.clientY - viewSettings.panOffset.y });
      return;
    }

    if (selectedTool === 'select') {
      // Selection logic
      const clickedElement = findElementAtPosition(pos);
      
      if (clickedElement) {
        if (e.ctrlKey || e.metaKey) {
          // Multi-select
          if (selectedElements.includes(clickedElement.id)) {
            setSelectedElements(selectedElements.filter(id => id !== clickedElement.id));
          } else {
            setSelectedElements([...selectedElements, clickedElement.id]);
          }
        } else {
          setSelectedElements([clickedElement.id]);
        }
        
        // Sync selection to 3D
        syncSelectionFrom2DTo3D(clickedElement.id, clickedElement.type);
        
        // Notify parent component
        onElementClick?.(clickedElement.id, clickedElement.type);
      } else {
        // Start selection box
        setSelectionBox({ start: pos, end: pos });
      }
    } else if (selectedTool === 'walls') {
      if (!isDrawing) {
        // Start drawing wall
        setIsDrawing(true);
        setCurrentWall({
          id: `wall-${Date.now()}`,
          start: pos,
          thickness: 6,
          type: 'exterior'
        });
        saveToHistory('Start drawing wall');
      } else {
        // Complete wall
        if (currentWall?.start) {
          const newWall: Wall = {
            ...currentWall as Wall,
            end: pos
          };
          
          addWall(newWall);
          setIsDrawing(false);
          setCurrentWall(null);
          
          saveToHistory('Add wall');
          detectRooms();
          triggerSync();
        }
      }
    } else if (selectedTool === 'doors' || selectedTool === 'windows') {
      const closestWall = findClosestWall(pos);
      if (closestWall) {
        if (selectedTool === 'doors') {
          addDoorToWall(closestWall, pos);
        } else {
          addWindowToWall(closestWall, pos);
        }
        saveToHistory(`Add ${selectedTool.slice(0, -1)}`); // Remove 's' for history
        triggerSync();
      }
    } else if (selectedTool === 'electrical') {
      const newElement: ElectricalElement = {
        id: `electrical-${Date.now()}`,
        type: 'outlet',
        position: pos,
        symbol: '⚡'
      };
      addElectricalElement(newElement);
      saveToHistory('Add electrical element');
      triggerSync();
    } else if (selectedTool === 'plumbing') {
      const newElement: PlumbingElement = {
        id: `plumbing-${Date.now()}`,
        type: 'sink',
        position: pos,
        rotation: 0,
        symbol: '🚿'
      };
      addPlumbingElement(newElement);
      saveToHistory('Add plumbing element');
      triggerSync();
    } else if (selectedTool === 'rooms') {
      // Room tool - for now just detect rooms automatically
      detectRooms();
      saveToHistory('Detect rooms');
      triggerSync();
    } else if (selectedTool === 'measure') {
      // Measure tool - for now just log the click position
      console.log('Measure tool clicked at:', pos);
      // TODO: Implement measurement functionality
    }
  }, [
    selectedTool, isDrawing, currentWall, selectedElements, viewSettings,
    getMousePos, syncSelectionFrom2DTo3D, onElementClick, addWall, addElectricalElement,
    addPlumbingElement, setSelectedElements, setIsDrawing, setCurrentWall, saveToHistory,
    detectRooms, triggerSync
  ]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e);
    setMousePos(pos);

    if (isPanning) {
      // Update pan offset
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    } else if (selectionBox) {
      // Update selection box
      setSelectionBox({ ...selectionBox, end: pos });
    } else {
      // Update hover
      const hoveredEl = findElementAtPosition(pos);
      const elementId = hoveredEl?.id || null;
      
      if (elementId !== hoveredElement) {
        setHoveredElement(elementId);
        syncHoverFrom2DTo3D(elementId);
      }
    }
  }, [
    getMousePos, isPanning, panStart, selectionBox, hoveredElement,
    setPanOffset, setHoveredElement
  ]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
    }
    
    if (selectionBox) {
      // Complete selection box
      const elementsInBox = findElementsInBox(selectionBox);
      if (e.ctrlKey || e.metaKey) {
        setSelectedElements([...new Set([...selectedElements, ...elementsInBox])]);
      } else {
        setSelectedElements(elementsInBox);
      }
      setSelectionBox(null);
    }
  }, [isPanning, selectionBox, selectedElements, setSelectedElements]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, viewSettings.zoom * delta));
    setZoom(newZoom);
  }, [viewSettings.zoom, setZoom]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'c':
            e.preventDefault();
            duplicateSelectedElements();
            saveToHistory('Duplicate elements');
            break;
          case 'a':
            e.preventDefault();
            const allElementIds = [
              ...walls.map(w => w.id),
              ...doors.map(d => d.id),
              ...windows.map(w => w.id),
              ...electricalElements.map(e => e.id),
              ...plumbingElements.map(e => e.id)
            ];
            setSelectedElements(allElementIds);
            break;
        }
      } else {
        switch (e.key) {
          case 'Delete':
          case 'Backspace':
            e.preventDefault();
            deleteSelectedElements();
            saveToHistory('Delete elements');
            triggerSync();
            break;
          case 'Escape':
            setSelectedElements([]);
            setIsDrawing(false);
            setCurrentWall(null);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    undo, redo, duplicateSelectedElements, deleteSelectedElements,
    setSelectedElements, setIsDrawing, setCurrentWall, saveToHistory,
    triggerSync, walls, doors, windows, electricalElements, plumbingElements
  ]);

  // Helper functions
  const findElementAtPosition = (pos: Point) => {
    // Check walls first
    for (const wall of walls) {
      if (distanceToWall(pos, wall) < 10) {
        return { id: wall.id, type: 'wall' };
      }
    }
    
    // Check doors
    for (const door of doors) {
      const wall = walls.find(w => w.id === door.wallId);
      if (wall) {
        const doorPos = {
          x: wall.start.x + (wall.end.x - wall.start.x) * door.position,
          y: wall.start.y + (wall.end.y - wall.start.y) * door.position
        };
        if (distance(pos, doorPos) < 20) {
          return { id: door.id, type: 'door' };
        }
      }
    }
    
    // Check windows, electrical, plumbing...
    // Similar logic for other elements
    
    return null;
  };

  const findElementsInBox = (box: {start: Point, end: Point}): string[] => {
    const left = Math.min(box.start.x, box.end.x);
    const right = Math.max(box.start.x, box.end.x);
    const top = Math.min(box.start.y, box.end.y);
    const bottom = Math.max(box.start.y, box.end.y);
    
    const elements: string[] = [];
    
    // Check walls
    walls.forEach(wall => {
      if (isPointInRect(wall.start, left, top, right, bottom) ||
          isPointInRect(wall.end, left, top, right, bottom)) {
        elements.push(wall.id);
      }
    });
    
    // Check other elements...
    
    return elements;
  };

  const findClosestWall = (point: Point): Wall | null => {
    let closestWall: Wall | null = null;
    let minDistance = 20;
    
    walls.forEach(wall => {
      const distance = distanceToWall(point, wall);
      if (distance < minDistance) {
        minDistance = distance;
        closestWall = wall;
      }
    });
    
    return closestWall;
  };

  const addDoorToWall = (wall: Wall, clickPos: Point) => {
    const position = calculatePositionAlongWall(wall, clickPos);
    const newDoor: Door = {
      id: `door-${Date.now()}`,
      wallId: wall.id,
      position,
      width: 36,
      swing: 'right',
      type: 'entry'
    };
    addDoor(newDoor);
  };

  const addWindowToWall = (wall: Wall, clickPos: Point) => {
    const position = calculatePositionAlongWall(wall, clickPos);
    const newWindow: Window = {
      id: `window-${Date.now()}`,
      wallId: wall.id,
      position,
      width: 48,
      height: 36,
      sillHeight: 30,
      type: 'double'
    };
    addWindow(newWindow);
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

  const distance = (p1: Point, p2: Point): number => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const isPointInRect = (point: Point, left: number, top: number, right: number, bottom: number): boolean => {
    return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
  };

  const calculatePositionAlongWall = (wall: Wall, clickPos: Point): number => {
    const A = clickPos.x - wall.start.x;
    const B = clickPos.y - wall.start.y;
    const C = wall.end.x - wall.start.x;
    const D = wall.end.y - wall.start.y;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    return Math.max(0.1, Math.min(0.9, dot / lenSq));
  };

  // Tool configuration
  const tools = [
    { id: 'select', icon: MousePointer, name: 'Select' },
    { id: 'walls', icon: Minus, name: 'Wall' },
    { id: 'doors', icon: DoorOpen, name: 'Door' },
    { id: 'windows', icon: RectangleHorizontal, name: 'Window' },
    { id: 'rooms', icon: Square, name: 'Room' },
    { id: 'electrical', icon: Zap, name: 'Electrical' },
    { id: 'plumbing', icon: Droplets, name: 'Plumbing' },
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
                onClick={() => setSelectedTool(tool.id)}
                className={`${
                  selectedTool === tool.id ? 'bg-blue-600 text-white' : ''
                } hover:bg-blue-50`}
              >
                <tool.icon className="w-4 h-4 mr-1" />
                {tool.name}
              </Button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={undo}
              disabled={!useDesignStore.getState().history.length || useDesignStore.getState().historyIndex <= 0}
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={redo}
              disabled={useDesignStore.getState().historyIndex >= useDesignStore.getState().history.length - 1}
            >
              <Redo className="w-4 h-4" />
            </Button>
            
            <div className="h-6 w-px bg-gray-300" />
            
            <Button variant="ghost" size="sm" onClick={duplicateSelectedElements}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={deleteSelectedElements}
              disabled={selectedElements.length === 0}
            >
              <Trash2 className="w-4 h-4" />
            </Button>

            <div className="h-6 w-px bg-gray-300" />
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setZoom(viewSettings.zoom * 1.2)}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setZoom(viewSettings.zoom * 0.8)}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>

            <div className="h-6 w-px bg-gray-300" />
            
            <Button 
              variant={viewSettings.showGrid ? 'default' : 'ghost'} 
              size="sm"
              onClick={toggleGrid}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewSettings.showDimensions ? 'default' : 'ghost'} 
              size="sm"
              onClick={toggleDimensions}
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
            selectedTool === 'walls' ? 'cursor-crosshair' :
            selectedTool === 'doors' || selectedTool === 'windows' ? 'cursor-copy' :
            isPanning ? 'cursor-grabbing' :
            'cursor-crosshair'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        />
        
        {/* Status Bar */}
        <div className="absolute bottom-4 left-4 bg-white shadow-lg rounded-lg p-2">
          <div className="flex items-center space-x-4 text-sm">
            <span>Grid: {viewSettings.gridSize}"</span>
            <span>Zoom: {Math.round(viewSettings.zoom * 100)}%</span>
            <span>Snap: {viewSettings.snapToGrid ? 'ON' : 'OFF'}</span>
            <span>
              Mouse: {Math.round(mousePos.x / viewSettings.gridSize * 12)}",{' '}
              {Math.round(mousePos.y / viewSettings.gridSize * 12)}"
            </span>
            {syncEnabled && (
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                Sync ON
              </Badge>
            )}
          </div>
        </div>

        {/* Current measurement display */}
        {isDrawing && currentWall?.start && (
          <div className="absolute top-80 right-4 bg-red-600 text-white px-3 py-2 rounded-lg shadow-lg">
            Length: {Math.round(Math.sqrt(
              Math.pow(mousePos.x - currentWall.start.x, 2) + 
              Math.pow(mousePos.y - currentWall.start.y, 2)
            ) / viewSettings.gridSize * 12) / 12}'
          </div>
        )}

        {/* Tool instructions */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-xs">
          <h3 className="font-semibold text-sm mb-2">Tool: {selectedTool}</h3>
          <p className="text-xs text-gray-600">
            {selectedTool === 'select' && 'Click to select, drag to box select, Ctrl+click for multi-select'}
            {selectedTool === 'walls' && 'Click to start wall, click again to finish. ESC to cancel'}
            {selectedTool === 'doors' && 'Click on a wall to add a door'}
            {selectedTool === 'windows' && 'Click on a wall to add a window'}
            {selectedTool === 'rooms' && 'Click to define room boundaries'}
            {selectedTool === 'electrical' && 'Click to place electrical outlets and switches'}
            {selectedTool === 'plumbing' && 'Click to place plumbing fixtures'}
            {selectedTool === 'measure' && 'Click and drag to measure distances'}
          </p>
          <div className="mt-2 space-y-1 text-xs text-gray-500">
            <div>Elements: {walls.length} walls, {doors.length} doors, {windows.length} windows</div>
            {selectedElements.length > 0 && (
              <div className="text-blue-600">Selected: {selectedElements.length}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Enhanced2DEditor;