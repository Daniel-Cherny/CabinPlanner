/**
 * Professional Grid System and Snapping Mechanics
 * Provides comprehensive grid rendering, snap-to-grid functionality, 
 * angle constraints, and visual feedback for Professional2DEditor
 */

export interface Point {
  x: number;
  y: number;
}

export interface GridConfig {
  size: number;           // Grid size in pixels (1 foot at base zoom)
  showGrid: boolean;      // Show/hide grid
  snapToGrid: boolean;    // Enable/disable snapping
  showMinorGrid: boolean; // Show minor grid lines (6" increments)
  showMajorGrid: boolean; // Show major grid lines (1' increments)
  dynamicScaling: boolean; // Scale grid based on zoom
  minGridOpacity: number; // Minimum opacity for grid lines
  maxGridOpacity: number; // Maximum opacity for grid lines
}

export interface SnapConfig {
  enabled: boolean;
  gridSnap: boolean;         // Snap to grid intersections
  pointSnap: boolean;        // Snap to existing points
  lineSnap: boolean;         // Snap to lines/edges
  angleConstraints: boolean; // Enable angle constraints
  magneticSnap: boolean;     // Magnetic snap points
  snapDistance: number;      // Maximum snap distance in pixels
  angleStep: number;         // Angle constraint step (45°, 90°)
}

export interface VisualGuides {
  showSnapIndicator: boolean;
  showAngleGuide: boolean;
  showDistanceGuide: boolean;
  showAlignmentGuide: boolean;
  snapIndicatorSize: number;
  guideLineColor: string;
  snapPointColor: string;
  alignmentColor: string;
}

export interface GridState {
  config: GridConfig;
  snapConfig: SnapConfig;
  visualGuides: VisualGuides;
  zoom: number;
  panOffset: Point;
  isOrthogonalMode: boolean; // Shift key constraint
  currentSnapPoint: Point | null;
  nearbySnapPoints: Point[];
  activeGuides: Guide[];
}

export interface Guide {
  id: string;
  type: 'horizontal' | 'vertical' | 'angle' | 'distance';
  start: Point;
  end: Point;
  value?: number; // For distance guides
  angle?: number; // For angle guides
}

export interface SnapResult {
  point: Point;
  snapped: boolean;
  snapType: 'grid' | 'point' | 'line' | 'angle' | 'none';
  snapTarget?: Point;
  constrainedAngle?: number;
}

/**
 * Grid System Class
 */
export class GridSystem {
  private state: GridState;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(config: Partial<GridConfig> = {}) {
    this.state = {
      config: {
        size: 12, // 1 foot = 12 pixels at base zoom
        showGrid: true,
        snapToGrid: true,
        showMinorGrid: true,
        showMajorGrid: true,
        dynamicScaling: true,
        minGridOpacity: 0.1,
        maxGridOpacity: 0.4,
        ...config
      },
      snapConfig: {
        enabled: true,
        gridSnap: true,
        pointSnap: true,
        lineSnap: true,
        angleConstraints: true,
        magneticSnap: true,
        snapDistance: 20,
        angleStep: 45
      },
      visualGuides: {
        showSnapIndicator: true,
        showAngleGuide: true,
        showDistanceGuide: true,
        showAlignmentGuide: true,
        snapIndicatorSize: 8,
        guideLineColor: '#3b82f6',
        snapPointColor: '#ef4444',
        alignmentColor: '#10b981'
      },
      zoom: 1,
      panOffset: { x: 0, y: 0 },
      isOrthogonalMode: false,
      currentSnapPoint: null,
      nearbySnapPoints: [],
      activeGuides: []
    };
  }

  /**
   * Initialize the grid system with canvas
   */
  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  /**
   * Update grid state
   */
  updateState(updates: Partial<GridState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Update grid configuration
   */
  updateConfig(config: Partial<GridConfig>): void {
    this.state.config = { ...this.state.config, ...config };
  }

  /**
   * Update snap configuration
   */
  updateSnapConfig(config: Partial<SnapConfig>): void {
    this.state.snapConfig = { ...this.state.snapConfig, ...config };
  }

  /**
   * Set zoom level and adjust grid accordingly
   */
  setZoom(zoom: number): void {
    this.state.zoom = zoom;
  }

  /**
   * Set pan offset
   */
  setPanOffset(offset: Point): void {
    this.state.panOffset = offset;
  }

  /**
   * Toggle orthogonal mode (shift key constraint)
   */
  setOrthogonalMode(enabled: boolean): void {
    this.state.isOrthogonalMode = enabled;
  }

  /**
   * Calculate dynamic grid spacing based on zoom level
   */
  private calculateGridSpacing(): { major: number; minor: number; opacity: number } {
    const { config, zoom } = this.state;
    const baseSize = config.size * zoom;
    
    // Adjust grid spacing based on zoom to maintain readability
    let majorSpacing = baseSize;
    let minorSpacing = baseSize / 2;
    
    // Scale grid for very small or large zoom levels
    if (baseSize < 8) {
      // Zoom out - increase grid spacing
      majorSpacing = baseSize * Math.ceil(8 / baseSize);
      minorSpacing = majorSpacing / 2;
    } else if (baseSize > 100) {
      // Zoom in - add more subdivisions
      majorSpacing = baseSize;
      minorSpacing = baseSize / 4;
    }

    // Calculate opacity based on zoom
    const { minGridOpacity, maxGridOpacity } = config;
    const opacity = Math.max(
      minGridOpacity,
      Math.min(maxGridOpacity, zoom * 0.3)
    );

    return { major: majorSpacing, minor: minorSpacing, opacity };
  }

  /**
   * Draw the grid system
   */
  drawGrid(): void {
    if (!this.ctx || !this.canvas || !this.state.config.showGrid) return;

    const { width, height } = this.canvas;
    const { major, minor, opacity } = this.calculateGridSpacing();
    const { panOffset } = this.state;

    this.ctx.save();
    this.ctx.scale(this.state.zoom, this.state.zoom);
    this.ctx.translate(panOffset.x, panOffset.y);

    // Calculate visible grid bounds
    const startX = Math.floor(-panOffset.x / major) * major;
    const startY = Math.floor(-panOffset.y / major) * major;
    const endX = startX + (width / this.state.zoom) + major;
    const endY = startY + (height / this.state.zoom) + major;

    // Draw minor grid lines
    if (this.state.config.showMinorGrid && minor >= 4) {
      this.ctx.strokeStyle = `rgba(156, 163, 175, ${opacity * 0.5})`;
      this.ctx.lineWidth = 0.5 / this.state.zoom;
      this.ctx.setLineDash([]);

      // Vertical minor lines
      for (let x = startX; x <= endX; x += minor) {
        if (x % major !== 0) {
          this.ctx.beginPath();
          this.ctx.moveTo(x, startY);
          this.ctx.lineTo(x, endY);
          this.ctx.stroke();
        }
      }

      // Horizontal minor lines
      for (let y = startY; y <= endY; y += minor) {
        if (y % major !== 0) {
          this.ctx.beginPath();
          this.ctx.moveTo(startX, y);
          this.ctx.lineTo(endX, y);
          this.ctx.stroke();
        }
      }
    }

    // Draw major grid lines
    if (this.state.config.showMajorGrid) {
      this.ctx.strokeStyle = `rgba(107, 114, 128, ${opacity})`;
      this.ctx.lineWidth = 1 / this.state.zoom;
      this.ctx.setLineDash([]);

      // Vertical major lines
      for (let x = startX; x <= endX; x += major) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, startY);
        this.ctx.lineTo(x, endY);
        this.ctx.stroke();
      }

      // Horizontal major lines
      for (let y = startY; y <= endY; y += major) {
        this.ctx.beginPath();
        this.ctx.moveTo(startX, y);
        this.ctx.lineTo(endX, y);
        this.ctx.stroke();
      }
    }

    this.ctx.restore();
  }

  /**
   * Snap a point to grid or other elements
   */
  snapPoint(point: Point, existingPoints: Point[] = [], lines: { start: Point; end: Point }[] = []): SnapResult {
    if (!this.state.snapConfig.enabled) {
      return { point, snapped: false, snapType: 'none' };
    }

    let bestSnap: SnapResult = { point, snapped: false, snapType: 'none' };
    let minDistance = this.state.snapConfig.snapDistance;

    // Grid snapping
    if (this.state.snapConfig.gridSnap && this.state.config.snapToGrid) {
      const gridPoint = this.snapToGrid(point);
      const distance = this.distance(point, gridPoint);
      if (distance < minDistance) {
        bestSnap = {
          point: gridPoint,
          snapped: true,
          snapType: 'grid',
          snapTarget: gridPoint
        };
        minDistance = distance;
      }
    }

    // Point snapping (magnetic snap points)
    if (this.state.snapConfig.pointSnap && this.state.snapConfig.magneticSnap) {
      for (const existingPoint of existingPoints) {
        const distance = this.distance(point, existingPoint);
        if (distance < minDistance) {
          bestSnap = {
            point: existingPoint,
            snapped: true,
            snapType: 'point',
            snapTarget: existingPoint
          };
          minDistance = distance;
        }
      }
    }

    // Line snapping
    if (this.state.snapConfig.lineSnap) {
      for (const line of lines) {
        const closestPoint = this.closestPointOnLine(point, line.start, line.end);
        const distance = this.distance(point, closestPoint);
        if (distance < minDistance) {
          bestSnap = {
            point: closestPoint,
            snapped: true,
            snapType: 'line',
            snapTarget: closestPoint
          };
          minDistance = distance;
        }
      }
    }

    // Apply angle constraints if in drawing mode
    if (this.state.snapConfig.angleConstraints && existingPoints.length > 0) {
      const constrainedPoint = this.applyAngleConstraints(bestSnap.point, existingPoints[0]);
      if (constrainedPoint) {
        bestSnap.point = constrainedPoint.point;
        bestSnap.constrainedAngle = constrainedPoint.angle;
      }
    }

    // Update current snap point for visual feedback
    this.state.currentSnapPoint = bestSnap.snapped ? bestSnap.point : null;

    return bestSnap;
  }

  /**
   * Snap to grid intersection
   */
  snapToGrid(point: Point): Point {
    const gridSize = this.state.config.size;
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    };
  }

  /**
   * Apply angle constraints (45°, 90°)
   */
  private applyAngleConstraints(point: Point, startPoint: Point): { point: Point; angle: number } | null {
    if (!this.state.snapConfig.angleConstraints) return null;

    const dx = point.x - startPoint.x;
    const dy = point.y - startPoint.y;
    const angle = Math.atan2(dy, dx);
    const degrees = (angle * 180 / Math.PI + 360) % 360;
    
    const angleStep = this.state.snapConfig.angleStep;
    const constrainedDegrees = Math.round(degrees / angleStep) * angleStep;
    const constrainedAngle = constrainedDegrees * Math.PI / 180;
    
    const distance = Math.sqrt(dx * dx + dy * dy);
    const constrainedPoint = {
      x: startPoint.x + Math.cos(constrainedAngle) * distance,
      y: startPoint.y + Math.sin(constrainedAngle) * distance
    };

    // Only apply constraint if it's significantly different
    const angleDifference = Math.abs(degrees - constrainedDegrees);
    if (angleDifference > 5 && angleDifference < 355) {
      return { point: constrainedPoint, angle: constrainedDegrees };
    }

    return null;
  }

  /**
   * Find closest point on a line
   */
  private closestPointOnLine(point: Point, lineStart: Point, lineEnd: Point): Point {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) return lineStart;

    let param = dot / lenSq;
    param = Math.max(0, Math.min(1, param));

    return {
      x: lineStart.x + param * C,
      y: lineStart.y + param * D
    };
  }

  /**
   * Calculate distance between two points
   */
  private distance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  /**
   * Draw visual guides and snap feedback
   */
  drawVisualGuides(): void {
    if (!this.ctx) return;

    this.ctx.save();
    this.ctx.scale(this.state.zoom, this.state.zoom);
    this.ctx.translate(this.state.panOffset.x, this.state.panOffset.y);

    // Draw active guides
    this.drawActiveGuides();

    // Draw snap indicator
    this.drawSnapIndicator();

    // Draw alignment guides
    this.drawAlignmentGuides();

    this.ctx.restore();
  }

  /**
   * Draw active guides (angle, distance, alignment)
   */
  private drawActiveGuides(): void {
    if (!this.ctx || !this.state.visualGuides.showAngleGuide) return;

    const { guideLineColor } = this.state.visualGuides;
    
    this.ctx.strokeStyle = guideLineColor;
    this.ctx.lineWidth = 1 / this.state.zoom;
    this.ctx.setLineDash([5, 5]);

    for (const guide of this.state.activeGuides) {
      this.ctx.beginPath();
      this.ctx.moveTo(guide.start.x, guide.start.y);
      this.ctx.lineTo(guide.end.x, guide.end.y);
      this.ctx.stroke();

      // Draw guide labels
      if (guide.type === 'distance' && guide.value) {
        this.drawGuideLabel(
          { x: (guide.start.x + guide.end.x) / 2, y: (guide.start.y + guide.end.y) / 2 },
          `${Math.round(guide.value / this.state.config.size * 12) / 12}'`
        );
      } else if (guide.type === 'angle' && guide.angle !== undefined) {
        this.drawGuideLabel(
          guide.end,
          `${Math.round(guide.angle)}°`
        );
      }
    }
  }

  /**
   * Draw snap indicator at current snap point
   */
  private drawSnapIndicator(): void {
    if (!this.ctx || !this.state.currentSnapPoint || !this.state.visualGuides.showSnapIndicator) return;

    const { snapPointColor, snapIndicatorSize } = this.state.visualGuides;
    const { currentSnapPoint } = this.state;
    const size = snapIndicatorSize / this.state.zoom;

    this.ctx.strokeStyle = snapPointColor;
    this.ctx.lineWidth = 2 / this.state.zoom;
    this.ctx.setLineDash([]);

    // Draw crosshair
    this.ctx.beginPath();
    this.ctx.moveTo(currentSnapPoint.x - size, currentSnapPoint.y);
    this.ctx.lineTo(currentSnapPoint.x + size, currentSnapPoint.y);
    this.ctx.moveTo(currentSnapPoint.x, currentSnapPoint.y - size);
    this.ctx.lineTo(currentSnapPoint.x, currentSnapPoint.y + size);
    this.ctx.stroke();

    // Draw circle
    this.ctx.beginPath();
    this.ctx.arc(currentSnapPoint.x, currentSnapPoint.y, size, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  /**
   * Draw alignment guides
   */
  private drawAlignmentGuides(): void {
    if (!this.ctx || !this.state.visualGuides.showAlignmentGuide) return;

    // This would show alignment guides when objects are near alignment
    // Implementation would depend on the specific objects being aligned
  }

  /**
   * Draw guide label
   */
  private drawGuideLabel(position: Point, text: string): void {
    if (!this.ctx) return;

    this.ctx.fillStyle = this.state.visualGuides.guideLineColor;
    this.ctx.font = `${12 / this.state.zoom}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';
    
    // Background
    const metrics = this.ctx.measureText(text);
    const padding = 4 / this.state.zoom;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.fillRect(
      position.x - metrics.width / 2 - padding,
      position.y - 12 / this.state.zoom - padding,
      metrics.width + padding * 2,
      12 / this.state.zoom + padding * 2
    );
    
    // Text
    this.ctx.fillStyle = this.state.visualGuides.guideLineColor;
    this.ctx.fillText(text, position.x, position.y);
  }

  /**
   * Add a temporary guide
   */
  addGuide(guide: Guide): void {
    this.state.activeGuides.push(guide);
  }

  /**
   * Clear all active guides
   */
  clearGuides(): void {
    this.state.activeGuides = [];
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenPoint: Point): Point {
    return {
      x: (screenPoint.x / this.state.zoom) - this.state.panOffset.x,
      y: (screenPoint.y / this.state.zoom) - this.state.panOffset.y
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldPoint: Point): Point {
    return {
      x: (worldPoint.x + this.state.panOffset.x) * this.state.zoom,
      y: (worldPoint.y + this.state.panOffset.y) * this.state.zoom
    };
  }

  /**
   * Get current grid configuration
   */
  getConfig(): GridConfig {
    return { ...this.state.config };
  }

  /**
   * Get current snap configuration
   */
  getSnapConfig(): SnapConfig {
    return { ...this.state.snapConfig };
  }

  /**
   * Get current state
   */
  getState(): GridState {
    return { ...this.state };
  }

  /**
   * Toggle grid visibility
   */
  toggleGrid(): void {
    this.state.config.showGrid = !this.state.config.showGrid;
  }

  /**
   * Toggle snap to grid
   */
  toggleSnap(): void {
    this.state.config.snapToGrid = !this.state.config.snapToGrid;
  }

  /**
   * Set grid size
   */
  setGridSize(size: number): void {
    this.state.config.size = size;
  }

  /**
   * Calculate snap distance based on zoom level
   */
  getSnapDistance(): number {
    return this.state.snapConfig.snapDistance / this.state.zoom;
  }
}