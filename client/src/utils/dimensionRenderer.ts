/**
 * Professional dimension rendering system for 2D architectural drawings
 * Implements architectural drawing standards for dimension display
 */

import {
  Point,
  Dimension,
  DimensionStyle,
  calculateDistance,
  calculateAngle,
  getPerpendicularPoint,
  formatDimension,
  getDefaultDimensionStyle
} from './dimensionUtils';

export class DimensionRenderer {
  private ctx: CanvasRenderingContext2D;
  private gridSize: number;
  private zoom: number;

  constructor(ctx: CanvasRenderingContext2D, gridSize: number, zoom: number = 1) {
    this.ctx = ctx;
    this.gridSize = gridSize;
    this.zoom = zoom;
  }

  /**
   * Draw a professional dimension line with arrows and text
   */
  drawDimension(dimension: Dimension) {
    if (!dimension.visible) return;

    const ctx = this.ctx;
    const style = dimension.style;
    
    ctx.save();
    
    // Set line style
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.lineWeight;
    ctx.setLineDash([]);
    
    // Calculate dimension line position
    const perpPoints = getPerpendicularPoint(
      dimension.start,
      dimension.end,
      dimension.offset
    );
    
    // Draw extension lines
    this.drawExtensionLines(dimension, perpPoints, style);
    
    // Draw dimension line
    this.drawDimensionLine(perpPoints.start, perpPoints.end, style);
    
    // Draw arrows
    this.drawArrows(perpPoints.start, perpPoints.end, style);
    
    // Draw dimension text
    this.drawDimensionText(dimension, perpPoints, style);
    
    ctx.restore();
  }

  /**
   * Draw extension lines from wall to dimension line
   */
  private drawExtensionLines(dimension: Dimension, perpPoints: { start: Point; end: Point }, style: DimensionStyle) {
    const ctx = this.ctx;
    const extensionOffset = style.extensionLineOffset;
    
    // Calculate extension line endpoints
    const angle = calculateAngle(dimension.start, dimension.end);
    const perpAngle = angle + Math.PI / 2;
    
    // Start extension line
    const startExtStart = {
      x: dimension.start.x + Math.cos(perpAngle) * extensionOffset,
      y: dimension.start.y + Math.sin(perpAngle) * extensionOffset
    };
    const startExtEnd = {
      x: perpPoints.start.x + Math.cos(perpAngle) * extensionOffset,
      y: perpPoints.start.y + Math.sin(perpAngle) * extensionOffset
    };
    
    // End extension line
    const endExtStart = {
      x: dimension.end.x + Math.cos(perpAngle) * extensionOffset,
      y: dimension.end.y + Math.sin(perpAngle) * extensionOffset
    };
    const endExtEnd = {
      x: perpPoints.end.x + Math.cos(perpAngle) * extensionOffset,
      y: perpPoints.end.y + Math.sin(perpAngle) * extensionOffset
    };
    
    // Draw extension lines
    ctx.setLineDash([1, 2]); // Dashed extension lines per architectural standards
    
    ctx.beginPath();
    ctx.moveTo(startExtStart.x, startExtStart.y);
    ctx.lineTo(startExtEnd.x, startExtEnd.y);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(endExtStart.x, endExtStart.y);
    ctx.lineTo(endExtEnd.x, endExtEnd.y);
    ctx.stroke();
    
    ctx.setLineDash([]); // Reset to solid line
  }

  /**
   * Draw the main dimension line
   */
  private drawDimensionLine(start: Point, end: Point, style: DimensionStyle) {
    const ctx = this.ctx;
    
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  /**
   * Draw dimension arrows (architectural style)
   */
  private drawArrows(start: Point, end: Point, style: DimensionStyle) {
    const ctx = this.ctx;
    const arrowSize = style.arrowSize;
    const angle = calculateAngle(start, end);
    
    // Draw filled triangular arrows
    ctx.fillStyle = style.color;
    
    // Start arrow
    this.drawTriangleArrow(start, angle, arrowSize);
    
    // End arrow
    this.drawTriangleArrow(end, angle + Math.PI, arrowSize);
  }

  /**
   * Draw a triangular arrow
   */
  private drawTriangleArrow(point: Point, angle: number, size: number) {
    const ctx = this.ctx;
    
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(angle);
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size / 3);
    ctx.lineTo(-size, size / 3);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }

  /**
   * Draw dimension text
   */
  private drawDimensionText(dimension: Dimension, perpPoints: { start: Point; end: Point }, style: DimensionStyle) {
    const ctx = this.ctx;
    
    // Calculate text position (center of dimension line)
    const textPoint = {
      x: (perpPoints.start.x + perpPoints.end.x) / 2,
      y: (perpPoints.start.y + perpPoints.end.y) / 2
    };
    
    // Set text style
    ctx.fillStyle = style.textColor;
    ctx.font = `${style.textSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Calculate text rotation angle
    let textAngle = calculateAngle(perpPoints.start, perpPoints.end);
    
    // Keep text readable (don't flip upside down)
    if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) {
      textAngle += Math.PI;
    }
    
    // Draw text background for better readability
    const textMetrics = ctx.measureText(dimension.text);
    const textWidth = textMetrics.width;
    const textHeight = style.textSize;
    
    ctx.save();
    ctx.translate(textPoint.x, textPoint.y);
    ctx.rotate(textAngle);
    
    // Background rectangle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(-textWidth / 2 - 2, -textHeight / 2 - 1, textWidth + 4, textHeight + 2);
    
    // Text
    ctx.fillStyle = style.textColor;
    ctx.fillText(dimension.text, 0, 0);
    
    ctx.restore();
  }

  /**
   * Draw real-time dimension while drawing
   */
  drawRealtimeDimension(start: Point, end: Point, color: string = '#ef4444') {
    const ctx = this.ctx;
    const distance = calculateDistance(start, end);
    const text = formatDimension(distance, this.gridSize);
    
    ctx.save();
    
    // Draw dimension line
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    
    const angle = calculateAngle(start, end);
    const perpAngle = angle + Math.PI / 2;
    const offset = 15;
    
    const dimStart = {
      x: start.x + Math.cos(perpAngle) * offset,
      y: start.y + Math.sin(perpAngle) * offset
    };
    const dimEnd = {
      x: end.x + Math.cos(perpAngle) * offset,
      y: end.y + Math.sin(perpAngle) * offset
    };
    
    ctx.beginPath();
    ctx.moveTo(dimStart.x, dimStart.y);
    ctx.lineTo(dimEnd.x, dimEnd.y);
    ctx.stroke();
    
    // Draw text
    ctx.fillStyle = color;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const textPoint = {
      x: (dimStart.x + dimEnd.x) / 2,
      y: (dimStart.y + dimEnd.y) / 2 - 8
    };
    
    // Text background
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(textPoint.x - textWidth / 2 - 2, textPoint.y - 8, textWidth + 4, 16);
    
    // Text
    ctx.fillStyle = color;
    ctx.fillText(text, textPoint.x, textPoint.y);
    
    ctx.restore();
  }

  /**
   * Draw running dimensions along a wall chain
   */
  drawRunningDimensions(walls: any[], baseOffset: number = 50) {
    // Group walls by alignment (horizontal/vertical)
    const horizontalWalls = walls.filter(w => Math.abs(w.start.y - w.end.y) < 5);
    const verticalWalls = walls.filter(w => Math.abs(w.start.x - w.end.x) < 5);
    
    this.drawRunningDimensionChain(horizontalWalls, baseOffset, 'horizontal');
    this.drawRunningDimensionChain(verticalWalls, baseOffset, 'vertical');
  }

  /**
   * Draw a chain of running dimensions
   */
  private drawRunningDimensionChain(walls: any[], offset: number, direction: 'horizontal' | 'vertical') {
    if (walls.length === 0) return;
    
    // Sort walls by position
    walls.sort((a, b) => {
      if (direction === 'horizontal') {
        return Math.min(a.start.x, a.end.x) - Math.min(b.start.x, b.end.x);
      } else {
        return Math.min(a.start.y, a.end.y) - Math.min(b.start.y, b.end.y);
      }
    });
    
    let cumulativeLength = 0;
    const baseY = direction === 'horizontal' ? 
      Math.min(...walls.map(w => Math.min(w.start.y, w.end.y))) - offset :
      Math.min(...walls.map(w => Math.min(w.start.x, w.end.x))) - offset;
    
    for (let i = 0; i < walls.length; i++) {
      const wall = walls[i];
      const wallLength = calculateDistance(wall.start, wall.end);
      cumulativeLength += wallLength;
      
      const startX = i === 0 ? 
        Math.min(walls[0].start.x, walls[0].end.x) :
        Math.min(walls[0].start.x, walls[0].end.x);
      
      const dimension: Dimension = {
        id: `running-${direction}-${i}`,
        start: direction === 'horizontal' ? 
          { x: startX, y: baseY + offset } :
          { x: baseY + offset, y: Math.min(walls[0].start.y, walls[0].end.y) },
        end: direction === 'horizontal' ?
          { x: startX + cumulativeLength, y: baseY + offset } :
          { x: baseY + offset, y: Math.min(walls[0].start.y, walls[0].end.y) + cumulativeLength },
        type: 'running',
        value: cumulativeLength,
        text: formatDimension(cumulativeLength, this.gridSize),
        offset: 0, // Already calculated
        angle: direction === 'horizontal' ? 0 : Math.PI / 2,
        visible: true,
        style: {
          ...getDefaultDimensionStyle(),
          color: '#059669', // Green for running dimensions
          textColor: '#047857'
        }
      };
      
      this.drawDimension(dimension);
    }
  }

  /**
   * Draw area label for rooms
   */
  drawAreaLabel(center: Point, area: number, roomName: string) {
    const ctx = this.ctx;
    const areaText = formatDimension(area, this.gridSize).replace("'", ' sq ft');
    
    ctx.save();
    
    // Room name
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(roomName, center.x, center.y - 8);
    
    // Area
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.fillText(areaText, center.x, center.y + 8);
    
    ctx.restore();
  }

  /**
   * Draw custom measurement between two points
   */
  drawCustomMeasurement(start: Point, end: Point, temporary: boolean = false) {
    const distance = calculateDistance(start, end);
    const text = formatDimension(distance, this.gridSize);
    
    const style: DimensionStyle = {
      ...getDefaultDimensionStyle(),
      color: temporary ? '#f59e0b' : '#dc2626',
      textColor: temporary ? '#d97706' : '#b91c1c',
      lineWeight: temporary ? 1 : 2
    };
    
    const dimension: Dimension = {
      id: temporary ? 'temp-measurement' : `custom-${Date.now()}`,
      start,
      end,
      type: 'custom',
      value: distance,
      text,
      offset: 25,
      angle: calculateAngle(start, end),
      visible: true,
      style
    };
    
    this.drawDimension(dimension);
    
    // Draw measurement points
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = style.color;
    
    // Start point
    ctx.beginPath();
    ctx.arc(start.x, start.y, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // End point
    ctx.beginPath();
    ctx.arc(end.x, end.y, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  /**
   * Draw diagonal measurement
   */
  drawDiagonalMeasurement(start: Point, end: Point) {
    const distance = calculateDistance(start, end);
    const text = formatDimension(distance, this.gridSize);
    
    const ctx = this.ctx;
    ctx.save();
    
    // Diagonal line
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    
    // Diagonal measurement text
    const midPoint = {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2
    };
    
    ctx.fillStyle = '#7c3aed';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Text background
    const textMetrics = ctx.measureText(`↗ ${text}`);
    const textWidth = textMetrics.width;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(midPoint.x - textWidth / 2 - 2, midPoint.y - 8, textWidth + 4, 16);
    
    // Text with diagonal arrow
    ctx.fillStyle = '#7c3aed';
    ctx.fillText(`↗ ${text}`, midPoint.x, midPoint.y);
    
    ctx.restore();
  }
}