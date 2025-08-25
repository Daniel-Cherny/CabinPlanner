/**
 * Snap Helper Utilities
 * Additional utilities for enhanced snapping functionality
 */

import { Point, Guide } from './gridSnapping';

export interface SnapPoint {
  id: string;
  point: Point;
  type: 'wall-end' | 'wall-start' | 'wall-mid' | 'intersection' | 'center' | 'corner';
  priority: number; // Higher priority = more likely to snap
  metadata?: any;
}

export interface SmartGuide {
  id: string;
  type: 'extension' | 'perpendicular' | 'parallel' | 'center' | 'tangent';
  line: { start: Point; end: Point };
  color: string;
  priority: number;
  snapPoints: Point[];
}

/**
 * Smart Guides Generator
 * Generates intelligent guides based on existing geometry
 */
export class SmartGuidesGenerator {
  private threshold: number = 5; // Angle threshold in degrees

  /**
   * Generate smart guides from existing geometry
   */
  generateSmartGuides(
    currentPoint: Point,
    walls: { start: Point; end: Point }[],
    existingPoints: Point[]
  ): SmartGuide[] {
    const guides: SmartGuide[] = [];

    // Generate extension guides
    guides.push(...this.generateExtensionGuides(currentPoint, walls));

    // Generate perpendicular guides
    guides.push(...this.generatePerpendicularGuides(currentPoint, walls));

    // Generate parallel guides
    guides.push(...this.generateParallelGuides(currentPoint, walls));

    // Generate center guides
    guides.push(...this.generateCenterGuides(currentPoint, walls, existingPoints));

    return guides.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Generate extension guides (extending existing lines)
   */
  private generateExtensionGuides(currentPoint: Point, walls: { start: Point; end: Point }[]): SmartGuide[] {
    const guides: SmartGuide[] = [];

    for (const wall of walls) {
      // Check if current point is roughly aligned with wall direction
      const wallAngle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
      
      // Extension from start
      const startExtension = this.createExtensionGuide(currentPoint, wall.start, wallAngle, 'start');
      if (startExtension) guides.push(startExtension);

      // Extension from end
      const endExtension = this.createExtensionGuide(currentPoint, wall.end, wallAngle, 'end');
      if (endExtension) guides.push(endExtension);
    }

    return guides;
  }

  /**
   * Generate perpendicular guides
   */
  private generatePerpendicularGuides(currentPoint: Point, walls: { start: Point; end: Point }[]): SmartGuide[] {
    const guides: SmartGuide[] = [];

    for (const wall of walls) {
      const wallAngle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
      const perpAngle = wallAngle + Math.PI / 2;

      // Perpendicular from wall midpoint
      const midPoint = {
        x: (wall.start.x + wall.end.x) / 2,
        y: (wall.start.y + wall.end.y) / 2
      };

      if (this.isPointAlignedWithAngle(currentPoint, midPoint, perpAngle)) {
        guides.push({
          id: `perp-${wall.start.x}-${wall.start.y}-mid`,
          type: 'perpendicular',
          line: {
            start: midPoint,
            end: this.extendPointInDirection(midPoint, perpAngle, 1000)
          },
          color: '#10b981',
          priority: 8,
          snapPoints: [midPoint]
        });
      }
    }

    return guides;
  }

  /**
   * Generate parallel guides
   */
  private generateParallelGuides(currentPoint: Point, walls: { start: Point; end: Point }[]): SmartGuide[] {
    const guides: SmartGuide[] = [];

    for (const wall of walls) {
      const wallAngle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
      
      // Create parallel line through current point
      const parallelStart = this.extendPointInDirection(currentPoint, wallAngle, -500);
      const parallelEnd = this.extendPointInDirection(currentPoint, wallAngle, 500);

      guides.push({
        id: `parallel-${wall.start.x}-${wall.start.y}`,
        type: 'parallel',
        line: { start: parallelStart, end: parallelEnd },
        color: '#8b5cf6',
        priority: 6,
        snapPoints: []
      });
    }

    return guides;
  }

  /**
   * Generate center guides
   */
  private generateCenterGuides(
    currentPoint: Point,
    walls: { start: Point; end: Point }[],
    existingPoints: Point[]
  ): SmartGuide[] {
    const guides: SmartGuide[] = [];

    // Center between two points
    for (let i = 0; i < existingPoints.length; i++) {
      for (let j = i + 1; j < existingPoints.length; j++) {
        const center = {
          x: (existingPoints[i].x + existingPoints[j].x) / 2,
          y: (existingPoints[i].y + existingPoints[j].y) / 2
        };

        const distance = this.distance(currentPoint, center);
        if (distance < 50) { // Within reasonable distance
          guides.push({
            id: `center-${i}-${j}`,
            type: 'center',
            line: { start: center, end: center },
            color: '#f59e0b',
            priority: 7,
            snapPoints: [center]
          });
        }
      }
    }

    return guides;
  }

  /**
   * Create extension guide if point is aligned
   */
  private createExtensionGuide(
    currentPoint: Point,
    wallPoint: Point,
    wallAngle: number,
    type: 'start' | 'end'
  ): SmartGuide | null {
    if (this.isPointAlignedWithAngle(currentPoint, wallPoint, wallAngle)) {
      const extendedPoint = this.extendPointInDirection(wallPoint, wallAngle, 1000);
      const backwardPoint = this.extendPointInDirection(wallPoint, wallAngle + Math.PI, 1000);

      return {
        id: `ext-${wallPoint.x}-${wallPoint.y}-${type}`,
        type: 'extension',
        line: { start: backwardPoint, end: extendedPoint },
        color: '#3b82f6',
        priority: 9,
        snapPoints: [wallPoint]
      };
    }
    return null;
  }

  /**
   * Check if point is aligned with angle from reference point
   */
  private isPointAlignedWithAngle(point: Point, refPoint: Point, angle: number): boolean {
    const pointAngle = Math.atan2(point.y - refPoint.y, point.x - refPoint.x);
    const angleDiff = Math.abs(this.normalizeAngle(pointAngle - angle));
    return angleDiff < (this.threshold * Math.PI / 180) || angleDiff > Math.PI - (this.threshold * Math.PI / 180);
  }

  /**
   * Extend point in given direction
   */
  private extendPointInDirection(point: Point, angle: number, distance: number): Point {
    return {
      x: point.x + Math.cos(angle) * distance,
      y: point.y + Math.sin(angle) * distance
    };
  }

  /**
   * Normalize angle to [-PI, PI]
   */
  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }

  /**
   * Calculate distance between points
   */
  private distance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }
}

/**
 * Magnetic Snap Points Generator
 * Generates snap points from existing geometry
 */
export class MagneticSnapGenerator {
  /**
   * Generate snap points from walls
   */
  generateWallSnapPoints(walls: { id: string; start: Point; end: Point; thickness?: number }[]): SnapPoint[] {
    const snapPoints: SnapPoint[] = [];

    walls.forEach((wall, index) => {
      // Wall endpoints
      snapPoints.push({
        id: `wall-${wall.id}-start`,
        point: wall.start,
        type: 'wall-start',
        priority: 10,
        metadata: { wallId: wall.id }
      });

      snapPoints.push({
        id: `wall-${wall.id}-end`,
        point: wall.end,
        type: 'wall-end',
        priority: 10,
        metadata: { wallId: wall.id }
      });

      // Wall midpoint
      snapPoints.push({
        id: `wall-${wall.id}-mid`,
        point: {
          x: (wall.start.x + wall.end.x) / 2,
          y: (wall.start.y + wall.end.y) / 2
        },
        type: 'wall-mid',
        priority: 6,
        metadata: { wallId: wall.id }
      });

      // Quarter points for long walls
      const length = Math.sqrt(
        Math.pow(wall.end.x - wall.start.x, 2) + Math.pow(wall.end.y - wall.start.y, 2)
      );

      if (length > 100) { // Only for walls longer than ~8 feet
        snapPoints.push({
          id: `wall-${wall.id}-quarter1`,
          point: {
            x: wall.start.x + (wall.end.x - wall.start.x) * 0.25,
            y: wall.start.y + (wall.end.y - wall.start.y) * 0.25
          },
          type: 'wall-mid',
          priority: 4,
          metadata: { wallId: wall.id }
        });

        snapPoints.push({
          id: `wall-${wall.id}-quarter3`,
          point: {
            x: wall.start.x + (wall.end.x - wall.start.x) * 0.75,
            y: wall.start.y + (wall.end.y - wall.start.y) * 0.75
          },
          type: 'wall-mid',
          priority: 4,
          metadata: { wallId: wall.id }
        });
      }
    });

    // Generate intersection points
    snapPoints.push(...this.generateIntersectionPoints(walls));

    return snapPoints;
  }

  /**
   * Generate intersection points between walls
   */
  private generateIntersectionPoints(walls: { id: string; start: Point; end: Point }[]): SnapPoint[] {
    const intersections: SnapPoint[] = [];

    for (let i = 0; i < walls.length; i++) {
      for (let j = i + 1; j < walls.length; j++) {
        const intersection = this.findLineIntersection(walls[i], walls[j]);
        if (intersection) {
          intersections.push({
            id: `intersection-${walls[i].id}-${walls[j].id}`,
            point: intersection,
            type: 'intersection',
            priority: 9,
            metadata: { wall1: walls[i].id, wall2: walls[j].id }
          });
        }
      }
    }

    return intersections;
  }

  /**
   * Find intersection between two lines
   */
  private findLineIntersection(
    line1: { start: Point; end: Point },
    line2: { start: Point; end: Point }
  ): Point | null {
    const x1 = line1.start.x, y1 = line1.start.y;
    const x2 = line1.end.x, y2 = line1.end.y;
    const x3 = line2.start.x, y3 = line2.start.y;
    const x4 = line2.end.x, y4 = line2.end.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null; // Lines are parallel

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    // Check if intersection is within both line segments
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1)
      };
    }

    return null; // Intersection is outside line segments
  }
}

/**
 * Orthogonal Drawing Helper
 * Constrains drawing to orthogonal directions when shift is pressed
 */
export class OrthogonalHelper {
  /**
   * Constrain point to orthogonal directions from start point
   */
  static constrainOrthogonal(currentPoint: Point, startPoint: Point): Point {
    const dx = currentPoint.x - startPoint.x;
    const dy = currentPoint.y - startPoint.y;

    // Determine which direction is stronger
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal constraint
      return { x: currentPoint.x, y: startPoint.y };
    } else {
      // Vertical constraint
      return { x: startPoint.x, y: currentPoint.y };
    }
  }

  /**
   * Constrain to 45-degree angles
   */
  static constrainTo45Degrees(currentPoint: Point, startPoint: Point): Point {
    const dx = currentPoint.x - startPoint.x;
    const dy = currentPoint.y - startPoint.y;
    const angle = Math.atan2(dy, dx);
    
    // Round to nearest 45 degrees
    const constrainedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    const distance = Math.sqrt(dx * dx + dy * dy);

    return {
      x: startPoint.x + Math.cos(constrainedAngle) * distance,
      y: startPoint.y + Math.sin(constrainedAngle) * distance
    };
  }
}

/**
 * Measurement and Dimensioning Helper
 */
export class DimensionHelper {
  /**
   * Calculate distance between two points in feet and inches
   */
  static calculateDistance(p1: Point, p2: Point, gridSize: number): string {
    const pixelDistance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    const inches = (pixelDistance / gridSize) * 12;
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;

    if (feet === 0) {
      return `${Math.round(remainingInches)}"`;
    } else if (remainingInches < 0.5) {
      return `${feet}'`;
    } else {
      return `${feet}' ${Math.round(remainingInches)}"`;
    }
  }

  /**
   * Format area in square feet
   */
  static formatArea(area: number, gridSize: number): string {
    const squareFeet = (area / (gridSize * gridSize));
    return `${Math.round(squareFeet)} sq ft`;
  }

  /**
   * Calculate angle between two points
   */
  static calculateAngle(p1: Point, p2: Point): number {
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    let degrees = (angle * 180 / Math.PI + 360) % 360;
    return Math.round(degrees);
  }
}