/**
 * Professional dimension utilities for 2D architectural drawing
 * Following architectural drawing standards
 */

export interface Point {
  x: number;
  y: number;
}

export interface Dimension {
  id: string;
  start: Point;
  end: Point;
  type: 'wall' | 'room' | 'custom' | 'running';
  value: number;
  text: string;
  offset: number;
  angle: number;
  visible: boolean;
  style: DimensionStyle;
}

export interface DimensionStyle {
  color: string;
  lineWeight: number;
  textSize: number;
  textColor: string;
  arrowSize: number;
  extensionLineOffset: number;
  dimensionLineOffset: number;
}

export interface Area {
  id: string;
  roomId: string;
  points: Point[];
  value: number;
  text: string;
  center: Point;
}

/**
 * Convert pixels to feet and inches with proper formatting
 */
export function formatDimension(pixels: number, gridSize: number, precision: 'exact' | 'quarter' | 'half' | 'inch' = 'quarter'): string {
  const totalInches = (pixels / gridSize) * 12;
  
  // Round to specified precision
  let roundedInches: number;
  switch (precision) {
    case 'exact':
      roundedInches = Math.round(totalInches * 16) / 16; // 1/16" precision
      break;
    case 'quarter':
      roundedInches = Math.round(totalInches * 4) / 4; // 1/4" precision
      break;
    case 'half':
      roundedInches = Math.round(totalInches * 2) / 2; // 1/2" precision
      break;
    case 'inch':
      roundedInches = Math.round(totalInches); // 1" precision
      break;
  }

  const feet = Math.floor(roundedInches / 12);
  const inches = roundedInches % 12;
  
  if (feet === 0) {
    return formatInches(inches);
  } else if (inches === 0) {
    return `${feet}'`;
  } else {
    return `${feet}'-${formatInches(inches)}`;
  }
}

/**
 * Format inches with fractions
 */
function formatInches(inches: number): string {
  const wholeInches = Math.floor(inches);
  const fraction = inches - wholeInches;
  
  if (fraction === 0) {
    return `${wholeInches}"`;
  }
  
  // Convert decimal to fraction
  const fractionText = decimalToFraction(fraction);
  
  if (wholeInches === 0) {
    return `${fractionText}"`;
  } else {
    return `${wholeInches} ${fractionText}"`;
  }
}

/**
 * Convert decimal to architectural fraction
 */
function decimalToFraction(decimal: number): string {
  const sixteenths = Math.round(decimal * 16);
  
  if (sixteenths === 0) return '';
  if (sixteenths === 16) return '1';
  
  // Simplify fraction
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(sixteenths, 16);
  
  const numerator = sixteenths / divisor;
  const denominator = 16 / divisor;
  
  return `${numerator}/${denominator}`;
}

/**
 * Calculate distance between two points
 */
export function calculateDistance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calculate angle between two points
 */
export function calculateAngle(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

/**
 * Calculate perpendicular offset point
 */
export function getPerpendicularPoint(p1: Point, p2: Point, offset: number): { start: Point; end: Point } {
  const angle = calculateAngle(p1, p2);
  const perpAngle = angle + Math.PI / 2;
  
  return {
    start: {
      x: p1.x + Math.cos(perpAngle) * offset,
      y: p1.y + Math.sin(perpAngle) * offset
    },
    end: {
      x: p2.x + Math.cos(perpAngle) * offset,
      y: p2.y + Math.sin(perpAngle) * offset
    }
  };
}

/**
 * Calculate polygon area using shoelace formula
 */
export function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  
  return Math.abs(area) / 2;
}

/**
 * Find centroid of polygon
 */
export function calculatePolygonCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  
  const area = calculatePolygonArea(points);
  if (area === 0) {
    // Fallback to simple average
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
  }
  
  let cx = 0, cy = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const factor = points[i].x * points[j].y - points[j].x * points[i].y;
    cx += (points[i].x + points[j].x) * factor;
    cy += (points[i].y + points[j].y) * factor;
  }
  
  const sixArea = 6 * area;
  return { x: cx / sixArea, y: cy / sixArea };
}

/**
 * Get default dimension style
 */
export function getDefaultDimensionStyle(): DimensionStyle {
  return {
    color: '#6b7280',
    lineWeight: 1,
    textSize: 11,
    textColor: '#374151',
    arrowSize: 8,
    extensionLineOffset: 5,
    dimensionLineOffset: 20
  };
}

/**
 * Check if point is near line segment
 */
export function pointNearLine(point: Point, lineStart: Point, lineEnd: Point, tolerance: number = 5): boolean {
  const distance = distanceFromPointToLine(point, lineStart, lineEnd);
  return distance <= tolerance;
}

/**
 * Calculate distance from point to line segment
 */
export function distanceFromPointToLine(point: Point, lineStart: Point, lineEnd: Point): number {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) return Math.sqrt(A * A + B * B);
  
  let param = dot / lenSq;
  param = Math.max(0, Math.min(1, param));

  const xx = lineStart.x + param * C;
  const yy = lineStart.y + param * D;

  const dx = point.x - xx;
  const dy = point.y - yy;
  
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Generate running dimensions for a chain of connected walls
 */
export function generateRunningDimensions(walls: any[], gridSize: number): Dimension[] {
  const dimensions: Dimension[] = [];
  
  // Group connected walls
  const wallChains = findConnectedWallChains(walls);
  
  wallChains.forEach((chain, chainIndex) => {
    if (chain.length < 2) return;
    
    // Generate cumulative dimensions
    let cumulativeDistance = 0;
    const baseAngle = calculateAngle(chain[0].start, chain[0].end);
    const perpAngle = baseAngle + Math.PI / 2;
    const offset = 35; // Offset for running dimensions
    
    for (let i = 0; i < chain.length; i++) {
      const wall = chain[i];
      const wallLength = calculateDistance(wall.start, wall.end);
      cumulativeDistance += wallLength;
      
      const startPoint = i === 0 ? chain[0].start : chain[i].start;
      const endPoint = {
        x: chain[0].start.x + Math.cos(baseAngle) * cumulativeDistance,
        y: chain[0].start.y + Math.sin(baseAngle) * cumulativeDistance
      };
      
      dimensions.push({
        id: `running-${chainIndex}-${i}`,
        start: startPoint,
        end: endPoint,
        type: 'running',
        value: cumulativeDistance,
        text: formatDimension(cumulativeDistance, gridSize),
        offset,
        angle: baseAngle,
        visible: true,
        style: getDefaultDimensionStyle()
      });
    }
  });
  
  return dimensions;
}

/**
 * Find connected wall chains for running dimensions
 */
function findConnectedWallChains(walls: any[]): any[][] {
  const chains: any[][] = [];
  const visited = new Set<string>();
  
  walls.forEach(wall => {
    if (visited.has(wall.id)) return;
    
    const chain = [wall];
    visited.add(wall.id);
    
    // Find connected walls
    let currentEnd = wall.end;
    let found = true;
    
    while (found) {
      found = false;
      for (const otherWall of walls) {
        if (visited.has(otherWall.id)) continue;
        
        const tolerance = 5;
        if (calculateDistance(currentEnd, otherWall.start) <= tolerance) {
          chain.push(otherWall);
          visited.add(otherWall.id);
          currentEnd = otherWall.end;
          found = true;
          break;
        } else if (calculateDistance(currentEnd, otherWall.end) <= tolerance) {
          // Reverse the wall direction
          const reversedWall = {
            ...otherWall,
            start: otherWall.end,
            end: otherWall.start
          };
          chain.push(reversedWall);
          visited.add(otherWall.id);
          currentEnd = reversedWall.end;
          found = true;
          break;
        }
      }
    }
    
    if (chain.length > 0) {
      chains.push(chain);
    }
  });
  
  return chains;
}

/**
 * Format area in square feet
 */
export function formatArea(pixels: number, gridSize: number): string {
  const squareInches = (pixels / (gridSize * gridSize)) * 144; // 12" x 12" = 144 sq inches
  const squareFeet = squareInches / 144;
  
  if (squareFeet < 1) {
    return `${Math.round(squareInches)} sq in`;
  } else if (squareFeet < 10) {
    return `${squareFeet.toFixed(1)} sq ft`;
  } else {
    return `${Math.round(squareFeet)} sq ft`;
  }
}