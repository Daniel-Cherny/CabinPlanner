import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Hammer, TreePine, Mountain } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-cabin-cream">
      {/* Navigation */}
      <nav className="bg-white shadow-lg border-b-2 border-cabin-brown">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Home className="text-2xl text-cabin-brown mr-3" />
              <h1 className="text-xl font-playfair font-semibold cabin-text">DreamCabin</h1>
            </div>
            <Button 
              onClick={() => window.location.href = "/api/login"} 
              className="bg-cabin-brown hover:bg-cabin-brown/90 text-white"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-playfair font-bold cabin-text mb-6">
            Design & Build Your
            <span className="cabin-brown"> Dream Cabin</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            From 2D floor plans to 3D visualization, complete with step-by-step construction guides. 
            Turn your cabin dreams into reality with professional tools and expert guidance.
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.href = "/api/login"}
            className="bg-cabin-brown hover:bg-cabin-brown/90 text-white px-8 py-4 text-lg"
          >
            Start Designing Now
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-playfair font-bold text-center cabin-text mb-12">
            Everything You Need to Build Your Cabin
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 border-cabin-brown/20 hover:border-cabin-brown/40 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-cabin-brown/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Home className="w-8 h-8 cabin-brown" />
                </div>
                <h3 className="text-xl font-semibold cabin-text mb-3">Interactive Design</h3>
                <p className="text-muted-foreground">
                  Create detailed floor plans with our drag-and-drop editor. Switch between 2D and 3D views instantly.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-cabin-brown/20 hover:border-cabin-brown/40 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-cabin-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Hammer className="w-8 h-8 cabin-green" />
                </div>
                <h3 className="text-xl font-semibold cabin-text mb-3">Step-by-Step Guides</h3>
                <p className="text-muted-foreground">
                  Get detailed construction instructions with 3D animations, tool lists, and safety guidelines.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-cabin-brown/20 hover:border-cabin-brown/40 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-cabin-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TreePine className="w-8 h-8 cabin-gold" />
                </div>
                <h3 className="text-xl font-semibold cabin-text mb-3">Material Planning</h3>
                <p className="text-muted-foreground">
                  Automatic material lists with cost estimates and supplier connections for your entire build.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Template Preview */}
      <section className="py-16 px-4 bg-cabin-cream">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-playfair font-bold text-center cabin-text mb-12">
            Start with Professional Templates
          </h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { name: "A-Frame", image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" },
              { name: "Tiny House", image: "https://images.unsplash.com/photo-1542621334-a254cf47733d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" },
              { name: "Log Cabin", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" },
              { name: "Modern", image: "https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" }
            ].map((template) => (
              <Card key={template.name} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <img 
                  src={template.image} 
                  alt={template.name}
                  className="w-full h-48 object-cover"
                />
                <CardContent className="p-4">
                  <h3 className="font-semibold cabin-text text-center">{template.name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-cabin-brown text-white">
        <div className="max-w-4xl mx-auto text-center">
          <Mountain className="w-16 h-16 mx-auto mb-6 opacity-80" />
          <h2 className="text-4xl font-playfair font-bold mb-6">
            Ready to Build Your Retreat?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of builders who have turned their cabin dreams into reality with DreamCabin.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = "/api/login"}
            className="bg-white text-cabin-brown hover:bg-gray-100 px-8 py-4 text-lg"
          >
            Start Your Project Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-cabin-stone text-white py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center mb-6">
            <Home className="text-2xl mr-3" />
            <h3 className="text-xl font-playfair font-semibold">DreamCabin</h3>
          </div>
          <p className="text-gray-300 mb-4">
            Professional cabin design and construction planning tools for builders of all skill levels.
          </p>
          <p className="text-gray-400 text-sm">
            © 2024 DreamCabin. Built for the cabin building community.
          </p>
        </div>
      </footer>
    </div>
  );
}
