import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Cloud,
  CloudRain,
  CloudSnow,
  Zap,
  Layers,
  Contrast,
  Droplets,
  Home,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// @ts-ignore
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

// Enhanced Material Interface
interface Material3D {
  id: string;
  name: string;
  category: 'wood' | 'stone' | 'metal' | 'glass' | 'concrete' | 'fabric' | 'ceramic';
  diffuseMap?: string;
  normalMap?: string;
  roughnessMap?: string;
  metallicMap?: string;
  aoMap?: string;
  displacementMap?: string;
  emissiveMap?: string;
  color: string;
  roughness: number;
  metalness: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  thickness?: number;
  ior?: number;
  emissive?: string;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  envMapIntensity?: number;
}

// Professional Lighting System
interface LightingPreset {
  id: string;
  name: string;
  ambientIntensity: number;
  sunIntensity: number;
  sunColor: string;
  skyIntensity: number;
  skyColor: string;
  groundColor: string;
  fogColor: string;
  fogDensity: number;
}

interface WeatherCondition {
  id: string;
  name: string;
  icon: any;
  skybox: string;
  lighting: Partial<LightingPreset>;
  particles?: {
    type: 'rain' | 'snow';
    intensity: number;
  };
}

interface TextureAsset {
  id: string;
  name: string;
  category: string;
  diffuse: string;
  normal?: string;
  roughness?: string;
  metallic?: string;
  ao?: string;
  displacement?: string;
  repeat: [number, number];
  resolution: number;
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
  const [lightingPreset, setLightingPreset] = useState<string>('day');
  const [autoRotate, setAutoRotate] = useState(false);
  const [showWireframe, setShowWireframe] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState(12); // 0-24 hours
  const [season, setSeason] = useState<'spring' | 'summer' | 'autumn' | 'winter'>('summer');
  const [weatherCondition, setWeatherCondition] = useState<string>('clear');
  const [interiorLightsOn, setInteriorLightsOn] = useState(false);
  const [shadowsEnabled, setShadowsEnabled] = useState(true);
  const [postProcessingEnabled, setPostProcessingEnabled] = useState(true);
  const [environmentIntensity, setEnvironmentIntensity] = useState(1.0);
  const [materialPanelOpen, setMaterialPanelOpen] = useState(false);
  const [lightingPanelOpen, setLightingPanelOpen] = useState(false);
  
  // Refs for advanced lighting
  const sunLightRef = useRef<THREE.DirectionalLight>();
  const hemispereLightRef = useRef<THREE.HemisphereLight>();
  const pointLightsRef = useRef<THREE.PointLight[]>([]);
  const envMapRef = useRef<THREE.Texture>();
  const textureLoaderRef = useRef<THREE.TextureLoader>();
  const materialCacheRef = useRef<Map<string, THREE.Material>>(new Map());

  // Professional Material Library
  const materials: Material3D[] = [
    // Wood Materials
    {
      id: 'cedar-siding-natural',
      name: 'Natural Cedar Siding',
      category: 'wood',
      color: '#D2B48C',
      roughness: 0.8,
      metalness: 0.0,
      diffuseMap: '/textures/wood/cedar_diffuse.jpg',
      normalMap: '/textures/wood/cedar_normal.jpg',
      roughnessMap: '/textures/wood/cedar_roughness.jpg',
      aoMap: '/textures/wood/cedar_ao.jpg',
      envMapIntensity: 0.3
    },
    {
      id: 'pine-logs',
      name: 'Pine Log Construction',
      category: 'wood',
      color: '#DEB887',
      roughness: 0.7,
      metalness: 0.0,
      diffuseMap: '/textures/wood/pine_logs_diffuse.jpg',
      normalMap: '/textures/wood/pine_logs_normal.jpg',
      roughnessMap: '/textures/wood/pine_logs_roughness.jpg',
      envMapIntensity: 0.2
    },
    {
      id: 'oak-flooring',
      name: 'Oak Hardwood Flooring',
      category: 'wood',
      color: '#B8860B',
      roughness: 0.4,
      metalness: 0.0,
      diffuseMap: '/textures/wood/oak_flooring_diffuse.jpg',
      normalMap: '/textures/wood/oak_flooring_normal.jpg',
      roughnessMap: '/textures/wood/oak_flooring_roughness.jpg',
      envMapIntensity: 0.6
    },
    
    // Metal Materials
    {
      id: 'corrugated-steel-roof',
      name: 'Corrugated Steel Roofing',
      category: 'metal',
      color: '#36454F',
      roughness: 0.2,
      metalness: 0.9,
      diffuseMap: '/textures/metal/corrugated_steel_diffuse.jpg',
      normalMap: '/textures/metal/corrugated_steel_normal.jpg',
      roughnessMap: '/textures/metal/corrugated_steel_roughness.jpg',
      metallicMap: '/textures/metal/corrugated_steel_metallic.jpg',
      envMapIntensity: 1.0
    },
    {
      id: 'copper-patina',
      name: 'Weathered Copper',
      category: 'metal',
      color: '#40826D',
      roughness: 0.4,
      metalness: 0.8,
      diffuseMap: '/textures/metal/copper_patina_diffuse.jpg',
      normalMap: '/textures/metal/copper_patina_normal.jpg',
      envMapIntensity: 0.8
    },
    {
      id: 'brushed-aluminum',
      name: 'Brushed Aluminum',
      category: 'metal',
      color: '#C0C0C0',
      roughness: 0.3,
      metalness: 1.0,
      diffuseMap: '/textures/metal/brushed_aluminum_diffuse.jpg',
      normalMap: '/textures/metal/brushed_aluminum_normal.jpg',
      envMapIntensity: 1.2
    },
    
    // Stone Materials
    {
      id: 'fieldstone-foundation',
      name: 'Natural Fieldstone',
      category: 'stone',
      color: '#696969',
      roughness: 0.9,
      metalness: 0.0,
      diffuseMap: '/textures/stone/fieldstone_diffuse.jpg',
      normalMap: '/textures/stone/fieldstone_normal.jpg',
      roughnessMap: '/textures/stone/fieldstone_roughness.jpg',
      aoMap: '/textures/stone/fieldstone_ao.jpg',
      displacementMap: '/textures/stone/fieldstone_height.jpg',
      envMapIntensity: 0.1
    },
    {
      id: 'slate-tile',
      name: 'Slate Tile',
      category: 'stone',
      color: '#2F4F4F',
      roughness: 0.6,
      metalness: 0.0,
      diffuseMap: '/textures/stone/slate_diffuse.jpg',
      normalMap: '/textures/stone/slate_normal.jpg',
      envMapIntensity: 0.2
    },
    {
      id: 'river-rock',
      name: 'River Rock',
      category: 'stone',
      color: '#8B7355',
      roughness: 0.7,
      metalness: 0.0,
      diffuseMap: '/textures/stone/river_rock_diffuse.jpg',
      normalMap: '/textures/stone/river_rock_normal.jpg',
      envMapIntensity: 0.3
    },
    
    // Glass Materials
    {
      id: 'clear-window-glass',
      name: 'Clear Window Glass',
      category: 'glass',
      color: '#F0F8FF',
      roughness: 0.0,
      metalness: 0.0,
      transmission: 1.0,
      thickness: 0.5,
      ior: 1.5,
      transparent: true,
      opacity: 0.1,
      envMapIntensity: 1.0
    },
    {
      id: 'tinted-glass',
      name: 'Tinted Glass',
      category: 'glass',
      color: '#4682B4',
      roughness: 0.0,
      metalness: 0.0,
      transmission: 0.8,
      thickness: 0.5,
      ior: 1.5,
      transparent: true,
      opacity: 0.3,
      envMapIntensity: 0.8
    },
    
    // Concrete Materials
    {
      id: 'smooth-concrete',
      name: 'Smooth Concrete',
      category: 'concrete',
      color: '#D3D3D3',
      roughness: 0.8,
      metalness: 0.0,
      diffuseMap: '/textures/concrete/smooth_concrete_diffuse.jpg',
      normalMap: '/textures/concrete/smooth_concrete_normal.jpg',
      roughnessMap: '/textures/concrete/smooth_concrete_roughness.jpg',
      envMapIntensity: 0.1
    },
    {
      id: 'exposed-aggregate',
      name: 'Exposed Aggregate',
      category: 'concrete',
      color: '#A9A9A9',
      roughness: 0.9,
      metalness: 0.0,
      diffuseMap: '/textures/concrete/exposed_aggregate_diffuse.jpg',
      normalMap: '/textures/concrete/exposed_aggregate_normal.jpg',
      envMapIntensity: 0.2
    }
  ];
  
  // Professional Lighting Presets
  const lightingPresets: LightingPreset[] = [
    {
      id: 'golden-hour',
      name: 'Golden Hour',
      ambientIntensity: 0.4,
      sunIntensity: 0.8,
      sunColor: '#FFE4B5',
      skyIntensity: 0.6,
      skyColor: '#FFE4B5',
      groundColor: '#8B7355',
      fogColor: '#FFE4B5',
      fogDensity: 0.002
    },
    {
      id: 'day',
      name: 'Bright Day',
      ambientIntensity: 0.5,
      sunIntensity: 1.2,
      sunColor: '#FFFFFF',
      skyIntensity: 0.8,
      skyColor: '#87CEEB',
      groundColor: '#8FBC8F',
      fogColor: '#87CEEB',
      fogDensity: 0.001
    },
    {
      id: 'overcast',
      name: 'Overcast',
      ambientIntensity: 0.7,
      sunIntensity: 0.3,
      sunColor: '#E6E6FA',
      skyIntensity: 0.6,
      skyColor: '#D3D3D3',
      groundColor: '#696969',
      fogColor: '#D3D3D3',
      fogDensity: 0.005
    },
    {
      id: 'sunset',
      name: 'Sunset',
      ambientIntensity: 0.3,
      sunIntensity: 0.6,
      sunColor: '#FF6347',
      skyIntensity: 0.5,
      skyColor: '#FF6347',
      groundColor: '#4B0082',
      fogColor: '#FF6347',
      fogDensity: 0.003
    },
    {
      id: 'night',
      name: 'Night',
      ambientIntensity: 0.1,
      sunIntensity: 0.05,
      sunColor: '#191970',
      skyIntensity: 0.2,
      skyColor: '#000080',
      groundColor: '#2F4F4F',
      fogColor: '#000080',
      fogDensity: 0.008
    }
  ];
  
  // Weather Conditions
  const weatherConditions: WeatherCondition[] = [
    {
      id: 'clear',
      name: 'Clear Sky',
      icon: Sun,
      skybox: '/hdri/clear_sky.hdr',
      lighting: {}
    },
    {
      id: 'cloudy',
      name: 'Cloudy',
      icon: Cloud,
      skybox: '/hdri/cloudy_sky.hdr',
      lighting: {
        ambientIntensity: 0.6,
        sunIntensity: 0.4
      }
    },
    {
      id: 'rainy',
      name: 'Rainy',
      icon: CloudRain,
      skybox: '/hdri/rainy_sky.hdr',
      lighting: {
        ambientIntensity: 0.4,
        sunIntensity: 0.2,
        fogDensity: 0.01
      },
      particles: {
        type: 'rain',
        intensity: 1000
      }
    },
    {
      id: 'snowy',
      name: 'Snowy',
      icon: CloudSnow,
      skybox: '/hdri/snowy_sky.hdr',
      lighting: {
        ambientIntensity: 0.8,
        sunIntensity: 0.3,
        skyColor: '#E6E6FA'
      },
      particles: {
        type: 'snow',
        intensity: 500
      }
    },
    {
      id: 'storm',
      name: 'Thunderstorm',
      icon: Zap,
      skybox: '/hdri/storm_sky.hdr',
      lighting: {
        ambientIntensity: 0.2,
        sunIntensity: 0.1,
        fogDensity: 0.015
      },
      particles: {
        type: 'rain',
        intensity: 2000
      }
    }
  ];

  // Initialize Three.js scene with advanced features
  useEffect(() => {
    if (!mountRef.current) return;

    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // Scene setup with realistic settings
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    sceneRef.current = scene;

    // Professional camera setup
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
    camera.position.set(80, 40, 80);
    cameraRef.current = camera;

    // Advanced renderer configuration
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      logarithmicDepthBuffer: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Advanced shadow mapping
    renderer.shadowMap.enabled = shadowsEnabled;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true;
    
    // Color management and tone mapping
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    
    // Physical properties
    renderer.physicallyCorrectLights = true;
    
    rendererRef.current = renderer;
    
    // Initialize texture loader
    textureLoaderRef.current = new THREE.TextureLoader();

    mount.appendChild(renderer.domElement);

    // Enhanced Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 5;
    controls.maxDistance = 500;
    controls.maxPolarAngle = Math.PI / 2;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.0;
    
    // Smooth movement
    controls.enablePan = true;
    controls.panSpeed = 0.8;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.0;
    
    // Target following
    controls.target.set(0, 5, 0);
    
    controlsRef.current = controls;

    // Professional lighting setup
    setupLighting(scene);

    // Create enhanced cabin geometry
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

  // Professional Lighting System
  const setupLighting = useCallback((scene: THREE.Scene) => {
    // Remove existing lights
    const lights = scene.children.filter(child => child instanceof THREE.Light);
    lights.forEach(light => scene.remove(light));
    
    // Clear point lights array
    pointLightsRef.current = [];

    // Get current lighting preset
    const currentPreset = lightingPresets.find(p => p.id === lightingPreset) || lightingPresets[1];
    const weatherEffect = weatherConditions.find(w => w.id === weatherCondition);
    const effectivePreset = weatherEffect?.lighting ? 
      { ...currentPreset, ...weatherEffect.lighting } : currentPreset;

    // Enhanced Ambient Light
    const ambientLight = new THREE.AmbientLight(0x404040, effectivePreset.ambientIntensity);
    scene.add(ambientLight);

    // Professional Directional Light (Sun)
    const sunLight = new THREE.DirectionalLight(0xffffff, effectivePreset.sunIntensity);
    updateSunPosition(sunLight, timeOfDay, season);
    sunLight.color.setHex(parseInt(effectivePreset.sunColor.replace('#', '0x')));
    
    // Advanced shadow configuration
    if (shadowsEnabled) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 4096;
      sunLight.shadow.mapSize.height = 4096;
      sunLight.shadow.camera.near = 0.5;
      sunLight.shadow.camera.far = 1000;
      sunLight.shadow.camera.left = -150;
      sunLight.shadow.camera.right = 150;
      sunLight.shadow.camera.top = 150;
      sunLight.shadow.camera.bottom = -150;
      sunLight.shadow.bias = -0.0001;
      sunLight.shadow.normalBias = 0.02;
      
      sunLight.shadow.camera.updateProjectionMatrix();
    }
    
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Enhanced Hemisphere Light for realistic sky lighting
    const hemisphereLight = new THREE.HemisphereLight(
      parseInt(effectivePreset.skyColor.replace('#', '0x')), 
      parseInt(effectivePreset.groundColor.replace('#', '0x')), 
      effectivePreset.skyIntensity
    );
    hemisphereLight.position.set(0, 100, 0);
    scene.add(hemisphereLight);
    hemispereLightRef.current = hemisphereLight;

    // Interior Lighting System
    if (interiorLightsOn || effectivePreset.id === 'night') {
      addInteriorLights(scene);
    }
    
    // Environmental lighting with HDRI
    setupEnvironmentMapping(scene, weatherCondition);
    
    // Atmospheric effects
    setupAtmosphere(scene, effectivePreset);
    
  }, [lightingPreset, weatherCondition, timeOfDay, season, interiorLightsOn, shadowsEnabled]);

  const updateSunPosition = useCallback((sunLight: THREE.DirectionalLight, hour: number, currentSeason: string) => {
    // Seasonal sun path adjustments
    const seasonalAdjustments = {
      winter: { elevation: -15, intensity: 0.8 },
      spring: { elevation: 0, intensity: 1.0 },
      summer: { elevation: 15, intensity: 1.2 },
      autumn: { elevation: 0, intensity: 0.9 }
    };
    
    const adjustment = seasonalAdjustments[currentSeason as keyof typeof seasonalAdjustments] || seasonalAdjustments.summer;
    
    // More realistic sun path calculation
    const sunAngle = (hour - 6) * (Math.PI / 12);
    const baseElevation = Math.sin(sunAngle) * (60 + adjustment.elevation);
    const elevation = Math.max(baseElevation, -10);
    const azimuth = Math.cos(sunAngle) * 80;
    
    sunLight.position.set(azimuth, elevation, azimuth * 0.5);
    sunLight.lookAt(0, 0, 0);
    
    // Dynamic color temperature
    let colorTemp, intensity;
    
    if (hour < 5 || hour > 19) {
      colorTemp = 0x0F1B3C;
      intensity = 0.05;
    } else if (hour < 7 || hour > 17) {
      const t = hour < 7 ? (7 - hour) / 2 : (hour - 17) / 2;
      colorTemp = interpolateColor(0xFFE4B5, 0xFF6347, t);
      intensity = 0.6 + (0.3 * (1 - t));
    } else if (hour < 9 || hour > 15) {
      colorTemp = 0xFFF8DC;
      intensity = 0.9;
    } else {
      colorTemp = 0xFFFFFF;
      intensity = 1.2;
    }
    
    sunLight.color.setHex(colorTemp);
    sunLight.intensity = intensity * adjustment.intensity;
  }, []);
  
  const interpolateColor = (color1: number, color2: number, t: number): number => {
    const r1 = (color1 >> 16) & 255;
    const g1 = (color1 >> 8) & 255;
    const b1 = color1 & 255;
    
    const r2 = (color2 >> 16) & 255;
    const g2 = (color2 >> 8) & 255;
    const b2 = color2 & 255;
    
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    return (r << 16) | (g << 8) | b;
  };
  
  const addInteriorLights = useCallback((scene: THREE.Scene) => {
    const lightPositions = [
      { x: 0, y: 8, z: 0, intensity: 1.5, color: 0xFFE4B5 },
      { x: -8, y: 6, z: -8, intensity: 1.0, color: 0xFFF8DC },
      { x: 8, y: 6, z: 8, intensity: 0.8, color: 0xFFE4B5 },
      { x: -8, y: 6, z: 8, intensity: 0.6, color: 0xFFE4B5 },
    ];
    
    lightPositions.forEach((pos, index) => {
      const pointLight = new THREE.PointLight(pos.color, pos.intensity, 30);
      pointLight.position.set(pos.x, pos.y, pos.z);
      pointLight.castShadow = shadowsEnabled;
      
      if (shadowsEnabled) {
        pointLight.shadow.mapSize.width = 1024;
        pointLight.shadow.mapSize.height = 1024;
        pointLight.shadow.camera.near = 0.1;
        pointLight.shadow.camera.far = 50;
        pointLight.shadow.bias = -0.0005;
      }
      
      scene.add(pointLight);
      pointLightsRef.current.push(pointLight);
    });
  }, [shadowsEnabled, showWireframe]);
  
  const setupEnvironmentMapping = useCallback(async (scene: THREE.Scene, weather: string) => {
    try {
      const weatherConfig = weatherConditions.find(w => w.id === weather);
      if (!weatherConfig || !weatherConfig.skybox) return;
      
      // Fallback to gradient sky for now
      const sky = createGradientSky();
      scene.background = sky;
      
    } catch (error) {
      console.warn('Failed to load HDRI environment map:', error);
      const sky = createGradientSky();
      scene.background = sky;
    }
  }, [environmentIntensity]);
  
  const createGradientSky = (): THREE.Color => {
    // Simple sky color based on time of day
    if (timeOfDay < 6 || timeOfDay > 20) {
      return new THREE.Color(0x0B1426); // Night
    } else if (timeOfDay < 8 || timeOfDay > 18) {
      return new THREE.Color(0xFF6347); // Golden hour
    } else {
      return new THREE.Color(0x87CEEB); // Day
    }
  };
  
  const setupAtmosphere = useCallback((scene: THREE.Scene, preset: LightingPreset) => {
    // Add fog for atmospheric perspective
    if (preset.fogDensity > 0) {
      const fog = new THREE.FogExp2(parseInt(preset.fogColor.replace('#', '0x')), preset.fogDensity);
      scene.fog = fog;
    } else {
      scene.fog = null;
    }
  }, []);

  // Advanced Material System
  const createMaterial = useCallback((materialId: string, customRepeat?: [number, number]): THREE.Material => {
    // Check cache first for performance
    const cacheKey = `${materialId}_${customRepeat ? customRepeat.join('_') : 'default'}`;
    if (materialCacheRef.current.has(cacheKey)) {
      return materialCacheRef.current.get(cacheKey)!.clone();
    }

    const materialDef = materials.find(m => m.id === materialId);
    if (!materialDef) {
      const fallback = new THREE.MeshStandardMaterial({ color: 0x808080, wireframe: showWireframe });
      materialCacheRef.current.set(cacheKey, fallback);
      return fallback;
    }

    const materialProps: any = {
      color: materialDef.color,
      roughness: materialDef.roughness,
      metalness: materialDef.metalness,
      wireframe: showWireframe,
      side: THREE.FrontSide
    };
    
    // Advanced material properties
    if (materialDef.clearcoat !== undefined) {
      materialProps.clearcoat = materialDef.clearcoat;
      materialProps.clearcoatRoughness = materialDef.clearcoatRoughness || 0.1;
    }
    
    if (materialDef.transmission !== undefined) {
      materialProps.transmission = materialDef.transmission;
      materialProps.thickness = materialDef.thickness || 0.5;
      materialProps.ior = materialDef.ior || 1.5;
    }
    
    if (materialDef.emissive) {
      materialProps.emissive = materialDef.emissive;
      materialProps.emissiveIntensity = materialDef.emissiveIntensity || 1.0;
    }
    
    if (materialDef.transparent) {
      materialProps.transparent = true;
      materialProps.opacity = materialDef.opacity || 1.0;
    }
    
    if (materialDef.envMapIntensity !== undefined) {
      materialProps.envMapIntensity = materialDef.envMapIntensity;
    }

    const material = new THREE.MeshStandardMaterial(materialProps);

    // Cache the material
    materialCacheRef.current.set(cacheKey, material);
    
    return material;
  }, [materials, showWireframe]);

  // Enhanced Cabin Geometry Creation
  const createCabinGeometry = (scene: THREE.Scene) => {
    const group = new THREE.Group();
    
    // Get cabin dimensions
    const width = Number(projectData?.width) || 24;
    const length = Number(projectData?.length) || 32;
    const height = Number(projectData?.height) || 14;
    const style = projectData?.designData?.style || 'standard';

    // Create enhanced foundation
    createFoundation(group, width, length);
    
    // Create walls based on style
    if (style === 'a-frame') {
      createAFrameStructure(group, width, length, height);
    } else if (style === 'log') {
      createLogCabinStructure(group, width, length, height);
    } else {
      createStandardStructure(group, width, length, height);
    }

    // Create professional roof
    createRoof(group, width, length, height, style);

    // Add professional windows and doors
    addWindowsAndDoors(group, width, length, height);

    // Add enhanced interior elements
    addInteriorElements(group, width, length);

    scene.add(group);
  };

  const createFoundation = (group: THREE.Group, width: number, length: number) => {
    const foundationGeometry = new THREE.BoxGeometry(width + 2, 3, length + 2);
    const foundationMaterial = createMaterial('fieldstone-foundation', [2, 2]);
    const foundation = new THREE.Mesh(foundationGeometry, foundationMaterial);
    foundation.position.y = -1.5;
    foundation.receiveShadow = true;
    foundation.castShadow = false;
    
    foundation.userData = { type: 'foundation', materialId: 'fieldstone-foundation' };
    
    group.add(foundation);
  };

  const createStandardStructure = (group: THREE.Group, width: number, length: number, height: number) => {
    const wallThickness = 0.5;
    
    // Front wall with detailed siding
    const frontWallGeometry = new THREE.BoxGeometry(width, height, wallThickness);
    const wallMaterial = createMaterial('cedar-siding-natural', [8, 4]);
    const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
    frontWall.position.z = -length/2;
    frontWall.position.y = height/2;
    frontWall.castShadow = true;
    frontWall.receiveShadow = true;
    frontWall.userData = { type: 'wall', face: 'front', materialId: 'cedar-siding-natural' };
    group.add(frontWall);

    // Back wall
    const backWall = new THREE.Mesh(frontWallGeometry, wallMaterial.clone());
    backWall.position.z = length/2;
    backWall.position.y = height/2;
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    backWall.userData = { type: 'wall', face: 'back', materialId: 'cedar-siding-natural' };
    group.add(backWall);

    // Side walls
    const sideWallGeometry = new THREE.BoxGeometry(wallThickness, height, length);
    const sideWallMaterial = createMaterial('cedar-siding-natural', [4, 4]);
    
    const leftWall = new THREE.Mesh(sideWallGeometry, sideWallMaterial);
    leftWall.position.x = -width/2;
    leftWall.position.y = height/2;
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    leftWall.userData = { type: 'wall', face: 'left', materialId: 'cedar-siding-natural' };
    group.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeometry, sideWallMaterial.clone());
    rightWall.position.x = width/2;
    rightWall.position.y = height/2;
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    rightWall.userData = { type: 'wall', face: 'right', materialId: 'cedar-siding-natural' };
    group.add(rightWall);
  };

  const createAFrameStructure = (group: THREE.Group, width: number, length: number, height: number) => {
    // A-frame implementation
    const frontShape = new THREE.Shape();
    frontShape.moveTo(-width/2, 0);
    frontShape.lineTo(0, height);
    frontShape.lineTo(width/2, 0);
    frontShape.lineTo(-width/2, 0);

    const frontGeometry = new THREE.ExtrudeGeometry(frontShape, {
      depth: 0.5,
      bevelEnabled: false
    });

    const wallMaterial = createMaterial('cedar-siding-natural');
    const frontWall = new THREE.Mesh(frontGeometry, wallMaterial);
    frontWall.position.z = -length/2;
    frontWall.castShadow = true;
    group.add(frontWall);

    const backWall = frontWall.clone();
    backWall.position.z = length/2;
    backWall.rotation.y = Math.PI;
    group.add(backWall);
  };

  const createLogCabinStructure = (group: THREE.Group, width: number, length: number, height: number) => {
    const logRadius = 0.4;
    const logCount = Math.floor(height / (logRadius * 2));

    for (let i = 0; i < logCount; i++) {
      const y = i * logRadius * 2 + logRadius;

      const frontLogGeometry = new THREE.CylinderGeometry(logRadius, logRadius, width);
      const logMaterial = createMaterial('pine-logs');
      const frontLog = new THREE.Mesh(frontLogGeometry, logMaterial);
      frontLog.rotation.z = Math.PI / 2;
      frontLog.position.z = -length/2;
      frontLog.position.y = y;
      frontLog.castShadow = true;
      group.add(frontLog);

      const backLog = frontLog.clone();
      backLog.position.z = length/2;
      group.add(backLog);

      const sideLogGeometry = new THREE.CylinderGeometry(logRadius, logRadius, length);
      const leftLog = new THREE.Mesh(sideLogGeometry, logMaterial.clone());
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
    const roofMaterial = createMaterial('corrugated-steel-roof', [6, 1]);

    if (style === 'a-frame') {
      return;
    }

    // Enhanced gabled roof
    const roofOverhang = 3;
    const roofPitch = 6;
    
    const leftRoofGeometry = new THREE.PlaneGeometry(
      Math.sqrt((width/2 + roofOverhang) ** 2 + roofPitch ** 2),
      length + (roofOverhang * 2)
    );
    
    const leftRoof = new THREE.Mesh(leftRoofGeometry, roofMaterial);
    leftRoof.position.set(-width/4, height + roofPitch/2, 0);
    leftRoof.rotation.z = Math.atan2(roofPitch, width/2 + roofOverhang);
    leftRoof.castShadow = true;
    leftRoof.receiveShadow = true;
    leftRoof.userData = { type: 'roof', section: 'left', materialId: 'corrugated-steel-roof' };
    group.add(leftRoof);

    const rightRoof = new THREE.Mesh(leftRoofGeometry, roofMaterial.clone());
    rightRoof.position.set(width/4, height + roofPitch/2, 0);
    rightRoof.rotation.z = -Math.atan2(roofPitch, width/2 + roofOverhang);
    rightRoof.castShadow = true;
    rightRoof.receiveShadow = true;
    rightRoof.userData = { type: 'roof', section: 'right', materialId: 'corrugated-steel-roof' };
    group.add(rightRoof);
  };

  const addWindowsAndDoors = (group: THREE.Group, width: number, length: number, height: number) => {
    // Professional door
    const doorWidth = 3;
    const doorHeight = 7;
    
    const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, 0.15);
    const doorMaterial = createMaterial('cedar-siding-natural', [1, 4]);
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, doorHeight/2, -length/2 - 0.1);
    door.userData = { type: 'door', materialId: 'cedar-siding-natural' };
    group.add(door);

    // Professional windows
    const windowConfigs = [
      { pos: [-width/3, height * 0.6, -length/2 - 0.1], size: [4, 3] },
      { pos: [width/3, height * 0.6, -length/2 - 0.1], size: [4, 3] },
      { pos: [-width/2 - 0.1, height * 0.6, 0], size: [3, 2.5] },
      { pos: [width/2 + 0.1, height * 0.6, 0], size: [3, 2.5] },
    ];
    
    windowConfigs.forEach((config, index) => {
      const [x, y, z] = config.pos;
      const [w, h] = config.size;
      
      const glassGeometry = new THREE.BoxGeometry(w, h, 0.05);
      const glassMaterial = createMaterial('clear-window-glass');
      const glass = new THREE.Mesh(glassGeometry, glassMaterial);
      glass.position.set(x, y, z);
      glass.userData = { type: 'glass', materialId: 'clear-window-glass' };
      group.add(glass);
    });
  };

  const addInteriorElements = (group: THREE.Group, width: number, length: number) => {
    // Professional hardwood flooring
    const floorGeometry = new THREE.BoxGeometry(width - 1, 0.75, length - 1);
    const floorMaterial = createMaterial('oak-flooring', [12, 12]);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = 0.375;
    floor.receiveShadow = true;
    floor.userData = { type: 'floor', materialId: 'oak-flooring' };
    group.add(floor);

    // Interior ceiling
    const ceilingGeometry = new THREE.BoxGeometry(width - 1, 0.25, length - 1);
    const ceilingMaterial = createMaterial('cedar-siding-natural', [8, 8]);
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.position.y = Number(projectData?.height || 14) - 0.125;
    ceiling.receiveShadow = true;
    ceiling.userData = { type: 'ceiling' };
    group.add(ceiling);
  };

  // Event Handlers
  const handleTimeChange = useCallback((value: number[]) => {
    const newTime = value[0];
    setTimeOfDay(newTime);
    
    if (sceneRef.current) {
      setupLighting(sceneRef.current);
    }
  }, [setupLighting]);
  
  const handleMaterialChange = useCallback((objectType: string, materialId: string) => {
    if (!sceneRef.current) return;
    
    sceneRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && 
          child.userData.type === objectType) {
        const newMaterial = createMaterial(materialId);
        child.material = newMaterial;
        child.userData.materialId = materialId;
      }
    });
  }, [createMaterial]);
  
  const toggleInteriorLights = useCallback((enabled: boolean) => {
    setInteriorLightsOn(enabled);
    if (sceneRef.current) {
      setupLighting(sceneRef.current);
    }
  }, [setupLighting]);
  
  const updateWeatherCondition = useCallback((weather: string) => {
    setWeatherCondition(weather);
    if (sceneRef.current) {
      setupLighting(sceneRef.current);
    }
  }, [setupLighting]);

  const takeScreenshot = () => {
    if (!rendererRef.current) return;

    rendererRef.current.render(sceneRef.current!, cameraRef.current!);
    const dataURL = rendererRef.current.domElement.toDataURL('image/png');
    
    const link = document.createElement('a');
    link.download = 'cabin-3d-view.png';
    link.href = dataURL;
    link.click();
  };

  const handleViewModeChange = (mode: 'orbit' | 'walk' | 'cinematic') => {
    setViewMode(mode);
    
    if (!cameraRef.current) return;

    if (mode === 'orbit') {
      cameraRef.current.position.set(80, 40, 80);
    } else if (mode === 'walk') {
      cameraRef.current.position.set(0, 6, 0);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Advanced 3D Controls Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 p-3">
        <div className="flex items-center justify-between">
          {/* Camera Controls */}
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
          </div>

          {/* Time and Weather Controls */}
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
              <span className="text-xs min-w-[40px]">
                {Math.floor(timeOfDay)}:{(timeOfDay % 1 * 60).toFixed(0).padStart(2, '0')}
              </span>
            </div>

            <Select value={weatherCondition} onValueChange={updateWeatherCondition}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weatherConditions.map((weather) => (
                  <SelectItem key={weather.id} value={weather.id}>
                    <div className="flex items-center space-x-2">
                      <weather.icon className="w-4 h-4" />
                      <span>{weather.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLightingPanelOpen(!lightingPanelOpen)}
              className="text-gray-300 hover:text-white"
            >
              <Lightbulb className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMaterialPanelOpen(!materialPanelOpen)}
              className="text-gray-300 hover:text-white"
            >
              <Palette className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={takeScreenshot}
              className="text-gray-300 hover:text-white"
            >
              <Camera className="w-4 h-4" />
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

        {/* Advanced Lighting Panel */}
        {lightingPanelOpen && (
          <Card className="absolute top-4 left-4 w-80 bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center">
                <Lightbulb className="w-4 h-4 mr-2" />
                Lighting Controls
              </h3>
              
              <Tabs value="lighting" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="lighting">Lighting</TabsTrigger>
                  <TabsTrigger value="environment">Environment</TabsTrigger>
                </TabsList>
                
                <TabsContent value="lighting" className="space-y-4">
                  <div>
                    <label className="text-white text-sm mb-2 block">Lighting Preset</label>
                    <Select value={lightingPreset} onValueChange={setLightingPreset}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {lightingPresets.map((preset) => (
                          <SelectItem key={preset.id} value={preset.id}>
                            {preset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">Interior Lights</span>
                    <Switch 
                      checked={interiorLightsOn} 
                      onCheckedChange={toggleInteriorLights}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">Shadows</span>
                    <Switch 
                      checked={shadowsEnabled} 
                      onCheckedChange={setShadowsEnabled}
                    />
                  </div>
                  
                  <div>
                    <label className="text-white text-sm mb-2 block">Season</label>
                    <Select value={season} onValueChange={setSeason}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spring">Spring</SelectItem>
                        <SelectItem value="summer">Summer</SelectItem>
                        <SelectItem value="autumn">Autumn</SelectItem>
                        <SelectItem value="winter">Winter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                
                <TabsContent value="environment" className="space-y-4">
                  <div>
                    <label className="text-white text-sm mb-2 block">Environment Intensity</label>
                    <Slider
                      value={[environmentIntensity]}
                      onValueChange={(value) => setEnvironmentIntensity(value[0])}
                      max={2}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">Auto Rotate</span>
                    <Switch 
                      checked={autoRotate} 
                      onCheckedChange={setAutoRotate}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Advanced Material Panel */}
        {materialPanelOpen && (
          <Card className="absolute top-4 right-4 w-80 bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center">
                <Palette className="w-4 h-4 mr-2" />
                Material Library
              </h3>
              
              <Tabs defaultValue="wood" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="wood">Wood</TabsTrigger>
                  <TabsTrigger value="metal">Metal</TabsTrigger>
                  <TabsTrigger value="stone">Stone</TabsTrigger>
                  <TabsTrigger value="glass">Glass</TabsTrigger>
                </TabsList>
                
                {['wood', 'metal', 'stone', 'glass'].map(category => (
                  <TabsContent key={category} value={category} className="space-y-2">
                    {materials
                      .filter(m => m.category === category)
                      .map((material) => (
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
                  </TabsContent>
                ))}
              </Tabs>
              
              {selectedMaterial && (
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <p className="text-white text-sm mb-2">Apply to:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleMaterialChange('wall', selectedMaterial.id)}
                    >
                      Walls
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleMaterialChange('roof', selectedMaterial.id)}
                    >
                      Roof
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleMaterialChange('foundation', selectedMaterial.id)}
                    >
                      Foundation
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleMaterialChange('floor', selectedMaterial.id)}
                    >
                      Floor
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Performance Info */}
        <div className="absolute bottom-4 right-4 bg-gray-800 bg-opacity-90 rounded-lg p-2 text-gray-300 text-xs">
          Professional 3D Rendering Active
        </div>

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
      </div>
    </div>
  );
}