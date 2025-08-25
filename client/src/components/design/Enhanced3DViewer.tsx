import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
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
  Settings,
  Layers,
  Ruler,
  Target
} from "lucide-react";
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useDesignStore, type Material3D } from '../../stores/designStore';
import { useSyncSystem, useSelectionSync, usePerformanceMonitor } from '../../hooks/useSyncSystem';

interface Enhanced3DViewerProps {
  onElementClick?: (elementId: string, elementType: string) => void;
}

export function Enhanced3DViewer({ onElementClick }: Enhanced3DViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const controlsRef = useRef<any>();
  const animationIdRef = useRef<number>();
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const cabinGroupRef = useRef<THREE.Group>();
  const measurementGroupRef = useRef<THREE.Group>();

  // Store subscriptions
  const {
    project,
    walls,
    doors,
    windows,
    rooms,
    electricalElements,
    plumbingElements,
    selectedElements,
    hoveredElement,
    materials,
    selectedMaterial,
    camera3D,
    lighting3D,
    showWireframe,
    measurements,
    measurementMode,
    syncEnabled,
    updateCamera3D,
    updateLighting3D,
    setSelectedMaterial,
    addMeasurement,
    removeMeasurement,
    markDirty
  } = useDesignStore();

  // Sync system
  const { subscribe3D, triggerSync } = useSyncSystem();
  const { 
    syncSelectionFrom3DTo2D, 
    syncHoverFrom3DTo2D 
  } = useSelectionSync();

  // Performance monitoring
  const { getPerformanceMetrics, currentFPS } = usePerformanceMonitor();

  const [isLoading, setIsLoading] = useState(true);
  const [showMaterials, setShowMaterials] = useState(false);
  const [showLighting, setShowLighting] = useState(false);
  const [elementMeshMap, setElementMeshMap] = useState<Map<string, THREE.Mesh>>(new Map());
  const [isVREnabled, setIsVREnabled] = useState(false);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(camera3D.position.x, camera3D.position.y, camera3D.position.z);
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
    controls.autoRotate = camera3D.autoRotate;
    controls.autoRotateSpeed = 2.0;
    controlsRef.current = controls;

    // Groups for organization
    const cabinGroup = new THREE.Group();
    cabinGroup.name = 'cabin';
    scene.add(cabinGroup);
    cabinGroupRef.current = cabinGroup;

    const measurementGroup = new THREE.Group();
    measurementGroup.name = 'measurements';
    scene.add(measurementGroup);
    measurementGroupRef.current = measurementGroup;

    // Lighting setup
    setupLighting(scene);

    // Create cabin geometry
    createCabinGeometry(cabinGroup);

    // Add ground plane
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      // Update camera state in store
      const currentPos = camera.position;
      const currentTarget = controls.target;
      if (currentPos.x !== camera3D.position.x || 
          currentPos.y !== camera3D.position.y || 
          currentPos.z !== camera3D.position.z) {
        updateCamera3D({
          position: { x: currentPos.x, y: currentPos.y, z: currentPos.z },
          target: { x: currentTarget.x, y: currentTarget.y, z: currentTarget.z }
        });
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

  // Subscribe to sync updates
  useEffect(() => {
    const unsubscribe = subscribe3D((syncData) => {
      if (syncData.updates && cabinGroupRef.current) {
        // Rebuild the cabin geometry when 2D changes occur
        cabinGroupRef.current.clear();
        createCabinGeometry(cabinGroupRef.current);
        
        // Update measurements
        if (measurementGroupRef.current) {
          updateMeasurements();
        }
      }
    });

    return unsubscribe;
  }, [subscribe3D]);

  // Update scene when store data changes
  useEffect(() => {
    if (cabinGroupRef.current) {
      cabinGroupRef.current.clear();
      createCabinGeometry(cabinGroupRef.current);
    }
  }, [walls, doors, windows, project]);

  // Update lighting when settings change
  useEffect(() => {
    if (sceneRef.current) {
      setupLighting(sceneRef.current);
    }
  }, [lighting3D]);

  // Update materials when wireframe changes
  useEffect(() => {
    if (cabinGroupRef.current) {
      cabinGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.material instanceof THREE.Material) {
            child.material.wireframe = showWireframe;
          }
        }
      });
    }
  }, [showWireframe]);

  // Update measurements display
  useEffect(() => {
    updateMeasurements();
  }, [measurements]);

  // Handle selection and hover updates
  useEffect(() => {
    updateElementHighlights();
  }, [selectedElements, hoveredElement]);

  const setupLighting = (scene: THREE.Scene) => {
    // Remove existing lights
    const lights = scene.children.filter(child => child instanceof THREE.Light);
    lights.forEach(light => scene.remove(light));

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, lighting3D.ambientIntensity);
    scene.add(ambientLight);

    // Directional light (sun)
    const sunLight = new THREE.DirectionalLight(0xffffff, lighting3D.sunIntensity);
    updateSunPosition(sunLight, lighting3D.timeOfDay);
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

    // Interior lights
    if (lighting3D.interiorLights || lighting3D.preset === 'interior' || lighting3D.preset === 'night') {
      const interiorLight = new THREE.PointLight(0xFFE4B5, 0.8, 50);
      interiorLight.position.set(0, 15, 0);
      interiorLight.castShadow = true;
      scene.add(interiorLight);
    }
  };

  const updateSunPosition = (sunLight: THREE.DirectionalLight, hour: number) => {
    const angle = (hour - 6) * (Math.PI / 12);
    const elevation = Math.sin(angle) * 60;
    const azimuth = Math.cos(angle) * 60;
    
    sunLight.position.set(azimuth, Math.max(elevation, 5), azimuth);
    
    // Adjust intensity and color based on time
    if (hour < 6 || hour > 18) {
      sunLight.intensity = 0.1;
      sunLight.color.setHex(0x2F4F4F);
    } else if (hour < 8 || hour > 16) {
      sunLight.intensity = 0.7;
      sunLight.color.setHex(0xFFE4B5);
    } else {
      sunLight.intensity = 1.0;
      sunLight.color.setHex(0xFFFFFF);
    }
  };

  const createCabinGeometry = (group: THREE.Group) => {
    if (!project) return;

    const width = project.width || 16;
    const length = project.length || 20;
    const height = project.height || 12;
    const style = project.style || 'modern';

    // Clear existing meshes from element map
    setElementMeshMap(new Map());
    const newElementMap = new Map<string, THREE.Mesh>();

    // Create foundation
    createFoundation(group, width, length, newElementMap);
    
    // Create walls
    createWallsFromData(group, newElementMap);
    
    // Create roof
    createRoof(group, width, length, height, style);

    // Add doors and windows
    addDoorsAndWindowsFromData(group, newElementMap);

    // Add interior elements
    addInteriorElements(group, width, length);

    // Update element map
    setElementMeshMap(newElementMap);
  };

  const createFoundation = (group: THREE.Group, width: number, length: number, elementMap: Map<string, THREE.Mesh>) => {
    const foundationGeometry = new THREE.BoxGeometry(width, 2, length);
    const foundationMaterial = createMaterial('stone-foundation');
    const foundation = new THREE.Mesh(foundationGeometry, foundationMaterial);
    foundation.position.y = -1;
    foundation.receiveShadow = true;
    foundation.userData = { type: 'foundation', id: 'foundation-1' };
    group.add(foundation);
    elementMap.set('foundation-1', foundation);
  };

  const createWallsFromData = (group: THREE.Group, elementMap: Map<string, THREE.Mesh>) => {
    walls.forEach(wall => {
      const wallMesh = createWallMesh(wall);
      if (wallMesh) {
        group.add(wallMesh);
        elementMap.set(wall.id, wallMesh);
      }
    });
  };

  const createWallMesh = (wall: any): THREE.Mesh | null => {
    const wallLength = Math.sqrt(
      Math.pow(wall.end.x - wall.start.x, 2) + 
      Math.pow(wall.end.y - wall.start.y, 2)
    );
    
    // Convert 2D coordinates to 3D
    const centerX = (wall.start.x + wall.end.x) / 2;
    const centerZ = (wall.start.y + wall.end.y) / 2;
    const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
    
    // Create wall geometry
    const wallGeometry = new THREE.BoxGeometry(
      wallLength / 12, // Convert from pixels to feet
      wall.height || 10, // Height is already in feet
      (wall.thickness || 6) / 12
    );
    
    const wallMaterial = createMaterial(wall.material || 'cedar-siding');
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    
    // Position and rotate wall
    wallMesh.position.set(centerX / 12, (wall.height || 10) / 2, -centerZ / 12);
    wallMesh.rotation.y = -angle;
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    wallMesh.userData = { type: 'wall', id: wall.id, wallData: wall };
    
    return wallMesh;
  };

  const addDoorsAndWindowsFromData = (group: THREE.Group, elementMap: Map<string, THREE.Mesh>) => {
    // Add doors
    doors.forEach(door => {
      const wall = walls.find(w => w.id === door.wallId);
      if (wall) {
        const doorMesh = createDoorMesh(door, wall);
        if (doorMesh) {
          group.add(doorMesh);
          elementMap.set(door.id, doorMesh);
        }
      }
    });

    // Add windows
    windows.forEach(window => {
      const wall = walls.find(w => w.id === window.wallId);
      if (wall) {
        const windowMesh = createWindowMesh(window, wall);
        if (windowMesh) {
          group.add(windowMesh);
          elementMap.set(window.id, windowMesh);
        }
      }
    });
  };

  const createDoorMesh = (door: any, wall: any): THREE.Mesh | null => {
    const doorGeometry = new THREE.BoxGeometry(door.width / 12, door.height || 7, 0.2);
    const doorMaterial = createMaterial('cedar-siding');
    const doorMesh = new THREE.Mesh(doorGeometry, doorMaterial);
    
    // Calculate position along wall
    const wallStart = { x: wall.start.x / 12, z: -wall.start.y / 12 };
    const wallEnd = { x: wall.end.x / 12, z: -wall.end.y / 12 };
    const doorPos = {
      x: wallStart.x + (wallEnd.x - wallStart.x) * door.position,
      z: wallStart.z + (wallEnd.z - wallStart.z) * door.position
    };
    
    const wallAngle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
    const wallThickness = (wall.thickness || 6) / 12;
    
    doorMesh.position.set(doorPos.x, (door.height || 7) / 2, doorPos.z - wallThickness / 2);
    doorMesh.rotation.y = -wallAngle;
    doorMesh.castShadow = true;
    doorMesh.userData = { type: 'door', id: door.id, doorData: door };
    
    return doorMesh;
  };

  const createWindowMesh = (window: any, wall: any): THREE.Mesh | null => {
    const windowGeometry = new THREE.BoxGeometry(window.width / 12, window.height / 12, 0.1);
    const windowMaterial = createMaterial('glass-window');
    windowMaterial.transparent = true;
    windowMaterial.opacity = 0.7;
    
    const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
    
    // Calculate position along wall
    const wallStart = { x: wall.start.x / 12, z: -wall.start.y / 12 };
    const wallEnd = { x: wall.end.x / 12, z: -wall.end.y / 12 };
    const windowPos = {
      x: wallStart.x + (wallEnd.x - wallStart.x) * window.position,
      z: wallStart.z + (wallEnd.z - wallStart.z) * window.position
    };
    
    const wallAngle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
    const wallThickness = (wall.thickness || 6) / 12;
    const sillHeight = (window.sillHeight || 30) / 12;
    
    windowMesh.position.set(
      windowPos.x, 
      sillHeight + (window.height / 12) / 2, 
      windowPos.z - wallThickness / 2
    );
    windowMesh.rotation.y = -wallAngle;
    windowMesh.userData = { type: 'window', id: window.id, windowData: window };
    
    return windowMesh;
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

  const addInteriorElements = (group: THREE.Group, width: number, length: number) => {
    // Floor
    const floorGeometry = new THREE.BoxGeometry(width - 1, 0.5, length - 1);
    const floorMaterial = createMaterial('cedar-siding');
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = 0.25;
    floor.receiveShadow = true;
    group.add(floor);
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

  const updateMeasurements = () => {
    if (!measurementGroupRef.current) return;

    // Clear existing measurements
    measurementGroupRef.current.clear();

    measurements.forEach(measurement => {
      if (!measurement.visible) return;

      // Create measurement line
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(measurement.start.x / 12, measurement.start.y / 12, measurement.start.z / 12),
        new THREE.Vector3(measurement.end.x / 12, measurement.end.y / 12, measurement.end.z / 12)
      ]);
      
      const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
      const line = new THREE.Line(geometry, material);
      measurementGroupRef.current!.add(line);

      // Add measurement text (would need to implement text rendering)
      // This is a simplified version - in production you'd use a text geometry or sprite
    });
  };

  const updateElementHighlights = () => {
    if (!elementMeshMap) return;

    // Reset all materials
    elementMeshMap.forEach((mesh, id) => {
      if (mesh.userData.originalMaterial) {
        mesh.material = mesh.userData.originalMaterial;
      }
    });

    // Highlight selected elements
    selectedElements.forEach(id => {
      const mesh = elementMeshMap.get(id);
      if (mesh && mesh.material instanceof THREE.MeshStandardMaterial) {
        if (!mesh.userData.originalMaterial) {
          mesh.userData.originalMaterial = mesh.material.clone();
        }
        mesh.material = mesh.material.clone();
        mesh.material.color.setHex(0x3b82f6);
        mesh.material.emissive.setHex(0x001122);
      }
    });

    // Highlight hovered element
    if (hoveredElement) {
      const mesh = elementMeshMap.get(hoveredElement);
      if (mesh && mesh.material instanceof THREE.MeshStandardMaterial) {
        if (!mesh.userData.originalMaterial) {
          mesh.userData.originalMaterial = mesh.material.clone();
        }
        mesh.material = mesh.material.clone();
        mesh.material.color.setHex(0x60a5fa);
        mesh.material.emissive.setHex(0x001122);
      }
    }
  };

  // Mouse interaction handlers
  const handleMouseClick = useCallback((event: React.MouseEvent) => {
    if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = rendererRef.current.domElement.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    
    const intersects = raycasterRef.current.intersectObjects(
      cabinGroupRef.current?.children || [], 
      true
    );

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object as THREE.Mesh;
      if (clickedObject.userData && clickedObject.userData.id) {
        const elementId = clickedObject.userData.id;
        const elementType = clickedObject.userData.type;
        
        // Sync selection to 2D
        syncSelectionFrom3DTo2D(elementId, elementType);
        
        // Notify parent
        onElementClick?.(elementId, elementType);
      }
    }
  }, [syncSelectionFrom3DTo2D, onElementClick]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = rendererRef.current.domElement.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    
    const intersects = raycasterRef.current.intersectObjects(
      cabinGroupRef.current?.children || [], 
      true
    );

    if (intersects.length > 0) {
      const hoveredObject = intersects[0].object as THREE.Mesh;
      if (hoveredObject.userData && hoveredObject.userData.id) {
        const elementId = hoveredObject.userData.id;
        
        // Sync hover to 2D
        syncHoverFrom3DTo2D(elementId);
      }
    } else {
      syncHoverFrom3DTo2D(null);
    }
  }, [syncHoverFrom3DTo2D]);

  // Camera control functions
  const handleViewModeChange = (mode: 'orbit' | 'walk' | 'cinematic') => {
    updateCamera3D({ viewMode: mode });
    
    if (!cameraRef.current || !controlsRef.current) return;

    if (mode === 'orbit') {
      cameraRef.current.position.set(50, 30, 50);
      controlsRef.current.autoRotate = false;
    } else if (mode === 'walk') {
      cameraRef.current.position.set(0, 6, 0);
      controlsRef.current.autoRotate = false;
    } else if (mode === 'cinematic') {
      controlsRef.current.autoRotate = true;
      startCinematicTour();
    }
  };

  const startCinematicTour = () => {
    if (!cameraRef.current || !controlsRef.current) return;

    controlsRef.current.autoRotate = true;
    controlsRef.current.autoRotateSpeed = 2.0;
  };

  const handleTimeChange = (value: number[]) => {
    const newTime = value[0];
    updateLighting3D({ timeOfDay: newTime });
  };

  const takeScreenshot = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    rendererRef.current.render(sceneRef.current, cameraRef.current);
    const dataURL = rendererRef.current.domElement.toDataURL('image/png');
    
    const link = document.createElement('a');
    link.download = `cabin-3d-view-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  };

  const exportModel = () => {
    // Implementation for exporting 3D model (OBJ, GLTF, etc.)
    console.log('Export model functionality would be implemented here');
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Enhanced 3D Controls Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant={camera3D.viewMode === 'orbit' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('orbit')}
              className={camera3D.viewMode === 'orbit' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}
            >
              <Move3D className="w-4 h-4 mr-1" />
              Orbit
            </Button>
            <Button
              variant={camera3D.viewMode === 'walk' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('walk')}
              className={camera3D.viewMode === 'walk' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}
            >
              <Eye className="w-4 h-4 mr-1" />
              Walk
            </Button>
            <Button
              variant={camera3D.viewMode === 'cinematic' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('cinematic')}
              className={camera3D.viewMode === 'cinematic' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}
            >
              <Camera className="w-4 h-4 mr-1" />
              Tour
            </Button>

            <div className="h-6 w-px bg-gray-600" />

            <Button
              variant={measurementMode ? 'default' : 'ghost'}
              size="sm"
              onClick={() => useDesignStore.getState().toggleMeasurementMode()}
              className={measurementMode ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'}
            >
              <Ruler className="w-4 h-4 mr-1" />
              Measure
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            {/* Time of Day Slider */}
            <div className="flex items-center space-x-2 text-gray-300">
              <Sun className="w-4 h-4" />
              <Slider
                value={[lighting3D.timeOfDay]}
                onValueChange={handleTimeChange}
                max={24}
                min={0}
                step={0.5}
                className="w-24"
              />
              <span className="text-xs min-w-12">
                {Math.floor(lighting3D.timeOfDay)}:{(lighting3D.timeOfDay % 1 * 60).toFixed(0).padStart(2, '0')}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMaterials(!showMaterials)}
              className="text-gray-300 hover:text-white"
            >
              <Palette className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLighting(!showLighting)}
              className="text-gray-300 hover:text-white"
            >
              <Lightbulb className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => useDesignStore.getState().toggleWireframe()}
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
        <div 
          ref={mountRef} 
          className="w-full h-full"
          onClick={handleMouseClick}
          onMouseMove={handleMouseMove}
        />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
            <div className="text-white text-lg">Loading 3D model...</div>
          </div>
        )}

        {/* Material Selector */}
        {showMaterials && (
          <Card className="absolute top-4 right-4 w-64 bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">Materials</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowMaterials(false)}
                  className="p-1 text-gray-400"
                >
                  ×
                </Button>
              </div>
              
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
        )}

        {/* Lighting Controls */}
        {showLighting && (
          <Card className="absolute top-4 left-4 w-72 bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">Lighting</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowLighting(false)}
                  className="p-1 text-gray-400"
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-300 block mb-2">Ambient Intensity</label>
                  <Slider
                    value={[lighting3D.ambientIntensity]}
                    onValueChange={([value]) => updateLighting3D({ ambientIntensity: value })}
                    max={1}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-300 block mb-2">Sun Intensity</label>
                  <Slider
                    value={[lighting3D.sunIntensity]}
                    onValueChange={([value]) => updateLighting3D({ sunIntensity: value })}
                    max={2}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={lighting3D.interiorLights}
                    onChange={(e) => updateLighting3D({ interiorLights: e.target.checked })}
                    className="rounded border-gray-600"
                  />
                  <label className="text-sm text-gray-300">Interior Lights</label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sync Status */}
        <div className="absolute bottom-4 left-4 flex items-center space-x-4">
          <div className="bg-gray-800 bg-opacity-90 rounded-lg p-2 text-gray-300 text-xs">
            <div className="flex items-center space-x-2">
              {syncEnabled ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Live Sync</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-gray-500 rounded-full" />
                  <span>Sync Off</span>
                </>
              )}
            </div>
          </div>

          {selectedElements.length > 0 && (
            <Badge variant="outline" className="bg-blue-600 text-white border-blue-500">
              Selected: {selectedElements.length}
            </Badge>
          )}
        </div>

        {/* Navigation Help */}
        <div className="absolute bottom-4 right-4 bg-gray-800 bg-opacity-90 rounded-lg p-3 text-gray-300 text-sm">
          <div className="space-y-1">
            <div><strong>Orbit:</strong> Click + drag to rotate</div>
            <div><strong>Pan:</strong> Right-click + drag</div>
            <div><strong>Zoom:</strong> Mouse wheel</div>
            <div><strong>Select:</strong> Click on element</div>
            {camera3D.viewMode === 'walk' && (
              <div><strong>Walk:</strong> WASD keys + mouse</div>
            )}
          </div>
        </div>

        {/* Performance Info */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 bg-opacity-90 rounded-lg p-2 text-gray-300 text-xs">
          <div className="flex items-center space-x-4">
            <span>FPS: {currentFPS}</span>
            <span>Elements: {walls.length + doors.length + windows.length}</span>
            {measurementMode && (
              <span className="text-orange-400">Measurement Mode</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Enhanced3DViewer;