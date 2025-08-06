import { useRef, useEffect, useState } from "react";
import { Scene3D } from "@/components/3d/Scene3D";

interface DesignCanvasProps {
  viewMode: '2d' | '3d';
  selectedTool: string;
  projectData: any;
  onProjectDataChange: (updates: any) => void;
}

export function DesignCanvas({ 
  viewMode, 
  selectedTool, 
  projectData, 
  onProjectDataChange 
}: DesignCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // TODO: Implement element placement based on selectedTool
    console.log(`Canvas clicked at: ${x}, ${y} with tool: ${selectedTool}`);
    
    // Mock element selection
    setSelectedElement('main-structure');
  };

  if (viewMode === '3d') {
    return (
      <div className="w-full h-full">
        <Scene3D projectData={projectData} />
      </div>
    );
  }

  return (
    <div 
      ref={canvasRef}
      className="w-full h-full design-canvas bg-white relative overflow-hidden cursor-crosshair"
      onClick={handleCanvasClick}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Floor Plan Container */}
        <div 
          className="bg-white border-2 border-cabin-brown rounded-lg shadow-lg p-8 relative"
          style={{ 
            width: projectData?.width ? `${Number(projectData.width) * 20}px` : '480px', 
            height: projectData?.length ? `${Number(projectData.length) * 20}px` : '320px' 
          }}
        >
          {/* A-Frame Structure Outline (example) */}
          <div 
            className="absolute inset-4 border-2 border-cabin-stone rounded-t-full border-b-0" 
            style={{ borderRadius: '50% 50% 0 0' }}
          />
          
          {/* Interior Elements */}
          <div className="absolute bottom-4 left-8 w-16 h-4 bg-cabin-gold bg-opacity-30 rounded border border-cabin-gold">
            <span className="text-xs cabin-text absolute -top-5 left-0">Kitchen</span>
          </div>
          
          <div className="absolute bottom-4 right-8 w-20 h-12 bg-cabin-green bg-opacity-30 rounded border border-cabin-green">
            <span className="text-xs cabin-text absolute -top-5 left-0">Bedroom</span>
          </div>
          
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-12 h-2 bg-cabin-brown rounded">
            <span className="text-xs cabin-text absolute -top-5 left-0">Loft</span>
          </div>

          {/* Door */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-4 bg-white border-2 border-cabin-brown border-b-0" />
          
          {/* Windows */}
          <div className="absolute top-12 left-4 w-3 h-8 bg-blue-100 border border-blue-300" />
          <div className="absolute top-12 right-4 w-3 h-8 bg-blue-100 border border-blue-300" />
          
          {/* Measurements */}
          <div className="absolute -bottom-8 left-0 right-0 text-center text-sm cabin-text">
            {projectData?.width || '24'}'
          </div>
          <div className="absolute -left-8 top-0 bottom-0 flex items-center">
            <span className="text-sm cabin-text transform -rotate-90">
              {projectData?.length || '16'}'
            </span>
          </div>
        </div>
        
        {/* Selection Handles */}
        {selectedElement && (
          <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-240px, -160px)' }}>
            <div className="w-2 h-2 bg-cabin-brown border border-white rounded-full" />
          </div>
        )}
      </div>
      
      {/* Measurement Overlay */}
      {selectedElement && (
        <div className="absolute top-4 right-4 bg-white shadow-lg rounded-lg p-3">
          <div className="text-sm cabin-text space-y-1">
            <div>Selected: Main Structure</div>
            <div>Width: {projectData?.width || '24'} ft</div>
            <div>Length: {projectData?.length || '16'} ft</div>
            <div>Area: {projectData?.area || '384'} sq ft</div>
          </div>
        </div>
      )}
    </div>
  );
}
