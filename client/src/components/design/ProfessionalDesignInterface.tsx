import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Layout, 
  Box, 
  Maximize2, 
  Minimize2,
  Download,
  Share,
  Save,
  Undo,
  Redo,
  Settings,
  Layers,
  Eye,
  EyeOff,
  SplitSquareHorizontal,
  SplitSquareVertical,
  RefreshCw,
  Clock,
  Zap
} from "lucide-react";
import { useDesignStore } from '../../stores/designStore';
import { useSyncSystem, useSelectionSync, usePerformanceMonitor } from '../../hooks/useSyncSystem';
import Enhanced2DEditor from './Enhanced2DEditor';
import Enhanced3DViewer from './Enhanced3DViewer';

interface ProfessionalDesignInterfaceProps {
  projectData?: any;
  onProjectDataChange?: (updates: any) => void;
}

export function ProfessionalDesignInterface({ 
  projectData, 
  onProjectDataChange 
}: ProfessionalDesignInterfaceProps) {
  // Use global state with explicit selector for selectedTool to ensure re-renders
  const selectedTool = useDesignStore((state) => state.selectedTool);
  const {
    project,
    splitViewMode,
    activePane,
    syncEnabled,
    autoSaveEnabled,
    lastSaved,
    isDirty,
    history,
    historyIndex,
    walls,
    doors,
    windows,
    electricalElements,
    plumbingElements,
    selectedElements,
    hoveredElement,
    setSplitViewMode,
    setActivePane,
    setSelectedTool,
    toggleSync,
    undo,
    redo,
    exportProject,
    autoSave,
    markClean,
    setProject,
    updateProject
  } = useDesignStore();

  // Sync system hooks
  const { getSyncStatus, triggerSync } = useSyncSystem();
  const { selectedElements: syncedSelection } = useSelectionSync();
  const { getPerformanceMetrics } = usePerformanceMonitor();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayers, setShowLayers] = useState(true);
  const [syncStatus, setSyncStatus] = useState(getSyncStatus());

  // Initialize project data if provided
  useEffect(() => {
    if (projectData && !project) {
      setProject(projectData);
    }
  }, [projectData, project, setProject]);

  // Handle prop-based tool changes (for backward compatibility)
  useEffect(() => {
    if (propSelectedTool && propSelectedTool !== selectedTool) {
      setSelectedTool(propSelectedTool);
    }
  }, [propSelectedTool, selectedTool, setSelectedTool]);

  // Update sync status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(getSyncStatus());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [getSyncStatus]);

  // Auto-save handling
  useEffect(() => {
    if (autoSaveEnabled && isDirty) {
      const timer = setTimeout(() => {
        autoSave();
        onProjectDataChange?.(project);
      }, 30000);
      
      return () => clearTimeout(timer);
    }
  }, [autoSaveEnabled, isDirty, autoSave, onProjectDataChange, project]);

  const handleToolChange = useCallback((tool: string) => {
    setSelectedTool(tool);
    propOnToolChange?.(tool);
  }, [setSelectedTool, propOnToolChange]);

  const handleElementClick = useCallback((elementId: string, elementType: string) => {
    // This handles clicks from either 2D or 3D views
    // The selection sync is handled automatically by the sync system
    console.log(`Element clicked: ${elementType} ${elementId}`);
  }, []);

  const handleExportProject = useCallback(() => {
    try {
      exportProject();
      markClean();
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [exportProject, markClean]);

  const handleShareProject = useCallback(() => {
    try {
      navigator.clipboard.writeText(window.location.href);
      // In a real app, you'd show a toast notification
      console.log('Project URL copied to clipboard');
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, []);

  const handleSave = useCallback(() => {
    autoSave();
    onProjectDataChange?.(project);
    console.log('Project saved');
  }, [autoSave, onProjectDataChange, project]);

  const formatLastSaved = (lastSaved: string | null) => {
    if (!lastSaved) return 'Never';
    const now = new Date();
    const saved = new Date(lastSaved);
    const diffMs = now.getTime() - saved.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return saved.toLocaleDateString();
  };

  const renderViewModeContent = () => {
    switch (splitViewMode) {
      case '2d-only':
        return (
          <div className="h-full">
            <Enhanced2DEditor onElementClick={handleElementClick} />
          </div>
        );
        
      case '3d-only':
        return (
          <div className="h-full">
            <Enhanced3DViewer onElementClick={handleElementClick} />
          </div>
        );

      case 'split-horizontal':
        return (
          <div className="h-full flex flex-col">
            <div className={`${activePane === '2d' ? 'flex-1' : 'h-1/2'} border-b border-gray-300`}>
              <Enhanced2DEditor onElementClick={handleElementClick} />
            </div>
            <div className={`${activePane === '3d' ? 'flex-1' : 'h-1/2'}`}>
              <Enhanced3DViewer onElementClick={handleElementClick} />
            </div>
          </div>
        );

      case 'split-vertical':
        return (
          <div className="h-full flex">
            <div className={`${activePane === '2d' ? 'flex-1' : 'w-1/2'} border-r border-gray-300`}>
              <Enhanced2DEditor onElementClick={handleElementClick} />
            </div>
            <div className={`${activePane === '3d' ? 'flex-1' : 'w-1/2'}`}>
              <Enhanced3DViewer onElementClick={handleElementClick} />
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'} flex flex-col bg-white`}>
      {/* Enhanced Professional Toolbar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left Section - View Controls */}
          <div className="flex items-center space-x-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                variant={splitViewMode === '2d-only' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSplitViewMode('2d-only')}
                className={`${splitViewMode === '2d-only' ? 'bg-blue-600 text-white' : ''} px-3`}
              >
                <Layout className="w-4 h-4 mr-1" />
                2D
              </Button>
              <Button
                variant={splitViewMode === '3d-only' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSplitViewMode('3d-only')}
                className={`${splitViewMode === '3d-only' ? 'bg-blue-600 text-white' : ''} px-3`}
              >
                <Box className="w-4 h-4 mr-1" />
                3D
              </Button>
              <Button
                variant={splitViewMode === 'split-horizontal' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSplitViewMode('split-horizontal')}
                className={`${splitViewMode === 'split-horizontal' ? 'bg-blue-600 text-white' : ''} px-2`}
              >
                <SplitSquareHorizontal className="w-4 h-4" />
              </Button>
              <Button
                variant={splitViewMode === 'split-vertical' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSplitViewMode('split-vertical')}
                className={`${splitViewMode === 'split-vertical' ? 'bg-blue-600 text-white' : ''} px-2`}
              >
                <SplitSquareVertical className="w-4 h-4" />
              </Button>
            </div>

            <div className="h-6 w-px bg-gray-300" />

            {/* Editing Tools */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={undo}
              disabled={historyIndex <= 0}
              className="hover:bg-gray-100"
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="hover:bg-gray-100"
            >
              <Redo className="w-4 h-4" />
            </Button>
            
            <div className="h-6 w-px bg-gray-300" />
            
            <Button 
              variant={showLayers ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setShowLayers(!showLayers)}
              className={showLayers ? 'bg-blue-100 text-blue-700' : ''}
            >
              {showLayers ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={triggerSync}
              className="hover:bg-gray-100"
              title="Force sync"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Center Section - Project Info */}
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <h2 className="font-semibold text-gray-900">
                {project?.name || 'Untitled Cabin Project'}
              </h2>
              <div className="text-xs text-gray-500">
                {project?.width}' × {project?.length}' • {project?.area} sq ft
              </div>
            </div>

            {/* Sync Status */}
            {syncEnabled ? (
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                <Zap className="w-3 h-3" />
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live Sync
                {syncStatus.pendingUpdates > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 text-xs">
                    {syncStatus.pendingUpdates}
                  </Badge>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                Sync Off
              </div>
            )}

            {/* Selection Info */}
            {selectedElements.length > 0 && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {selectedElements.length} selected
              </Badge>
            )}
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSync}
              className={syncEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
              title="Toggle sync"
            >
              <Settings className="w-4 h-4" />
            </Button>
            
            <Button variant="ghost" size="sm" onClick={handleShareProject}>
              <Share className="w-4 h-4" />
            </Button>
            
            <Button variant="ghost" size="sm" onClick={handleExportProject}>
              <Download className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSave}
              className={`${isDirty ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-600'}`}
            >
              <Save className="w-4 h-4 mr-2" />
              {isDirty ? 'Save*' : 'Saved'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {renderViewModeContent()}
      </div>

      {/* Enhanced Status Bar */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-6">
            <span>Tool: <strong>{selectedTool}</strong></span>
            <span>View: <strong>{splitViewMode.replace('-', ' ').toUpperCase()}</strong></span>
            <span>
              Elements: <strong>
                {walls.length} walls, {doors.length} doors, {windows.length} windows
              </strong>
            </span>
            {hoveredElement && (
              <span>Hovering: <strong>{hoveredElement}</strong></span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <span>Auto-Save: <strong>{autoSaveEnabled ? 'ON' : 'OFF'}</strong></span>
            <span>Last saved: <strong>{formatLastSaved(lastSaved)}</strong></span>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${syncEnabled ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span>{syncEnabled ? 'Connected' : 'Offline'}</span>
            </div>
            <span className="text-xs">
              FPS: <strong>{getPerformanceMetrics().fps}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Enhanced Layers Panel - Fixed Position */}
      {showLayers && (
        <div className="absolute top-24 right-4 w-72 z-20 pointer-events-auto">
          <Card className="shadow-lg border border-gray-200 bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center">
                  <Layers className="w-4 h-4 mr-2" />
                  Layers
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowLayers(false)}
                  className="p-1"
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-2">
                {[
                  { 
                    name: 'Walls', 
                    key: 'walls',
                    visible: true, 
                    color: '#1f2937',
                    count: walls.length
                  },
                  { 
                    name: 'Doors', 
                    key: 'doors',
                    visible: true, 
                    color: '#3b82f6',
                    count: doors.length
                  },
                  { 
                    name: 'Windows', 
                    key: 'windows',
                    visible: true, 
                    color: '#06b6d4',
                    count: windows.length
                  },
                  { 
                    name: 'Electrical', 
                    key: 'electrical',
                    visible: true, 
                    color: '#eab308',
                    count: electricalElements.length
                  },
                  { 
                    name: 'Plumbing', 
                    key: 'plumbing',
                    visible: true, 
                    color: '#06b6d4',
                    count: plumbingElements.length
                  },
                  { 
                    name: 'Dimensions', 
                    key: 'dimensions',
                    visible: true, 
                    color: '#6b7280',
                    count: 0
                  },
                  { 
                    name: 'Grid', 
                    key: 'grid',
                    visible: true, 
                    color: '#e5e7eb',
                    count: 0
                  }
                ].map((layer) => (
                  <div key={layer.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded border"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="text-sm">{layer.name}</span>
                      {layer.count > 0 && (
                        <Badge variant="secondary" className="h-4 text-xs">
                          {layer.count}
                        </Badge>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-1"
                      onClick={() => {/* Toggle layer */}}
                    >
                      {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </Button>
                  </div>
                ))}
              </div>

              {/* Performance Section */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Sync Status:</span>
                    <span className={syncEnabled ? 'text-green-600' : 'text-gray-400'}>
                      {syncEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending Updates:</span>
                    <span>{syncStatus.pendingUpdates}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Pane:</span>
                    <span className="capitalize">{activePane}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}