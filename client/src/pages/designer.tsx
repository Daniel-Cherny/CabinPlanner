import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/ui/navigation";
import { ProfessionalDesignInterface } from "@/components/design/ProfessionalDesignInterface";
import { BuildGuideModal } from "@/components/modals/BuildGuideModal";
import { MaterialLibraryModal } from "@/components/modals/MaterialLibraryModal";
import { CabinWizard } from "@/components/design/CabinWizard";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import type { Project, Template } from "@shared/schema";

export default function Designer() {
  const { projectId } = useParams<{ projectId: string }>();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [buildGuideOpen, setBuildGuideOpen] = useState(false);
  const [materialLibraryOpen, setMaterialLibraryOpen] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [projectData, setProjectData] = useState<any>(null);

  // Get template ID from query params for new projects
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const templateId = urlParams.get('template');

  // Redirect to login if not authenticated - DISABLED FOR DEMO
  useEffect(() => {
    // Authentication check disabled for demo
    // if (!isLoading && !isAuthenticated) {
    //   toast({
    //     title: "Unauthorized",
    //     description: "You are logged out. Logging in again...",
    //     variant: "destructive",
    //   });
    //   setTimeout(() => {
    //     window.location.href = "/api/login";
    //   }, 500);
    //   return;
    // }
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

  // Authentication check disabled for demo
  // if (isLoading || !isAuthenticated) {
  //   return <div>Loading...</div>;
  // }

  if (projectId && projectLoading) {
    return <div>Loading project...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <Navigation />
      
      {/* Professional Design Interface */}
      <div className="flex-1 overflow-hidden">
        <ProfessionalDesignInterface
          projectData={projectData}
          onProjectDataChange={handleProjectDataChange}
        />
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
