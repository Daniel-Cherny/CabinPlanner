import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, ShoppingCart, Download, MapPin } from "lucide-react";
import type { Material, MaterialCategory } from "@shared/schema";

interface MaterialLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
}

export function MaterialLibraryModal({ open, onOpenChange, projectId }: MaterialLibraryModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('structural');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: categories } = useQuery({
    queryKey: ["/api/materials/categories"],
    retry: false,
  });

  const { data: materials } = useQuery({
    queryKey: ["/api/materials", { categoryId: selectedCategory }],
    retry: false,
  });

  // Mock material data for demonstration
  const mockCategories = [
    { id: 'structural', name: 'Structural', description: 'Framing and foundation materials' },
    { id: 'roofing', name: 'Roofing', description: 'Roof materials and components' },
    { id: 'siding', name: 'Siding', description: 'Exterior wall materials' },
    { id: 'insulation', name: 'Insulation', description: 'Thermal insulation materials' },
    { id: 'windows', name: 'Windows', description: 'Windows and glazing' },
    { id: 'doors', name: 'Doors', description: 'Doors and hardware' },
    { id: 'interior', name: 'Interior', description: 'Interior finishing materials' },
  ];

  const mockMaterials = [
    {
      id: '1',
      name: 'Pressure Treated 2x6',
      description: 'High-quality lumber for framing',
      unit: 'board',
      pricePerUnit: '8.50',
      imageUrl: 'https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
      quantityNeeded: 24
    },
    {
      id: '2', 
      name: '2x8 Floor Joists',
      description: 'Strong support for flooring',
      unit: 'board',
      pricePerUnit: '12.75',
      imageUrl: 'https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
      quantityNeeded: 16
    },
    {
      id: '3',
      name: 'OSB Sheathing',
      description: 'Structural wall sheathing',
      unit: 'sheet',
      pricePerUnit: '32.00',
      imageUrl: 'https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
      quantityNeeded: 18
    },
    {
      id: '4',
      name: 'Concrete Mix',
      description: 'Foundation concrete',
      unit: 'bag',
      pricePerUnit: '4.25',
      imageUrl: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
      quantityNeeded: 45
    },
    {
      id: '5',
      name: 'Metal Roofing',
      description: 'Corrugated steel panels',
      unit: 'sq ft',
      pricePerUnit: '3.85',
      imageUrl: 'https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
      quantityNeeded: 520
    },
    {
      id: '6',
      name: 'Fastener Kit',
      description: 'Screws, nails & hardware',
      unit: 'kit',
      pricePerUnit: '285.00',
      imageUrl: 'https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
      quantityNeeded: 1
    }
  ];

  const displayCategories = categories || mockCategories;
  const displayMaterials = materials || mockMaterials;

  const filteredMaterials = displayMaterials.filter((material: any) =>
    material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    material.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCost = filteredMaterials.reduce((sum: number, material: any) => 
    sum + (parseFloat(material.pricePerUnit) * (material.quantityNeeded || 1)), 0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-playfair text-xl cabin-text">Material Library</DialogTitle>
        </DialogHeader>
        
        <div className="flex h-full">
          {/* Material Categories */}
          <div className="w-64 bg-cabin-cream bg-opacity-30 border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search materials..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                {displayCategories.map((category: any) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'ghost'}
                    className={`w-full justify-start text-left p-3 h-auto ${
                      selectedCategory === category.id 
                        ? 'bg-cabin-brown text-white' 
                        : 'cabin-text hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <div>
                      <div className="font-medium">{category.name}</div>
                      {category.description && (
                        <div className="text-xs opacity-75">{category.description}</div>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Material Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold cabin-text">
                {displayCategories.find((c: any) => c.id === selectedCategory)?.name || 'Structural'} Materials
              </h3>
              <Badge variant="outline" className="cabin-text">
                {filteredMaterials.length} items
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-6 mb-8">
              {filteredMaterials.map((material: any) => (
                <Card key={material.id} className="border border-gray-200 hover:shadow-lg transition-shadow">
                  <div 
                    className="h-32 bg-cover bg-center"
                    style={{ backgroundImage: `url(${material.imageUrl})` }}
                  />
                  <CardContent className="p-4">
                    <h4 className="font-semibold cabin-text mb-2">{material.name}</h4>
                    <p className="text-sm cabin-text opacity-75 mb-2">{material.description}</p>
                    <div className="text-sm">
                      <p className="cabin-brown font-semibold">
                        ${material.pricePerUnit} per {material.unit}
                      </p>
                      <p className="text-xs cabin-text opacity-75">
                        Qty needed: {material.quantityNeeded} {material.unit}s
                      </p>
                      <p className="text-xs cabin-green font-medium mt-1">
                        Total: ${(parseFloat(material.pricePerUnit) * (material.quantityNeeded || 1)).toFixed(2)}
                      </p>
                    </div>
                    
                    <Button size="sm" variant="outline" className="w-full mt-3">
                      <ShoppingCart className="w-3 h-3 mr-2" />
                      Add to Project
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Material Summary */}
            <Card className="bg-cabin-stone bg-opacity-10">
              <CardContent className="p-6">
                <h4 className="font-semibold cabin-text mb-4">Selected Materials Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <p className="cabin-text opacity-75">Total Items: {filteredMaterials.length}</p>
                    <p className="cabin-text opacity-75">Categories: {displayCategories.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="cabin-brown font-semibold text-lg">${totalCost.toLocaleString()}</p>
                    <p className="text-xs cabin-text opacity-75">Materials only</p>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <Button variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Export Material List
                  </Button>
                  <Button className="flex-1 bg-cabin-green hover:bg-cabin-green/90 text-white">
                    <MapPin className="w-4 h-4 mr-2" />
                    Find Local Suppliers
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
