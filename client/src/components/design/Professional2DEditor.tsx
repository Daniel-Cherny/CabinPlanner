import { Button } from "@/components/ui/button";
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

// Import our state management and custom hook
import { useDesignStore } from '../../stores/designStore';
import { useEditorCanvas } from '../../hooks/useEditorCanvas';

interface Professional2DEditorProps {
  projectData?: any;
  onProjectDataChange?: (data: any) => void;
}

export function Professional2DEditor({ projectData, onProjectDataChange }: Professional2DEditorProps) {
  const store = useDesignStore();
  
  // Get all canvas functionality from our custom hook
  const {
    canvasRef,
    containerRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    mousePos,
    isDrawing
  } = useEditorCanvas({ store });

  // Extract only the UI-related state from store
  const {
    walls,
    doors,
    windows,
    selectedTool,
    viewSettings,
    gridSettings,
    setSelectedTool,
    updateViewSettings,
    undo,
    redo,
    canUndo,
    canRedo
  } = store;

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
            {selectedTool === 'walls' && (isDrawing ? 'Click to end wall' : 'Click to start wall')}
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