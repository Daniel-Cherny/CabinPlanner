import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface PropertiesPanelProps {
  projectData: any;
  onProjectDataChange: (updates: any) => void;
  onOpenBuildGuide: () => void;
  onOpenMaterialLibrary: () => void;
}

export function PropertiesPanel({ 
  projectData, 
  onProjectDataChange, 
  onOpenBuildGuide,
  onOpenMaterialLibrary 
}: PropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState<'properties' | 'build'>('properties');

  const handleDimensionChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const updates = { [field]: value };
    
    // Auto-calculate area when width or length changes
    if (field === 'width' || field === 'length') {
      const width = field === 'width' ? numValue : (parseFloat(projectData?.width) || 0);
      const length = field === 'length' ? numValue : (parseFloat(projectData?.length) || 0);
      updates.area = width * length;
    }
    
    onProjectDataChange(updates);
  };

  const mockConstructionPhases = [
    {
      name: "Foundation",
      status: "ready",
      days: "3-5",
      skillLevel: "beginner"
    },
    {
      name: "Framing", 
      status: "moderate",
      days: "5-7",
      skillLevel: "intermediate"
    },
    {
      name: "Roofing",
      status: "pending", 
      days: "3-4",
      skillLevel: "intermediate"
    },
    {
      name: "Electrical",
      status: "professional",
      days: "2-3", 
      skillLevel: "professional"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-cabin-green bg-opacity-10 border-cabin-green text-cabin-green';
      case 'moderate': return 'bg-cabin-gold bg-opacity-10 border-cabin-gold text-cabin-gold';
      case 'pending': return 'bg-gray-100 border-gray-300 text-gray-500';
      case 'professional': return 'bg-red-50 border-red-300 text-red-600';
      default: return 'bg-gray-100 border-gray-300 text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return '✓';
      case 'moderate': return '⚠';
      case 'pending': return '⏳';
      case 'professional': return '🔧';
      default: return '⏳';
    }
  };

  return (
    <div className="p-6">
      {/* Mode Toggle */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
        <Button
          variant={activeTab === 'properties' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('properties')}
          className={`flex-1 ${activeTab === 'properties' ? 'bg-white shadow' : ''}`}
        >
          Properties
        </Button>
        <Button
          variant={activeTab === 'build' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('build')}
          className={`flex-1 ${activeTab === 'build' ? 'bg-white shadow' : ''}`}
        >
          Build Guide
        </Button>
      </div>

      {activeTab === 'properties' ? (
        <div className="space-y-6">
          {/* Project Info */}
          <div>
            <h3 className="text-lg font-playfair font-semibold cabin-text mb-4">Project Details</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="project-name" className="text-sm font-medium cabin-text">Project Name</Label>
                <Input
                  id="project-name"
                  value={projectData?.name || ''}
                  onChange={(e) => onProjectDataChange({ name: e.target.value })}
                  placeholder="Enter project name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="width" className="text-sm font-medium cabin-text">Width (ft)</Label>
                  <Input
                    id="width"
                    type="number"
                    value={projectData?.width || ''}
                    onChange={(e) => handleDimensionChange('width', e.target.value)}
                    placeholder="24"
                  />
                </div>
                <div>
                  <Label htmlFor="length" className="text-sm font-medium cabin-text">Length (ft)</Label>
                  <Input
                    id="length"
                    type="number"
                    value={projectData?.length || ''}
                    onChange={(e) => handleDimensionChange('length', e.target.value)}
                    placeholder="16"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="height" className="text-sm font-medium cabin-text">Height (ft)</Label>
                <Input
                  id="height"
                  type="number"
                  value={projectData?.height || ''}
                  onChange={(e) => onProjectDataChange({ height: e.target.value })}
                  placeholder="12"
                />
              </div>
            </div>
          </div>

          {/* Structure Properties */}
          <div>
            <h3 className="text-lg font-playfair font-semibold cabin-text mb-4">Structure Properties</h3>
            
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium cabin-text">Foundation Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select foundation type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concrete-slab">Concrete Slab</SelectItem>
                    <SelectItem value="pier-foundation">Pier Foundation</SelectItem>
                    <SelectItem value="crawl-space">Crawl Space</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm font-medium cabin-text">Wall Material</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select wall material" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2x6-wood">2x6 Wood Frame</SelectItem>
                    <SelectItem value="2x8-wood">2x8 Wood Frame</SelectItem>
                    <SelectItem value="log">Log Construction</SelectItem>
                    <SelectItem value="steel">Steel Frame</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm font-medium cabin-text">Roofing</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select roofing material" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metal">Metal Roofing</SelectItem>
                    <SelectItem value="asphalt">Asphalt Shingles</SelectItem>
                    <SelectItem value="cedar">Cedar Shakes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <Card className="bg-cabin-cream bg-opacity-50">
            <CardContent className="p-4">
              <h4 className="font-medium cabin-text mb-3">Cost Estimate</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Foundation</span>
                  <span className="font-medium">$2,800</span>
                </div>
                <div className="flex justify-between">
                  <span>Framing</span>
                  <span className="font-medium">$4,200</span>
                </div>
                <div className="flex justify-between">
                  <span>Roofing</span>
                  <span className="font-medium">$3,100</span>
                </div>
                <div className="flex justify-between">
                  <span>Siding</span>
                  <span className="font-medium">$2,900</span>
                </div>
                <div className="flex justify-between">
                  <span>Windows/Doors</span>
                  <span className="font-medium">$2,800</span>
                </div>
                <div className="flex justify-between">
                  <span>Interior</span>
                  <span className="font-medium">$2,700</span>
                </div>
                <div className="border-t border-cabin-brown pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="cabin-brown">$18,500</span>
                </div>
              </div>
              
              <Button 
                onClick={onOpenMaterialLibrary}
                variant="outline" 
                className="w-full mt-4"
              >
                View Materials
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Build Timeline */}
          <div>
            <h3 className="text-lg font-playfair font-semibold cabin-text mb-4">Build Timeline</h3>
            <div className="space-y-3">
              {mockConstructionPhases.map((phase, index) => (
                <div
                  key={index}
                  className={`construction-phase p-3 rounded-lg border-l-4 ${getStatusColor(phase.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{phase.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {getStatusIcon(phase.status)} {phase.status === 'ready' ? 'Ready' : 
                       phase.status === 'moderate' ? 'Moderate' :
                       phase.status === 'professional' ? 'Professional' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="text-xs opacity-75 mt-1">{phase.days} days</div>
                </div>
              ))}
            </div>
            
            <Button 
              onClick={onOpenBuildGuide}
              className="w-full mt-4 bg-cabin-brown hover:bg-cabin-brown/90 text-white"
            >
              View Complete Build Guide
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
