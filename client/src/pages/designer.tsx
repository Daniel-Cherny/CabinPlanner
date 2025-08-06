import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/ui/navigation";
import { DesignToolbar } from "@/components/design/DesignToolbar";
import { DesignCanvas } from "@/components/design/DesignCanvas";
import { PropertiesPanel } from "@/components/design/PropertiesPanel";
import { BuildGuideModal } from "@/components/modals/BuildGuideModal";
import { MaterialLibraryModal } from "@/components/modals/MaterialLibraryModal";
import { CabinWizard } from "@/components/design/CabinWizard";
import { Button } from "@/components/ui/button";
import { Undo, Redo, Grid3X3, Eye, Save, Wand2 } from "lucide-react";
import type { Project, Template } from "@shared/schema";

export default function Designer() {
  const { projectId } = useParams<{ projectId: string }>();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [selectedTool, setSelectedTool] = useState<string>('walls');
  const [buildGuideOpen, setBuildGuideOpen] = useState(false);
  const [materialLibraryOpen, setMaterialLibraryOpen] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [projectData, setProjectData] = useState<any>(null);

  // Get template ID from query params for new projects
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const templateId = urlParams.get('template');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Load existing project
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId && isAuthenticated,
    retry: false,
  });

  // Load template for new projects
  const { data: template } = useQuery({
    queryKey: ["/api/templates", templateId],
    enabled: !!templateId && !projectId && isAuthenticated,
    retry: false,
  });

  // Load templates for toolbar
  const { data: templates } = useQuery({
    queryKey: ["/api/templates"],
    retry: false,
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: any) => {
      const response = await apiRequest("POST", "/api/projects", projectData);
      return response.json();
    },
    onSuccess: (newProject) => {
      toast({
        title: "Success",
        description: "Project created successfully!",
      });
      navigate(`/designer/${newProject.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const response = await apiRequest("PUT", `/api/projects/${projectId}`, updatedData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Project saved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save project. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Initialize project data
  useEffect(() => {
    if (project) {
      setProjectData(project);
    } else if (template && !projectId) {
      setProjectData({
        name: `${template.name} Project`,
        description: `New ${template.name} cabin design`,
        templateId: template.id,
        width: template.defaultWidth,
        length: template.defaultLength,
        height: template.defaultHeight,
        area: template.defaultWidth && template.defaultLength 
          ? Number(template.defaultWidth) * Number(template.defaultLength) 
          : null,
        estimatedCost: template.basePrice,
        designData: template.designData || {},
        buildProgress: {},
      });
    } else if (!projectId && !templateId) {
      // Show wizard for completely new projects (no template or project ID)
      setShowWizard(true);
    }
  }, [project, template, projectId, templateId]);

  const handleSaveProject = () => {
    if (!projectData) return;

    if (projectId) {
      updateProjectMutation.mutate(projectData);
    } else {
      createProjectMutation.mutate(projectData);
    }
  };

  const handleProjectDataChange = (updates: any) => {
    setProjectData((prev: any) => ({ ...prev, ...updates }));
  };

  if (isLoading || !isAuthenticated) {
    return <div>Loading...</div>;
  }

  if (projectId && projectLoading) {
    return <div>Loading project...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-cabin-cream">
      <Navigation />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Design Tools */}
        <div className="w-80 bg-white shadow-lg border-r border-gray-200 overflow-y-auto">
          <DesignToolbar
            selectedTool={selectedTool}
            onToolSelect={setSelectedTool}
            templates={templates || []}
            onTemplateSelect={(template: Template) => {
              handleProjectDataChange({
                templateId: template.id,
                name: `${template.name} Project`,
                width: template.defaultWidth,
                length: template.defaultLength,
                height: template.defaultHeight,
                designData: template.designData || {},
              });
            }}
            projectData={projectData}
            onOpenMaterialLibrary={() => setMaterialLibraryOpen(true)}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Canvas Toolbar */}
          <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === '2d' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('2d')}
                  className={viewMode === '2d' ? 'bg-cabin-brown text-white' : ''}
                >
                  2D Plan
                </Button>
                <Button
                  variant={viewMode === '3d' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('3d')}
                  className={viewMode === '3d' ? 'bg-cabin-brown text-white' : ''}
                >
                  3D View
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  <Undo className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Redo className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Grid3X3 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm cabin-text">
                Grid: 1ft
              </div>
              <Button
                onClick={() => setShowWizard(true)}
                variant="outline"
                size="sm"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Cabin Wizard
              </Button>
              <Button
                onClick={handleSaveProject}
                disabled={createProjectMutation.isPending || updateProjectMutation.isPending}
                variant="outline"
                size="sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {createProjectMutation.isPending || updateProjectMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button
                onClick={() => setBuildGuideOpen(true)}
                className="bg-cabin-green hover:bg-cabin-green/90 text-white"
                size="sm"
              >
                Build Guide
              </Button>
            </div>
          </div>

          {/* Design Canvas */}
          <div className="flex-1">
            <DesignCanvas
              viewMode={viewMode}
              selectedTool={selectedTool}
              projectData={projectData}
              onProjectDataChange={handleProjectDataChange}
            />
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div className="w-96 bg-white shadow-lg border-l border-gray-200 overflow-y-auto">
          <PropertiesPanel
            projectData={projectData}
            onProjectDataChange={handleProjectDataChange}
            onOpenBuildGuide={() => setBuildGuideOpen(true)}
            onOpenMaterialLibrary={() => setMaterialLibraryOpen(true)}
          />
        </div>
      </div>

      {/* Modals */}
      <BuildGuideModal
        open={buildGuideOpen}
        onOpenChange={setBuildGuideOpen}
        projectData={projectData}
      />

      <MaterialLibraryModal
        open={materialLibraryOpen}
        onOpenChange={setMaterialLibraryOpen}
        projectId={projectId}
      />

      {/* Cabin Wizard */}
      {showWizard && (
        <CabinWizard
          templates={templates || []}
          onComplete={(config) => {
            setProjectData({
              name: config.name,
              description: config.name,
              templateId: config.templateId,
              width: config.width,
              length: config.length,
              height: config.height,
              area: Number(config.width) * Number(config.length),
              estimatedCost: null,
              designData: config.designData || {},
              buildProgress: {},
            });
            setShowWizard(false);
            
            toast({
              title: "Cabin Configured!",
              description: "Your cabin design is ready. You can now customize it further.",
            });
          }}
          onCancel={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}
