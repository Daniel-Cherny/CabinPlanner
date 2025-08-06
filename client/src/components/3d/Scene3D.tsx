import { useRef, useEffect } from "react";

interface Scene3DProps {
  projectData: any;
}

export function Scene3D({ projectData }: Scene3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // TODO: Implement Three.js scene
    // This is a placeholder for the 3D visualization
    // In a real implementation, you would:
    // 1. Initialize Three.js scene, camera, and renderer
    // 2. Create 3D models based on projectData
    // 3. Add lighting and materials
    // 4. Enable camera controls for navigation
    // 5. Update scene when projectData changes

    const placeholder = document.createElement('div');
    placeholder.className = 'w-full h-full bg-gradient-to-b from-blue-100 to-green-100 flex items-center justify-center';
    placeholder.innerHTML = `
      <div class="text-center">
        <div class="text-4xl mb-4">🏠</div>
        <p class="cabin-text font-medium text-lg mb-2">3D Visualization</p>
        <p class="text-sm cabin-text opacity-75 mb-4">Three.js integration coming soon</p>
        <div class="text-sm cabin-text">
          <p>Project: ${projectData?.name || 'Untitled'}</p>
          <p>Size: ${projectData?.width || '24'}'×${projectData?.length || '16'}'</p>
        </div>
      </div>
    `;

    mountRef.current.appendChild(placeholder);

    return () => {
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
    };
  }, [projectData]);

  return <div ref={mountRef} className="w-full h-full" />;
}
