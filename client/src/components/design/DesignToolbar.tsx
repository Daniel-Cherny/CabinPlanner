import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  SquareIcon, 
  DoorOpen, 
  Square, 
  Sofa,
  Palette,
  Package
} from "lucide-react";
import type { Template } from "@shared/schema";

interface DesignToolbarProps {
  selectedTool: string;
  onToolSelect: (tool: string) => void;
  templates: Template[];
  onTemplateSelect: (template: Template) => void;
  projectData: any;
  onOpenMaterialLibrary: () => void;
}

export function DesignToolbar({ 
  selectedTool, 
  onToolSelect, 
  templates, 
  onTemplateSelect, 
  projectData,
  onOpenMaterialLibrary 
}: DesignToolbarProps) {
  const tools = [
    { id: 'walls', name: 'Walls', icon: SquareIcon },
    { id: 'doors', name: 'Doors', icon: DoorOpen },
    { id: 'windows', name: 'Windows', icon: Square },
    { id: 'furniture', name: 'Furniture', icon: Sofa },
  ];

  return (
    <div className="p-6">
      <h2 className="text-lg font-playfair font-semibold cabin-text mb-4">Design Tools</h2>
      
      {/* Template Selection */}
      <div className="mb-6">
        <h3 className="text-sm font-medium cabin-text mb-3">Quick Start Templates</h3>
        <div className="grid grid-cols-2 gap-3">
          {templates.slice(0, 4).map((template) => (
            <div
              key={template.id}
              onClick={() => onTemplateSelect(template)}
              className="bg-cabin-cream p-3 rounded-lg hover:bg-cabin-gold hover:bg-opacity-20 cursor-pointer transition-colors"
            >
              <div 
                className="w-full h-16 rounded mb-2 bg-cover bg-center"
                style={{
                  backgroundImage: template.imageUrl 
                    ? `url(${template.imageUrl})` 
                    : 'linear-gradient(135deg, var(--cabin-brown) 0%, var(--cabin-gold) 100%)'
                }}
              />
              <p className="text-xs font-medium cabin-text">{template.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Design Tools */}
      <div className="mb-6">
        <h3 className="text-sm font-medium cabin-text mb-3">Design Elements</h3>
        <div className="space-y-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isSelected = selectedTool === tool.id;
            
            return (
              <Button
                key={tool.id}
                onClick={() => onToolSelect(tool.id)}
                variant={isSelected ? 'default' : 'outline'}
                className={`w-full justify-start ${
                  isSelected 
                    ? 'bg-cabin-brown text-white hover:bg-cabin-brown/90' 
                    : 'text-cabin-text hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 mr-3" />
                {tool.name}
              </Button>
            );
          })}
          
          <Button
            onClick={onOpenMaterialLibrary}
            variant="outline"
            className="w-full justify-start text-cabin-text hover:bg-gray-100"
          >
            <Package className="w-4 h-4 mr-3" />
            Materials
          </Button>
        </div>
      </div>

      {/* Current Project Info */}
      {projectData && (
        <Card className="bg-cabin-stone bg-opacity-10">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium cabin-text mb-2">Current Project</h3>
            <p className="text-xs cabin-text opacity-75 mb-2">{projectData.name}</p>
            <div className="text-xs cabin-text space-y-1">
              <p>Size: {projectData.width}' × {projectData.length}'</p>
              <p>Area: {projectData.area} sq ft</p>
              <p>Est. Cost: ${projectData.estimatedCost ? Number(projectData.estimatedCost).toLocaleString() : 'TBD'}</p>
            </div>
            
            {projectData.templateId && (
              <Badge variant="secondary" className="mt-2 text-xs">
                Template Based
              </Badge>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
