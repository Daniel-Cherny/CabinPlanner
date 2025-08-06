import { useRef, useEffect, useState } from "react";
import { Scene3D } from "@/components/3d/Scene3D";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Move, RotateCcw, Maximize } from "lucide-react";

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
  const [viewAngle, setViewAngle] = useState<'top' | 'front' | 'side'>('top');

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    console.log(`Canvas clicked at: ${x}, ${y} with tool: ${selectedTool}`);
    setSelectedElement('main-structure');
  };

  if (viewMode === '3d') {
    return (
      <div className="w-full h-full">
        <Scene3D projectData={projectData} />
      </div>
    );
  }

  // Get template style for realistic rendering
  const templateStyle = projectData?.designData?.style || 'a-frame';
  const cabinWidth = Number(projectData?.width) || 16;
  const cabinLength = Number(projectData?.length) || 20;
  const cabinHeight = Number(projectData?.height) || 12;
  
  // Scale for canvas (1 foot = 15 pixels for better visibility)
  const scale = 15;
  const canvasWidth = cabinWidth * scale + 120; // Extra space for annotations
  const canvasHeight = cabinLength * scale + 120;

  const renderCabinLayout = () => {
    switch (templateStyle) {
      case 'a-frame':
        return (
          <div className="relative">
            {/* A-Frame shape */}
            <div 
              className="absolute bg-cabin-cream border-2 border-cabin-brown"
              style={{ 
                width: `${cabinWidth * scale}px`, 
                height: `${cabinLength * scale}px`,
                clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                top: '20px',
                left: '20px'
              }}
            />
            
            {/* Floor plan overlay */}
            <div 
              className="absolute bg-white bg-opacity-90 border border-cabin-brown"
              style={{ 
                width: `${cabinWidth * scale - 20}px`, 
                height: `${cabinLength * scale - 20}px`,
                top: '30px',
                left: '30px'
              }}
            >
              {/* Living area */}
              <div className="absolute bottom-2 left-2 right-2 h-1/2 bg-cabin-gold bg-opacity-20 border border-cabin-gold rounded">
                <span className="text-xs cabin-text absolute top-1 left-1">Living Area</span>
              </div>
              
              {/* Loft */}
              <div className="absolute top-2 left-1/4 right-1/4 h-1/4 bg-cabin-green bg-opacity-20 border border-cabin-green rounded">
                <span className="text-xs cabin-text absolute top-1 left-1">Loft</span>
              </div>
              
              {/* Entry door */}
              <div 
                className="absolute bg-cabin-brown"
                style={{ 
                  bottom: '0px', 
                  left: '50%', 
                  transform: 'translateX(-50%)', 
                  width: '30px', 
                  height: '8px' 
                }}
              />
            </div>
          </div>
        );
        
      case 'tiny':
        return (
          <div className="relative">
            {/* Rectangular shape */}
            <div 
              className="absolute bg-white border-2 border-cabin-brown rounded"
              style={{ 
                width: `${cabinWidth * scale}px`, 
                height: `${cabinLength * scale}px`,
                top: '20px',
                left: '20px'
              }}
            >
              {/* Kitchen */}
              <div className="absolute top-2 left-2 w-1/3 h-1/4 bg-cabin-gold bg-opacity-20 border border-cabin-gold rounded">
                <span className="text-xs cabin-text">Kitchen</span>
              </div>
              
              {/* Bathroom */}
              <div className="absolute top-2 right-2 w-1/4 h-1/4 bg-blue-100 border border-blue-300 rounded">
                <span className="text-xs cabin-text">Bath</span>
              </div>
              
              {/* Living area */}
              <div className="absolute bottom-2 left-2 right-2 h-1/2 bg-cabin-green bg-opacity-20 border border-cabin-green rounded">
                <span className="text-xs cabin-text">Living Area</span>
              </div>
              
              {/* Loft ladder */}
              <div className="absolute top-1/3 right-1/3 w-2 h-1/3 bg-cabin-brown bg-opacity-50 rounded">
                <span className="text-xs cabin-text absolute -right-8 top-0">Ladder</span>
              </div>
              
              {/* Entry door */}
              <div 
                className="absolute bg-cabin-brown"
                style={{ 
                  bottom: '0px', 
                  left: '20px', 
                  width: '30px', 
                  height: '8px' 
                }}
              />
            </div>
          </div>
        );
        
      case 'log':
        return (
          <div className="relative">
            {/* Log cabin shape with thick walls */}
            <div 
              className="absolute bg-cabin-brown border-4 border-amber-800 rounded"
              style={{ 
                width: `${cabinWidth * scale}px`, 
                height: `${cabinLength * scale}px`,
                top: '20px',
                left: '20px'
              }}
            >
              {/* Interior space */}
              <div className="absolute inset-4 bg-white rounded">
                {/* Great room */}
                <div className="absolute top-2 left-2 right-2 h-2/3 bg-cabin-gold bg-opacity-20 border border-cabin-gold rounded">
                  <span className="text-xs cabin-text">Great Room</span>
                  
                  {/* Fireplace */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-red-200 border border-red-400 rounded">
                    <span className="text-xs cabin-text absolute -bottom-5 left-1/2 transform -translate-x-1/2">Fireplace</span>
                  </div>
                </div>
                
                {/* Bedroom */}
                <div className="absolute bottom-2 left-2 w-1/2 h-1/4 bg-cabin-green bg-opacity-20 border border-cabin-green rounded">
                  <span className="text-xs cabin-text">Bedroom</span>
                </div>
                
                {/* Kitchen */}
                <div className="absolute bottom-2 right-2 w-1/2 h-1/4 bg-cabin-gold bg-opacity-30 border border-cabin-gold rounded">
                  <span className="text-xs cabin-text">Kitchen</span>
                </div>
              </div>
              
              {/* Entry door */}
              <div 
                className="absolute bg-amber-900"
                style={{ 
                  bottom: '0px', 
                  left: '50%', 
                  transform: 'translateX(-50%)', 
                  width: '40px', 
                  height: '12px' 
                }}
              />
            </div>
          </div>
        );
        
      default: // modern
        return (
          <div className="relative">
            {/* Modern rectangular shape */}
            <div 
              className="absolute bg-white border-2 border-gray-400 rounded"
              style={{ 
                width: `${cabinWidth * scale}px`, 
                height: `${cabinLength * scale}px`,
                top: '20px',
                left: '20px'
              }}
            >
              {/* Open floor plan */}
              <div className="absolute inset-2 bg-cabin-cream bg-opacity-30 border border-gray-300 rounded">
                <span className="text-xs cabin-text absolute top-1 left-1">Open Floor Plan</span>
                
                {/* Kitchen island */}
                <div className="absolute top-1/4 right-1/4 w-1/4 h-1/6 bg-cabin-gold bg-opacity-40 border border-cabin-gold rounded">
                  <span className="text-xs cabin-text">Island</span>
                </div>
                
                {/* Sleeping area */}
                <div className="absolute bottom-2 right-2 w-1/3 h-1/3 bg-cabin-green bg-opacity-20 border border-cabin-green rounded">
                  <span className="text-xs cabin-text">Sleep</span>
                </div>
              </div>
              
              {/* Large windows */}
              <div className="absolute top-2 left-0 w-2 h-1/3 bg-blue-200 border border-blue-400" />
              <div className="absolute top-2 right-0 w-2 h-1/3 bg-blue-200 border border-blue-400" />
              
              {/* Sliding door */}
              <div 
                className="absolute bg-gray-600"
                style={{ 
                  bottom: '0px', 
                  right: '20px', 
                  width: '60px', 
                  height: '8px' 
                }}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full bg-gradient-to-b from-sky-50 to-green-50 relative overflow-auto">
      {/* View Controls */}
      <div className="absolute top-4 left-4 z-10 flex space-x-2">
        <Button
          variant={viewAngle === 'top' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewAngle('top')}
          className={viewAngle === 'top' ? 'bg-cabin-brown text-white' : ''}
        >
          Top View
        </Button>
        <Button
          variant={viewAngle === 'front' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewAngle('front')}
          className={viewAngle === 'front' ? 'bg-cabin-brown text-white' : ''}
        >
          Front View
        </Button>
      </div>

      {/* Canvas Area */}
      <div 
        ref={canvasRef}
        className="flex items-center justify-center min-h-full p-8 cursor-crosshair"
        onClick={handleCanvasClick}
        style={{ 
          backgroundImage: `
            linear-gradient(rgba(139, 69, 19, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 69, 19, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: `${scale}px ${scale}px`
        }}
      >
        <div className="relative">
          {viewAngle === 'top' ? (
            <>
              {renderCabinLayout()}
              
              {/* Dimension arrows and labels */}
              <div 
                className="absolute cabin-text text-sm font-medium flex items-center justify-center"
                style={{ 
                  bottom: '-30px', 
                  left: '20px', 
                  width: `${cabinWidth * scale}px`,
                  borderBottom: '2px solid #8B4513'
                }}
              >
                <span className="bg-white px-2">{cabinWidth}'</span>
              </div>
              
              <div 
                className="absolute cabin-text text-sm font-medium flex items-center justify-center"
                style={{ 
                  left: '-40px', 
                  top: '20px', 
                  height: `${cabinLength * scale}px`,
                  borderLeft: '2px solid #8B4513',
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed'
                }}
              >
                <span className="bg-white px-2">{cabinLength}'</span>
              </div>
            </>
          ) : (
            /* Front elevation view */
            <div className="relative bg-white border-2 border-cabin-brown rounded shadow-lg p-8">
              <div className="text-center mb-4">
                <h3 className="font-semibold cabin-text">Front Elevation</h3>
                <p className="text-sm text-muted-foreground">Height: {cabinHeight}'</p>
              </div>
              
              {/* Simple front view based on style */}
              {templateStyle === 'a-frame' ? (
                <div 
                  className="mx-auto bg-cabin-cream border-2 border-cabin-brown"
                  style={{ 
                    width: `${cabinWidth * 8}px`, 
                    height: `${cabinHeight * 8}px`,
                    clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
                  }}
                />
              ) : (
                <div 
                  className="mx-auto bg-cabin-cream border-2 border-cabin-brown"
                  style={{ 
                    width: `${cabinWidth * 8}px`, 
                    height: `${cabinHeight * 8}px`
                  }}
                />
              )}
              
              {/* Add windows and door to front view */}
              <div className="mt-4 text-xs cabin-text text-center">
                Click elements to customize windows, doors, and materials
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Element Info */}
      {selectedElement && (
        <Card className="absolute top-4 right-4 z-10">
          <CardContent className="p-4">
            <h4 className="font-semibold cabin-text mb-2">Selected: Main Structure</h4>
            <div className="text-sm cabin-text space-y-1">
              <div>Style: {templateStyle.charAt(0).toUpperCase() + templateStyle.slice(1)}</div>
              <div>Width: {cabinWidth} ft</div>
              <div>Length: {cabinLength} ft</div>
              <div>Height: {cabinHeight} ft</div>
              <div>Area: {cabinWidth * cabinLength} sq ft</div>
            </div>
            
            <div className="mt-3 space-y-2">
              <Badge variant="outline" className="w-full justify-center">
                {projectData?.designData?.difficulty || 'Beginner'} Level
              </Badge>
              
              <div className="text-xs text-muted-foreground">
                💡 Tip: This {templateStyle} design is {
                  templateStyle === 'a-frame' ? 'great for beginners - simple triangular structure' :
                  templateStyle === 'tiny' ? 'perfect for weekend getaways' :
                  templateStyle === 'log' ? 'traditional and sturdy' :
                  'modern and versatile'
                }
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* YouTube-style inspiration photos */}
      <Card className="absolute bottom-4 left-4 z-10 max-w-sm">
        <CardContent className="p-4">
          <h4 className="font-semibold cabin-text mb-2">Real {templateStyle} Builds</h4>
          <div className="grid grid-cols-2 gap-2">
            <img 
              src={projectData?.templateId ? 
                "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=200&h=150" :
                "https://images.unsplash.com/photo-1542621334-a254cf47733d?auto=format&fit=crop&w=200&h=150"
              }
              alt="YouTube build example 1"
              className="rounded border"
            />
            <img 
              src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=200&h=150"
              alt="YouTube build example 2" 
              className="rounded border"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Similar builds from YouTube creators
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
