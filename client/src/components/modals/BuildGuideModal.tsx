import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Play, Download, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface BuildGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectData: any;
}

export function BuildGuideModal({ open, onOpenChange, projectData }: BuildGuideModalProps) {
  const [selectedPhase, setSelectedPhase] = useState(0);

  const buildPhases = [
    {
      id: 1,
      name: "Foundation",
      description: "Prepare site & pour concrete",
      status: "completed",
      duration: "3-5 days",
      skillLevel: "Beginner",
      steps: [
        {
          title: "Site Preparation",
          description: "Clear and level the building site. Mark the foundation perimeter using stakes and string.",
          tools: "Shovel, level, measuring tape, stakes, string line",
          completed: true
        },
        {
          title: "Excavation", 
          description: "Dig foundation to required depth (typically 6-8 inches for slab). Ensure proper drainage.",
          safety: "Call 811 before digging to mark underground utilities",
          completed: true
        },
        {
          title: "Concrete Pour",
          description: "Pour and level concrete slab. Allow proper curing time (minimum 48 hours).",
          tools: "Concrete mixer, trowel, float, level",
          completed: true
        }
      ]
    },
    {
      id: 2,
      name: "Framing",
      description: "Build wall frames",
      status: "in-progress",
      duration: "5-7 days", 
      skillLevel: "Intermediate",
      steps: [
        {
          title: "Floor Platform",
          description: "Construct the floor platform using pressure-treated lumber and plywood subfloor.",
          tools: "Circular saw, drill, level, measuring tape",
          completed: false
        },
        {
          title: "Wall Framing",
          description: "Frame exterior and interior walls according to plans. Include rough openings for doors and windows.",
          tools: "Framing hammer, circular saw, speed square",
          completed: false
        }
      ]
    },
    {
      id: 3,
      name: "Roofing",
      description: "Install roof structure",
      status: "locked",
      duration: "3-4 days",
      skillLevel: "Intermediate", 
      steps: []
    },
    {
      id: 4,
      name: "Electrical",
      description: "Wiring & outlets",
      status: "locked",
      duration: "2-3 days",
      skillLevel: "Professional",
      steps: []
    }
  ];

  const currentPhase = buildPhases[selectedPhase];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-cabin-green text-white';
      case 'in-progress': return 'bg-cabin-gold text-white';
      case 'locked': return 'bg-gray-100 text-gray-400';
      default: return 'bg-gray-100 text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <Check className="w-4 h-4" />;
      case 'in-progress': return <div className="w-2 h-2 bg-white rounded-full animate-pulse" />;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-playfair text-xl cabin-text">
            Build Guide - {projectData?.name || 'Your Cabin'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex h-full">
          {/* Build Steps Navigation */}
          <div className="w-80 bg-cabin-stone bg-opacity-5 border-r border-gray-200 overflow-y-auto">
            <div className="p-6">
              <div className="space-y-2">
                {buildPhases.map((phase, index) => (
                  <div
                    key={phase.id}
                    onClick={() => phase.status !== 'locked' && setSelectedPhase(index)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedPhase === index 
                        ? getStatusColor(phase.status)
                        : phase.status === 'locked' 
                          ? 'bg-gray-50 cursor-not-allowed' 
                          : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${
                        selectedPhase === index 
                          ? 'text-white' 
                          : phase.status === 'locked' 
                            ? 'text-gray-400' 
                            : 'cabin-text'
                      }`}>
                        {phase.id}. {phase.name}
                      </span>
                      {getStatusIcon(phase.status)}
                    </div>
                    <div className={`text-sm mt-1 ${
                      selectedPhase === index 
                        ? 'text-white opacity-90' 
                        : phase.status === 'locked' 
                          ? 'text-gray-400' 
                          : 'cabin-text opacity-75'
                    }`}>
                      {phase.description}
                    </div>
                    {phase.status === 'locked' && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        Locked
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Build Instructions Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-8">
              <div className="mb-6">
                <h3 className="text-2xl font-playfair font-semibold cabin-text mb-2">
                  {currentPhase.name} Phase
                </h3>
                <div className="flex items-center space-x-4 text-sm cabin-text">
                  <Badge 
                    variant={currentPhase.status === 'completed' ? 'default' : 'outline'}
                    className={
                      currentPhase.status === 'completed' 
                        ? 'bg-cabin-green text-white' 
                        : currentPhase.status === 'in-progress'
                          ? 'bg-cabin-gold text-white'
                          : ''
                    }
                  >
                    {currentPhase.status === 'completed' && <Check className="w-3 h-3 mr-1" />}
                    {currentPhase.status === 'completed' ? 'Completed' : 
                     currentPhase.status === 'in-progress' ? 'In Progress' : 'Locked'}
                  </Badge>
                  <span>Duration: {currentPhase.duration}</span>
                  <span>Skill Level: {currentPhase.skillLevel}</span>
                </div>
              </div>
              
              {/* 3D Visualization Placeholder */}
              <div className="bg-gray-100 rounded-lg p-8 mb-6 text-center">
                <div className="w-full h-64 bg-gradient-to-b from-blue-100 to-green-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-4">🏗️</div>
                    <p className="cabin-text font-medium">3D {currentPhase.name} Animation</p>
                    <p className="text-sm cabin-text opacity-75">Interactive step-by-step visualization</p>
                  </div>
                </div>
              </div>
              
              {/* Step-by-Step Instructions */}
              <div className="space-y-6">
                {currentPhase.steps.map((step, index) => (
                  <Card key={index} className="border border-gray-200">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          step.completed ? 'bg-cabin-green text-white' : 'bg-cabin-brown text-white'
                        }`}>
                          {step.completed ? <Check className="w-4 h-4" /> : index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold cabin-text mb-2">{step.title}</h4>
                          <p className="cabin-text mb-3">{step.description}</p>
                          
                          {step.tools && (
                            <div className="bg-cabin-cream bg-opacity-50 p-3 rounded text-sm mb-3">
                              <strong>Tools needed:</strong> {step.tools}
                            </div>
                          )}
                          
                          {step.safety && (
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 text-sm mb-3">
                              <div className="flex items-start">
                                <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                                <div>
                                  <strong className="text-yellow-800">Safety Note:</strong> {step.safety}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex space-x-3">
                            <Button size="sm" variant="outline" className="bg-cabin-gold text-white border-cabin-gold hover:bg-cabin-gold/90">
                              <Play className="w-3 h-3 mr-2" />
                              Watch Video
                            </Button>
                            <Button size="sm" variant="outline">
                              <Download className="w-3 h-3 mr-2" />
                              Download PDF
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Progress Tracking */}
              {currentPhase.steps.length > 0 && (
                <Card className="bg-cabin-green bg-opacity-10 mt-8">
                  <CardContent className="p-6">
                    <h4 className="font-semibold cabin-text mb-4">Phase Progress</h4>
                    
                    <div className="mb-4">
                      <div className="flex justify-between text-sm cabin-text mb-2">
                        <span>Completed Steps</span>
                        <span>{currentPhase.steps.filter(s => s.completed).length} / {currentPhase.steps.length}</span>
                      </div>
                      <Progress 
                        value={(currentPhase.steps.filter(s => s.completed).length / currentPhase.steps.length) * 100}
                        className="h-2"
                      />
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      {currentPhase.steps.map((step, index) => (
                        <div key={index} className="flex items-center">
                          <input 
                            type="checkbox" 
                            checked={step.completed}
                            readOnly
                            className="mr-3 text-cabin-green rounded"
                          />
                          <span className={`text-sm ${step.completed ? 'cabin-text line-through opacity-75' : 'cabin-text'}`}>
                            {step.title}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      className="w-full bg-cabin-brown hover:bg-cabin-brown/90 text-white"
                      disabled={selectedPhase >= buildPhases.length - 1}
                      onClick={() => setSelectedPhase(prev => Math.min(prev + 1, buildPhases.length - 1))}
                    >
                      Continue to Next Phase
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
