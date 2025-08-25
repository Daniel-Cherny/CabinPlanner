/**
 * React Hook for Grid System Integration
 * Provides easy integration of the grid and snapping system with React components
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { GridSystem, Point, GridConfig, SnapConfig, SnapResult } from '@/utils/gridSnapping';
import { SmartGuidesGenerator, MagneticSnapGenerator, OrthogonalHelper, SnapPoint, SmartGuide } from '@/utils/snapHelpers';

interface UseGridSystemOptions {
  initialGridConfig?: Partial<GridConfig>;
  initialSnapConfig?: Partial<SnapConfig>;
  enableSmartGuides?: boolean;
  enableMagneticSnap?: boolean;
}

interface GridSystemState {
  gridSystem: GridSystem | null;
  smartGuides: SmartGuide[];
  snapPoints: SnapPoint[];
  isShiftPressed: boolean;
  isAltPressed: boolean;
  currentSnapResult: SnapResult | null;
}

export function useGridSystem(options: UseGridSystemOptions = {}) {
  const {
    initialGridConfig = {},
    initialSnapConfig = {},
    enableSmartGuides = true,
    enableMagneticSnap = true
  } = options;

  const gridSystemRef = useRef<GridSystem | null>(null);
  const smartGuidesGeneratorRef = useRef<SmartGuidesGenerator>(new SmartGuidesGenerator());
  const magneticSnapGeneratorRef = useRef<MagneticSnapGenerator>(new MagneticSnapGenerator());

  const [state, setState] = useState<GridSystemState>({
    gridSystem: null,
    smartGuides: [],
    snapPoints: [],
    isShiftPressed: false,
    isAltPressed: false,
    currentSnapResult: null
  });

  /**
   * Initialize grid system with canvas
   */
  const initializeGrid = useCallback((canvas: HTMLCanvasElement) => {
    if (!gridSystemRef.current) {
      gridSystemRef.current = new GridSystem(initialGridConfig);
      gridSystemRef.current.initialize(canvas);
      
      if (initialSnapConfig) {
        gridSystemRef.current.updateSnapConfig(initialSnapConfig);
      }

      setState(prev => ({ ...prev, gridSystem: gridSystemRef.current }));
    }
  }, [initialGridConfig, initialSnapConfig]);

  /**
   * Update zoom level
   */
  const setZoom = useCallback((zoom: number) => {
    gridSystemRef.current?.setZoom(zoom);
  }, []);

  /**
   * Update pan offset
   */
  const setPanOffset = useCallback((offset: Point) => {
    gridSystemRef.current?.setPanOffset(offset);
  }, []);

  /**
   * Draw grid
   */
  const drawGrid = useCallback(() => {
    gridSystemRef.current?.drawGrid();
  }, []);

  /**
   * Draw visual guides
   */
  const drawVisualGuides = useCallback(() => {
    gridSystemRef.current?.drawVisualGuides();
  }, []);

  /**
   * Snap point with comprehensive snapping
   */
  const snapPoint = useCallback((
    point: Point,
    context: {
      existingWalls?: { id: string; start: Point; end: Point }[];
      existingPoints?: Point[];
      startPoint?: Point; // For drawing operations
    } = {}
  ): SnapResult => {
    if (!gridSystemRef.current) {
      return { point, snapped: false, snapType: 'none' };
    }

    const { existingWalls = [], existingPoints = [], startPoint } = context;
    
    // Generate snap points if magnetic snap is enabled
    let allSnapPoints = existingPoints;
    if (enableMagneticSnap && existingWalls.length > 0) {
      const magneticPoints = magneticSnapGeneratorRef.current.generateWallSnapPoints(existingWalls);
      allSnapPoints = [...existingPoints, ...magneticPoints.map(sp => sp.point)];
    }

    // Convert walls to lines for line snapping
    const lines = existingWalls.map(wall => ({ start: wall.start, end: wall.end }));

    // Apply orthogonal constraint if shift is pressed
    let constrainedPoint = point;
    if (state.isShiftPressed && startPoint) {
      constrainedPoint = OrthogonalHelper.constrainOrthogonal(point, startPoint);
    }

    // Perform snapping
    const snapResult = gridSystemRef.current.snapPoint(constrainedPoint, allSnapPoints, lines);

    // Generate smart guides if enabled
    if (enableSmartGuides && existingWalls.length > 0) {
      const newSmartGuides = smartGuidesGeneratorRef.current.generateSmartGuides(
        snapResult.point,
        existingWalls,
        allSnapPoints
      );
      
      setState(prev => ({ ...prev, smartGuides: newSmartGuides }));
    }

    setState(prev => ({ ...prev, currentSnapResult: snapResult }));
    return snapResult;
  }, [enableMagneticSnap, enableSmartGuides, state.isShiftPressed]);

  /**
   * Convert screen coordinates to world coordinates
   */
  const screenToWorld = useCallback((screenPoint: Point): Point => {
    return gridSystemRef.current?.screenToWorld(screenPoint) || screenPoint;
  }, []);

  /**
   * Convert world coordinates to screen coordinates
   */
  const worldToScreen = useCallback((worldPoint: Point): Point => {
    return gridSystemRef.current?.worldToScreen(worldPoint) || worldPoint;
  }, []);

  /**
   * Toggle grid visibility
   */
  const toggleGrid = useCallback(() => {
    gridSystemRef.current?.toggleGrid();
  }, []);

  /**
   * Toggle snap functionality
   */
  const toggleSnap = useCallback(() => {
    gridSystemRef.current?.toggleSnap();
  }, []);

  /**
   * Update grid configuration
   */
  const updateGridConfig = useCallback((config: Partial<GridConfig>) => {
    gridSystemRef.current?.updateConfig(config);
  }, []);

  /**
   * Update snap configuration
   */
  const updateSnapConfig = useCallback((config: Partial<SnapConfig>) => {
    gridSystemRef.current?.updateSnapConfig(config);
  }, []);

  /**
   * Get current grid configuration
   */
  const getGridConfig = useCallback((): GridConfig | null => {
    return gridSystemRef.current?.getConfig() || null;
  }, []);

  /**
   * Get current snap configuration
   */
  const getSnapConfig = useCallback((): SnapConfig | null => {
    return gridSystemRef.current?.getSnapConfig() || null;
  }, []);

  /**
   * Clear all guides
   */
  const clearGuides = useCallback(() => {
    gridSystemRef.current?.clearGuides();
    setState(prev => ({ ...prev, smartGuides: [] }));
  }, []);

  /**
   * Handle key events for modifiers
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    setState(prev => ({
      ...prev,
      isShiftPressed: event.shiftKey,
      isAltPressed: event.altKey
    }));

    // Update orthogonal mode in grid system
    if (gridSystemRef.current) {
      gridSystemRef.current.setOrthogonalMode(event.shiftKey);
    }
  }, []);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    setState(prev => ({
      ...prev,
      isShiftPressed: event.shiftKey,
      isAltPressed: event.altKey
    }));

    // Update orthogonal mode in grid system
    if (gridSystemRef.current) {
      gridSystemRef.current.setOrthogonalMode(event.shiftKey);
    }
  }, []);

  // Set up keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  /**
   * Snap to nearest grid intersection
   */
  const snapToGrid = useCallback((point: Point): Point => {
    return gridSystemRef.current?.snapToGrid(point) || point;
  }, []);

  /**
   * Calculate distance between points with proper units
   */
  const calculateDistance = useCallback((p1: Point, p2: Point): string => {
    if (!gridSystemRef.current) return '0"';
    
    const config = gridSystemRef.current.getConfig();
    const pixelDistance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    const inches = (pixelDistance / config.size) * 12;
    const feet = Math.floor(inches / 12);
    const remainingInches = Math.round(inches % 12);

    if (feet === 0) {
      return `${remainingInches}"`;
    } else if (remainingInches === 0) {
      return `${feet}'`;
    } else {
      return `${feet}' ${remainingInches}"`;
    }
  }, []);

  /**
   * Get snap distance based on current zoom
   */
  const getSnapDistance = useCallback((): number => {
    return gridSystemRef.current?.getSnapDistance() || 20;
  }, []);

  /**
   * Check if a point is within snap distance of another
   */
  const isWithinSnapDistance = useCallback((p1: Point, p2: Point): boolean => {
    const distance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    return distance <= getSnapDistance();
  }, [getSnapDistance]);

  return {
    // Core grid system
    gridSystem: state.gridSystem,
    initializeGrid,
    drawGrid,
    drawVisualGuides,

    // Coordinate transformation
    screenToWorld,
    worldToScreen,

    // Snapping functionality
    snapPoint,
    snapToGrid,
    currentSnapResult: state.currentSnapResult,
    getSnapDistance,
    isWithinSnapDistance,

    // Configuration
    updateGridConfig,
    updateSnapConfig,
    getGridConfig,
    getSnapConfig,

    // Controls
    toggleGrid,
    toggleSnap,
    setZoom,
    setPanOffset,

    // Visual guides
    smartGuides: state.smartGuides,
    clearGuides,

    // Measurements
    calculateDistance,

    // State
    isShiftPressed: state.isShiftPressed,
    isAltPressed: state.isAltPressed,

    // Utility functions
    isGridVisible: () => getGridConfig()?.showGrid || false,
    isSnapEnabled: () => getGridConfig()?.snapToGrid || false,
    getGridSize: () => getGridConfig()?.size || 12,
    setGridSize: (size: number) => updateGridConfig({ size })
  };
}