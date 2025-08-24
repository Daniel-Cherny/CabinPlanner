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
    
    // Create DOM structure safely without innerHTML
    const centerDiv = document.createElement('div');
    centerDiv.className = 'text-center';
    
    const iconDiv = document.createElement('div');
    iconDiv.className = 'text-4xl mb-4';
    iconDiv.textContent = '🏠';
    
    const titleP = document.createElement('p');
    titleP.className = 'cabin-text font-medium text-lg mb-2';
    titleP.textContent = '3D Visualization';
    
    const subtitleP = document.createElement('p');
    subtitleP.className = 'text-sm cabin-text opacity-75 mb-4';
    subtitleP.textContent = 'Three.js integration coming soon';
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'text-sm cabin-text';
    
    const projectP = document.createElement('p');
    projectP.textContent = `Project: ${projectData?.name || 'Untitled'}`;
    
    const sizeP = document.createElement('p');
    sizeP.textContent = `Size: ${projectData?.width || '24'}'×${projectData?.length || '16'}'`;
    
    // Assemble the DOM structure
    infoDiv.appendChild(projectP);
    infoDiv.appendChild(sizeP);
    centerDiv.appendChild(iconDiv);
    centerDiv.appendChild(titleP);
    centerDiv.appendChild(subtitleP);
    centerDiv.appendChild(infoDiv);
    placeholder.appendChild(centerDiv);

    mountRef.current.appendChild(placeholder);

    return () => {
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
    };
  }, [projectData]);

  return <div ref={mountRef} className="w-full h-full" />;
}
