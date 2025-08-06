import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigation } from "@/components/ui/navigation";
import { Plus, Home, Calendar, DollarSign, Eye } from "lucide-react";
import type { Project, Template } from "@shared/schema";

export default function HomePage() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();

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

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    retry: false,
    enabled: isAuthenticated,
  });

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/templates"],
    retry: false,
  });

  if (isLoading || !isAuthenticated) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-cabin-cream">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-playfair font-bold cabin-text mb-2">
            Welcome back, {user?.firstName || 'Builder'}!
          </h1>
          <p className="text-muted-foreground">
            Continue designing your dream cabin or start a new project.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Link href="/designer">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-cabin-brown/20 hover:border-cabin-brown/40">
              <CardContent className="p-6 text-center">
                <Plus className="w-12 h-12 cabin-brown mx-auto mb-4" />
                <h3 className="text-lg font-semibold cabin-text mb-2">New Project</h3>
                <p className="text-sm text-muted-foreground">Start designing from scratch or use a template</p>
              </CardContent>
            </Card>
          </Link>

          <Card className="border-2 border-cabin-green/20">
            <CardContent className="p-6 text-center">
              <Home className="w-12 h-12 cabin-green mx-auto mb-4" />
              <h3 className="text-lg font-semibold cabin-text mb-2">
                {projects?.length || 0} Projects
              </h3>
              <p className="text-sm text-muted-foreground">Your saved cabin designs</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-cabin-gold/20">
            <CardContent className="p-6 text-center">
              <Calendar className="w-12 h-12 cabin-gold mx-auto mb-4" />
              <h3 className="text-lg font-semibold cabin-text mb-2">Build Ready</h3>
              <p className="text-sm text-muted-foreground">Projects with complete plans</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Projects */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-playfair font-semibold cabin-text">Your Projects</h2>
              <Link href="/designer">
                <Button className="bg-cabin-brown hover:bg-cabin-brown/90">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </Link>
            </div>

            {projectsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-4 w-1/3 mb-2" />
                      <Skeleton className="h-3 w-full mb-4" />
                      <div className="flex space-x-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : projects && projects.length > 0 ? (
              <div className="space-y-4">
                {projects.map((project: Project) => (
                  <Card key={project.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold cabin-text mb-2">{project.name}</h3>
                          <p className="text-sm text-muted-foreground">{project.description}</p>
                        </div>
                        <Link href={`/designer/${project.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            Open
                          </Button>
                        </Link>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-muted-foreground">Size</p>
                          <p className="font-medium cabin-text">
                            {project.width}' × {project.length}'
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Area</p>
                          <p className="font-medium cabin-text">{project.area} sq ft</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Est. Cost</p>
                          <p className="font-medium cabin-green">
                            ${project.estimatedCost ? Number(project.estimatedCost).toLocaleString() : 'TBD'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Updated</p>
                          <p className="font-medium cabin-text">
                            {new Date(project.updatedAt!).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          Design Phase
                        </Badge>
                        {project.estimatedCost && (
                          <Badge variant="outline" className="text-xs cabin-green">
                            Costed
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Home className="w-16 h-16 cabin-brown/30 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold cabin-text mb-2">No projects yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Start your first cabin design project to see it here.
                  </p>
                  <Link href="/designer">
                    <Button className="bg-cabin-brown hover:bg-cabin-brown/90">
                      Create Your First Project
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Template Gallery */}
          <div>
            <h2 className="text-2xl font-playfair font-semibold cabin-text mb-6">
              Popular Templates
            </h2>

            {templatesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <Skeleton className="h-32 w-full" />
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-3 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : templates && templates.length > 0 ? (
              <div className="space-y-4">
                {templates.slice(0, 4).map((template: Template) => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <div 
                      className="h-32 bg-cover bg-center"
                      style={{ 
                        backgroundImage: template.imageUrl 
                          ? `url(${template.imageUrl})` 
                          : 'linear-gradient(135deg, var(--cabin-brown) 0%, var(--cabin-gold) 100%)'
                      }}
                    />
                    <CardContent className="p-4">
                      <h3 className="font-semibold cabin-text mb-1">{template.name}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{template.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="cabin-green font-medium">
                          {template.defaultWidth}' × {template.defaultLength}'
                        </span>
                        <Link href={`/designer?template=${template.id}`}>
                          <Button size="sm" variant="outline" className="text-xs">
                            Use Template
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No templates available</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
