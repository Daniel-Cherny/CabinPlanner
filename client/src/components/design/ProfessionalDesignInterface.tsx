import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Eye,
  EyeOff
} from "lucide-react";
import { Professional2DEditor } from "./Professional2DEditor";
import { Professional3DViewer } from "./Professional3DViewer";

interface ProfessionalDesignInterfaceProps {
  projectData: any;
  onProjectDataChange: (updates: any) => void;
  selectedTool: string;
  onToolChange: (tool: string) => void;
}

export function ProfessionalDesignInterface({ 
  projectData, 
  onProjectDataChange, 
  selectedTool, 
  onToolChange 
}: ProfessionalDesignInterfaceProps) {
  const [viewMode, setViewMode] = useState<'2d-only' | '3d-only' | 'tabs'>('2d-only');
  const [activeTab, setActiveTab] = useState('2d');
  const [floorPlanData, setFloorPlanData] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayers, setShowLayers] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

  // Sync floor plan changes to 3D
  useEffect(() => {
    if (autoSync && floorPlanData) {
      onProjectDataChange({ 
        ...projectData, 
        floorPlan: floorPlanData,
        lastModified: new Date().toISOString()
      });
    }
  }, [floorPlanData, autoSync]);

  const handleFloorPlanChange = (updates: any) => {
    setFloorPlanData(updates);
  };

  const exportProject = () => {
    const exportData = {
      project: projectData,
      floorPlan: floorPlanData,
      exportDate: new Date().toISOString(),
      version: "1.0"
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectData?.name || 'cabin-design'}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const shareProject = () => {
    // Implementation for sharing project
    navigator.clipboard.writeText(window.location.href);
    // Show toast notification
  };

  const renderViewModeContent = () => {
    switch (viewMode) {
      case '2d-only':
        return (
          <div className="h-full">
            <Professional2DEditor
              projectData={projectData}
              onProjectDataChange={handleFloorPlanChange}
              selectedTool={selectedTool}
              onToolChange={onToolChange}
            />
          </div>
        );
        
      case '3d-only':
        return (
          <div className="h-full">
            <Professional3DViewer
              projectData={projectData}
              onProjectDataChange={onProjectDataChange}
              floorPlanData={floorPlanData}
            />
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'} flex flex-col bg-white`}>
      {/* Professional Toolbar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left Section - View Controls */}
          <div className="flex items-center space-x-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === '2d-only' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('2d-only')}
                className={`${viewMode === '2d-only' ? 'bg-blue-600 text-white' : ''} px-4`}
              >
                <Layout className="w-4 h-4 mr-2" />
                2D View
              </Button>
              <Button
                variant={viewMode === '3d-only' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('3d-only')}
                className={`${viewMode === '3d-only' ? 'bg-blue-600 text-white' : ''} px-4`}
              >
                <Box className="w-4 h-4 mr-2" />
                3D View
              </Button>
            </div>

            <div className="h-6 w-px bg-gray-300" />

            {/* Editing Tools */}
            <Button variant="ghost" size="sm" className="hover:bg-gray-100">
              <Undo className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="hover:bg-gray-100">
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
          </div>

          {/* Center Section - Project Info */}
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <h2 className="font-semibold text-gray-900">
                {projectData?.name || 'Untitled Cabin Project'}
              </h2>
              <div className="text-xs text-gray-500">
                {projectData?.width}' × {projectData?.length}' • {projectData?.area} sq ft
              </div>
            </div>

            {autoSync && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live Sync
              </div>
            )}
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoSync(!autoSync)}
              className={autoSync ? 'bg-green-100 text-green-700' : ''}
            >
              <Settings className="w-4 h-4" />
            </Button>
            
            <Button variant="ghost" size="sm" onClick={shareProject}>
              <Share className="w-4 h-4" />
            </Button>
            
            <Button variant="ghost" size="sm" onClick={exportProject}>
              <Download className="w-4 h-4" />
            </Button>
            
            <Button variant="outline" size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Save
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

      {/* Status Bar */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-6">
            <span>Selected Tool: <strong>{selectedTool}</strong></span>
            <span>View: <strong>{viewMode.replace('-', ' ').toUpperCase()}</strong></span>
            {floorPlanData && (
              <span>Elements: <strong>{(floorPlanData.walls?.length || 0)} walls, {(floorPlanData.doors?.length || 0)} doors</strong></span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <span>Auto-Save: <strong>ON</strong></span>
            <span>Last saved: <strong>2 min ago</strong></span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>Connected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Layers Panel - Fixed Position */}
      {showLayers && (
        <div className="absolute top-20 left-4 w-72 z-10 pointer-events-auto">
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
                  { name: 'Walls', visible: true, color: '#1f2937' },
                  { name: 'Doors & Windows', visible: true, color: '#3b82f6' },
                  { name: 'Electrical', visible: false, color: '#eab308' },
                  { name: 'Plumbing', visible: false, color: '#06b6d4' },
                  { name: 'Dimensions', visible: true, color: '#6b7280' },
                  { name: 'Grid', visible: true, color: '#e5e7eb' }
                ].map((layer) => (
                  <div key={layer.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded border"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="text-sm">{layer.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="p-1">
                      {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}