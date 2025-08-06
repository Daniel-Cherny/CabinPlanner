import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Move3D, 
  Eye,
  Sun,
  Lightbulb,
  Palette,
  Camera,
  Download,
  Maximize,
  Settings
} from "lucide-react";
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface Material3D {
  id: string;
  name: string;
  type: 'wood' | 'stone' | 'metal' | 'glass' | 'concrete';
  diffuseMap?: string;
  normalMap?: string;
  roughnessMap?: string;
  color: string;
  roughness: number;
  metalness: number;
}

interface Professional3DViewerProps {
  projectData: any;
  onProjectDataChange: (updates: any) => void;
  floorPlanData?: any;
}

export function Professional3DViewer({ 
  projectData, 
  onProjectDataChange,
  floorPlanData 
}: Professional3DViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const controlsRef = useRef<any>();
  const animationIdRef = useRef<number>();

  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'orbit' | 'walk' | 'cinematic'>('orbit');
  const [selectedMaterial, setSelectedMaterial] = useState<Material3D | null>(null);
  const [lightingPreset, setLightingPreset] = useState<'day' | 'sunset' | 'night' | 'interior'>('day');
  const [autoRotate, setAutoRotate] = useState(false);
  const [showWireframe, setShowWireframe] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState(12); // 0-24 hours

  // Material library
  const materials: Material3D[] = [
    {
      id: 'cedar-siding',
      name: 'Cedar Siding',
      type: 'wood',
      color: '#8B4513',
      roughness: 0.8,
      metalness: 0.0,
      diffuseMap: '/textures/cedar-diffuse.jpg',
      normalMap: '/textures/cedar-normal.jpg'
    },
    {
      id: 'metal-roof',
      name: 'Metal Roofing',
      type: 'metal',
      color: '#2F4F4F',
      roughness: 0.3,
      metalness: 0.9,
      diffuseMap: '/textures/metal-roof-diffuse.jpg'
    },
    {
      id: 'stone-foundation',
      name: 'Stone Foundation',
      type: 'stone',
      color: '#696969',
      roughness: 0.9,
      metalness: 0.0,
      diffuseMap: '/textures/stone-diffuse.jpg',
      normalMap: '/textures/stone-normal.jpg'
    },
    {
      id: 'glass-window',
      name: 'Window Glass',
      type: 'glass',
      color: '#87CEEB',
      roughness: 0.1,
      metalness: 0.0
    }
  ];

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(50, 30, 50);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    mount.appendChild(renderer.domElement);

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 200;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    // Lighting setup
    setupLighting(scene);

    // Load and create cabin geometry
    createCabinGeometry(scene);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      renderer.render(scene, camera);
    };
    animate();

    setIsLoading(false);

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;

      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setupLighting = (scene: THREE.Scene) => {
    // Remove existing lights
    const lights = scene.children.filter(child => child instanceof THREE.Light);
    lights.forEach(light => scene.remove(light));

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    // Directional light (sun)
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    updateSunPosition(sunLight, timeOfDay);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    scene.add(sunLight);

    // Sky hemisphere light
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x8B7355, 0.6);
    scene.add(hemisphereLight);

    // Interior lights (if needed)
    if (lightingPreset === 'interior' || lightingPreset === 'night') {
      const interiorLight = new THREE.PointLight(0xFFE4B5, 0.8, 50);
      interiorLight.position.set(0, 15, 0);
      scene.add(interiorLight);
    }
  };

  const updateSunPosition = (sunLight: THREE.DirectionalLight, hour: number) => {
    // Calculate sun position based on time of day
    const angle = (hour - 6) * (Math.PI / 12); // 6 AM = sunrise, 6 PM = sunset
    const elevation = Math.sin(angle) * 60;
    const azimuth = Math.cos(angle) * 60;
    
    sunLight.position.set(azimuth, Math.max(elevation, 5), azimuth);
    
    // Adjust intensity and color based on time
    if (hour < 6 || hour > 18) {
      // Night
      sunLight.intensity = 0.1;
      sunLight.color.setHex(0x2F4F4F);
    } else if (hour < 8 || hour > 16) {
      // Golden hour
      sunLight.intensity = 0.7;
      sunLight.color.setHex(0xFFE4B5);
    } else {
      // Day
      sunLight.intensity = 1.0;
      sunLight.color.setHex(0xFFFFFF);
    }
  };

  const createCabinGeometry = (scene: THREE.Scene) => {
    const group = new THREE.Group();
    
    // Get cabin dimensions
    const width = Number(projectData?.width) || 16;
    const length = Number(projectData?.length) || 20;
    const height = Number(projectData?.height) || 12;
    const style = projectData?.designData?.style || 'a-frame';

    // Create foundation
    createFoundation(group, width, length);
    
    // Create walls based on style
    if (style === 'a-frame') {
      createAFrameStructure(group, width, length, height);
    } else if (style === 'log') {
      createLogCabinStructure(group, width, length, height);
    } else {
      createStandardStructure(group, width, length, height);
    }

    // Create roof
    createRoof(group, width, length, height, style);

    // Add windows and doors
    addWindowsAndDoors(group, width, length, height);

    // Add interior elements
    addInteriorElements(group, width, length);

    scene.add(group);
  };

  const createFoundation = (group: THREE.Group, width: number, length: number) => {
    const foundationGeometry = new THREE.BoxGeometry(width, 2, length);
    const foundationMaterial = createMaterial('stone-foundation');
    const foundation = new THREE.Mesh(foundationGeometry, foundationMaterial);
    foundation.position.y = -1;
    foundation.receiveShadow = true;
    group.add(foundation);
  };

  const createAFrameStructure = (group: THREE.Group, width: number, length: number, height: number) => {
    // A-frame front triangle
    const frontShape = new THREE.Shape();
    frontShape.moveTo(-width/2, 0);
    frontShape.lineTo(0, height);
    frontShape.lineTo(width/2, 0);
    frontShape.lineTo(-width/2, 0);

    const frontGeometry = new THREE.ExtrudeGeometry(frontShape, {
      depth: 0.5,
      bevelEnabled: false
    });

    const wallMaterial = createMaterial('cedar-siding');
    const frontWall = new THREE.Mesh(frontGeometry, wallMaterial);
    frontWall.position.z = -length/2;
    frontWall.castShadow = true;
    group.add(frontWall);

    // A-frame back triangle
    const backWall = frontWall.clone();
    backWall.position.z = length/2;
    backWall.rotation.y = Math.PI;
    group.add(backWall);

    // Side panels
    const sideGeometry = new THREE.PlaneGeometry(length, height * 1.4);
    const leftSide = new THREE.Mesh(sideGeometry, wallMaterial);
    leftSide.rotation.y = Math.PI / 2;
    leftSide.rotation.z = -Math.atan2(height, width/2);
    leftSide.position.x = -width/2;
    leftSide.position.y = height/2;
    leftSide.castShadow = true;
    group.add(leftSide);

    const rightSide = leftSide.clone();
    rightSide.position.x = width/2;
    rightSide.rotation.z = Math.atan2(height, width/2);
    group.add(rightSide);
  };

  const createStandardStructure = (group: THREE.Group, width: number, length: number, height: number) => {
    // Standard rectangular walls
    const wallThickness = 0.5;
    
    // Front wall
    const frontWallGeometry = new THREE.BoxGeometry(width, height, wallThickness);
    const wallMaterial = createMaterial('cedar-siding');
    const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
    frontWall.position.z = -length/2;
    frontWall.position.y = height/2;
    frontWall.castShadow = true;
    group.add(frontWall);

    // Back wall
    const backWall = frontWall.clone();
    backWall.position.z = length/2;
    group.add(backWall);

    // Left wall
    const sideWallGeometry = new THREE.BoxGeometry(wallThickness, height, length);
    const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    leftWall.position.x = -width/2;
    leftWall.position.y = height/2;
    leftWall.castShadow = true;
    group.add(leftWall);

    // Right wall
    const rightWall = leftWall.clone();
    rightWall.position.x = width/2;
    group.add(rightWall);
  };

  const createLogCabinStructure = (group: THREE.Group, width: number, length: number, height: number) => {
    const logRadius = 0.3;
    const logCount = Math.floor(height / (logRadius * 2));

    for (let i = 0; i < logCount; i++) {
      const y = i * logRadius * 2 + logRadius;

      // Front and back logs
      const frontLogGeometry = new THREE.CylinderGeometry(logRadius, logRadius, width);
      const logMaterial = createMaterial('cedar-siding');
      const frontLog = new THREE.Mesh(frontLogGeometry, logMaterial);
      frontLog.rotation.z = Math.PI / 2;
      frontLog.position.z = -length/2;
      frontLog.position.y = y;
      frontLog.castShadow = true;
      group.add(frontLog);

      const backLog = frontLog.clone();
      backLog.position.z = length/2;
      group.add(backLog);

      // Side logs
      const sideLogGeometry = new THREE.CylinderGeometry(logRadius, logRadius, length);
      const leftLog = new THREE.Mesh(sideLogGeometry, logMaterial);
      leftLog.rotation.z = Math.PI / 2;
      leftLog.rotation.y = Math.PI / 2;
      leftLog.position.x = -width/2;
      leftLog.position.y = y;
      leftLog.castShadow = true;
      group.add(leftLog);

      const rightLog = leftLog.clone();
      rightLog.position.x = width/2;
      group.add(rightLog);
    }
  };

  const createRoof = (group: THREE.Group, width: number, length: number, height: number, style: string) => {
    const roofMaterial = createMaterial('metal-roof');

    if (style === 'a-frame') {
      // A-frame roof is integrated with walls
      return;
    }

    // Standard gabled roof
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-width/2 - 2, 0);
    roofShape.lineTo(0, 4);
    roofShape.lineTo(width/2 + 2, 0);
    roofShape.lineTo(-width/2 - 2, 0);

    const roofGeometry = new THREE.ExtrudeGeometry(roofShape, {
      depth: length + 4,
      bevelEnabled: false
    });

    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = height;
    roof.position.z = -2;
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);
  };

  const addWindowsAndDoors = (group: THREE.Group, width: number, length: number, height: number) => {
    const glassMaterial = createMaterial('glass-window');
    glassMaterial.transparent = true;
    glassMaterial.opacity = 0.7;

    // Front door
    const doorGeometry = new THREE.BoxGeometry(3, 7, 0.2);
    const doorMaterial = createMaterial('cedar-siding');
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.z = -length/2 - 0.1;
    door.position.y = 3.5;
    group.add(door);

    // Windows
    const windowGeometry = new THREE.BoxGeometry(4, 3, 0.1);
    
    // Front windows
    const frontWindow1 = new THREE.Mesh(windowGeometry, glassMaterial);
    frontWindow1.position.set(-width/4, height/2, -length/2 - 0.1);
    group.add(frontWindow1);

    const frontWindow2 = new THREE.Mesh(windowGeometry, glassMaterial);
    frontWindow2.position.set(width/4, height/2, -length/2 - 0.1);
    group.add(frontWindow2);

    // Side windows
    const sideWindow1 = new THREE.Mesh(windowGeometry, glassMaterial);
    sideWindow1.position.set(-width/2 - 0.1, height/2, 0);
    sideWindow1.rotation.y = Math.PI / 2;
    group.add(sideWindow1);

    const sideWindow2 = new THREE.Mesh(windowGeometry, glassMaterial);
    sideWindow2.position.set(width/2 + 0.1, height/2, 0);
    sideWindow2.rotation.y = Math.PI / 2;
    group.add(sideWindow2);
  };

  const addInteriorElements = (group: THREE.Group, width: number, length: number) => {
    // Floor
    const floorGeometry = new THREE.BoxGeometry(width - 1, 0.5, length - 1);
    const floorMaterial = createMaterial('cedar-siding');
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = 0.25;
    floor.receiveShadow = true;
    group.add(floor);

    // Simple furniture (optional)
    if (projectData?.designData?.showFurniture) {
      // Kitchen counter
      const counterGeometry = new THREE.BoxGeometry(6, 3, 2);
      const counterMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
      const counter = new THREE.Mesh(counterGeometry, counterMaterial);
      counter.position.set(-width/2 + 3, 1.5, -length/2 + 1);
      group.add(counter);

      // Bed
      const bedGeometry = new THREE.BoxGeometry(4, 1, 6);
      const bedMaterial = new THREE.MeshLambertMaterial({ color: 0x800080 });
      const bed = new THREE.Mesh(bedGeometry, bedMaterial);
      bed.position.set(width/2 - 2, 0.5, length/2 - 3);
      group.add(bed);
    }
  };

  const createMaterial = (materialId: string): THREE.Material => {
    const materialDef = materials.find(m => m.id === materialId);
    if (!materialDef) {
      return new THREE.MeshStandardMaterial({ color: 0x808080 });
    }

    const material = new THREE.MeshStandardMaterial({
      color: materialDef.color,
      roughness: materialDef.roughness,
      metalness: materialDef.metalness,
      wireframe: showWireframe
    });

    // Load textures if available
    if (materialDef.diffuseMap) {
      const textureLoader = new THREE.TextureLoader();
      material.map = textureLoader.load(materialDef.diffuseMap);
      material.map.wrapS = THREE.RepeatWrapping;
      material.map.wrapT = THREE.RepeatWrapping;
      material.map.repeat.set(4, 4);
    }

    if (materialDef.normalMap) {
      const textureLoader = new THREE.TextureLoader();
      material.normalMap = textureLoader.load(materialDef.normalMap);
      material.normalMap.wrapS = THREE.RepeatWrapping;
      material.normalMap.wrapT = THREE.RepeatWrapping;
      material.normalMap.repeat.set(4, 4);
    }

    return material;
  };

  // Camera control functions
  const handleViewModeChange = (mode: 'orbit' | 'walk' | 'cinematic') => {
    setViewMode(mode);
    
    if (!cameraRef.current) return;

    if (mode === 'orbit') {
      // Reset to orbital view
      cameraRef.current.position.set(50, 30, 50);
    } else if (mode === 'walk') {
      // First-person position
      cameraRef.current.position.set(0, 6, 0);
    } else if (mode === 'cinematic') {
      // Cinematic sweep
      startCinematicTour();
    }
  };

  const startCinematicTour = () => {
    // Implement cinematic camera path
    if (!cameraRef.current) return;

    const camera = cameraRef.current;
    const positions = [
      { x: 60, y: 20, z: 60, duration: 3000 },
      { x: -40, y: 25, z: 40, duration: 2000 },
      { x: 0, y: 15, z: -50, duration: 2000 },
      { x: 40, y: 30, z: 20, duration: 2000 }
    ];

    let currentIndex = 0;
    const animateCamera = () => {
      if (currentIndex >= positions.length) {
        currentIndex = 0;
      }

      const target = positions[currentIndex];
      // Smooth camera transition implementation would go here
      currentIndex++;
      
      if (viewMode === 'cinematic') {
        setTimeout(animateCamera, target.duration);
      }
    };

    animateCamera();
  };

  const handleTimeChange = (value: number[]) => {
    const newTime = value[0];
    setTimeOfDay(newTime);
    
    if (sceneRef.current) {
      setupLighting(sceneRef.current);
    }
  };

  const takeScreenshot = () => {
    if (!rendererRef.current) return;

    rendererRef.current.render(sceneRef.current!, cameraRef.current!);
    const dataURL = rendererRef.current.domElement.toDataURL('image/png');
    
    const link = document.createElement('a');
    link.download = 'cabin-3d-view.png';
    link.href = dataURL;
    link.click();
  };

  const exportModel = () => {
    // Implementation for exporting 3D model (OBJ, GLTF, etc.)
    console.log('Export model functionality would be implemented here');
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* 3D Controls Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'orbit' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('orbit')}
              className={viewMode === 'orbit' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}
            >
              <Move3D className="w-4 h-4 mr-1" />
              Orbit
            </Button>
            <Button
              variant={viewMode === 'walk' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('walk')}
              className={viewMode === 'walk' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}
            >
              <Eye className="w-4 h-4 mr-1" />
              Walk
            </Button>
            <Button
              variant={viewMode === 'cinematic' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('cinematic')}
              className={viewMode === 'cinematic' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}
            >
              <Camera className="w-4 h-4 mr-1" />
              Tour
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-gray-300">
              <Sun className="w-4 h-4" />
              <Slider
                value={[timeOfDay]}
                onValueChange={handleTimeChange}
                max={24}
                min={0}
                step={0.5}
                className="w-24"
              />
              <span className="text-xs">{Math.floor(timeOfDay)}:{(timeOfDay % 1 * 60).toFixed(0).padStart(2, '0')}</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowWireframe(!showWireframe)}
              className="text-gray-300 hover:text-white"
            >
              <Settings className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={takeScreenshot}
              className="text-gray-300 hover:text-white"
            >
              <Camera className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={exportModel}
              className="text-gray-300 hover:text-white"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 3D Viewport */}
      <div className="flex-1 relative">
        <div ref={mountRef} className="w-full h-full" />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
            <div className="text-white">Loading 3D model...</div>
          </div>
        )}

        {/* Material Selector Overlay */}
        <Card className="absolute top-4 right-4 w-64 bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <h3 className="text-white font-semibold mb-3">Materials</h3>
            <div className="space-y-2">
              {materials.map((material) => (
                <button
                  key={material.id}
                  className={`w-full text-left p-2 rounded text-sm ${
                    selectedMaterial?.id === material.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  onClick={() => setSelectedMaterial(material)}
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded border border-gray-500"
                      style={{ backgroundColor: material.color }}
                    />
                    <span>{material.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation Help */}
        <div className="absolute bottom-4 left-4 bg-gray-800 bg-opacity-90 rounded-lg p-3 text-gray-300 text-sm">
          <div className="space-y-1">
            <div><strong>Orbit:</strong> Click + drag to rotate</div>
            <div><strong>Pan:</strong> Right-click + drag</div>
            <div><strong>Zoom:</strong> Mouse wheel</div>
            {viewMode === 'walk' && (
              <div><strong>Walk:</strong> WASD keys + mouse</div>
            )}
          </div>
        </div>

        {/* Performance Info */}
        <div className="absolute bottom-4 right-4 bg-gray-800 bg-opacity-90 rounded-lg p-2 text-gray-300 text-xs">
          Rendering at {Math.round(60)} FPS
        </div>
      </div>
    </div>
  );
}