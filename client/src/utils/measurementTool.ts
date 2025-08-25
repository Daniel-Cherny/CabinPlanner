/**
 * Professional measurement tools for 2D architectural editor
 * Provides various measurement and dimension tools
 */

import { Point, calculateDistance, formatDimension } from './dimensionUtils';
import { DimensionRenderer } from './dimensionRenderer';

export interface MeasurementState {
  isActive: boolean;
  mode: 'linear' | 'area' | 'angle' | 'diagonal' | 'running';
  points: Point[];
  temporaryEnd?: Point;
  measurements: Measurement[];
  showTemporary: boolean;
}

export interface Measurement {
  id: string;
  type: 'linear' | 'area' | 'angle' | 'diagonal' | 'running';
  points: Point[];
  value: number;
  text: string;
  permanent: boolean;
  timestamp: number;
}

export class MeasurementTool {
  private ctx: CanvasRenderingContext2D;
  private gridSize: number;
  private dimensionRenderer: DimensionRenderer;
  private state: MeasurementState;

  constructor(ctx: CanvasRenderingContext2D, gridSize: number, zoom: number = 1) {
    this.ctx = ctx;
    this.gridSize = gridSize;
    this.dimensionRenderer = new DimensionRenderer(ctx, gridSize, zoom);
    
    this.state = {
      isActive: false,
      mode: 'linear',
      points: [],
      measurements: [],
      showTemporary: true
    };
  }

  /**
   * Activate measurement tool
   */
  activate(mode: MeasurementState['mode'] = 'linear') {
    this.state.isActive = true;
    this.state.mode = mode;
    this.state.points = [];
    this.state.temporaryEnd = undefined;
  }

  /**
   * Deactivate measurement tool
   */
  deactivate() {
    this.state.isActive = false;
    this.state.points = [];
    this.state.temporaryEnd = undefined;
  }

  /**
   * Handle mouse click for measurement
   */
  handleClick(point: Point): boolean {
    if (!this.state.isActive) return false;

    switch (this.state.mode) {
      case 'linear':
        return this.handleLinearClick(point);
      case 'diagonal':
        return this.handleDiagonalClick(point);
      case 'area':
        return this.handleAreaClick(point);
      case 'angle':
        return this.handleAngleClick(point);
      case 'running':
        return this.handleRunningClick(point);
      default:
        return false;
    }
  }

  /**
   * Handle mouse move for temporary measurements
   */
  handleMouseMove(point: Point) {
    if (!this.state.isActive || this.state.points.length === 0) return;

    this.state.temporaryEnd = point;
  }

  /**
   * Handle linear measurement clicks
   */
  private handleLinearClick(point: Point): boolean {
    if (this.state.points.length === 0) {
      this.state.points = [point];
      return true;
    } else {
      const measurement = this.createLinearMeasurement(this.state.points[0], point);
      this.state.measurements.push(measurement);
      this.state.points = [];
      this.state.temporaryEnd = undefined;
      return true;
    }
  }

  /**
   * Handle diagonal measurement clicks
   */
  private handleDiagonalClick(point: Point): boolean {
    if (this.state.points.length === 0) {
      this.state.points = [point];
      return true;
    } else {
      const measurement = this.createDiagonalMeasurement(this.state.points[0], point);
      this.state.measurements.push(measurement);
      this.state.points = [];
      this.state.temporaryEnd = undefined;
      return true;
    }
  }

  /**
   * Handle area measurement clicks
   */
  private handleAreaClick(point: Point): boolean {
    this.state.points.push(point);
    
    // Close area on double-click or when returning to start
    if (this.state.points.length >= 3) {
      const firstPoint = this.state.points[0];
      const distance = calculateDistance(point, firstPoint);
      
      if (distance < 10) { // Close to first point
        const measurement = this.createAreaMeasurement([...this.state.points]);
        this.state.measurements.push(measurement);
        this.state.points = [];
        this.state.temporaryEnd = undefined;
        return true;
      }
    }
    
    return true;
  }

  /**
   * Handle angle measurement clicks
   */
  private handleAngleClick(point: Point): boolean {
    this.state.points.push(point);
    
    if (this.state.points.length === 3) {
      const measurement = this.createAngleMeasurement(this.state.points);
      this.state.measurements.push(measurement);
      this.state.points = [];
      this.state.temporaryEnd = undefined;
      return true;
    }
    
    return true;
  }

  /**
   * Handle running dimension clicks
   */
  private handleRunningClick(point: Point): boolean {
    this.state.points.push(point);
    
    // Running dimensions need at least 2 points
    if (this.state.points.length >= 2) {
      const measurement = this.createRunningMeasurement([...this.state.points]);
      this.state.measurements.push(measurement);
      // Don't clear points - allow continuing the chain
      return true;
    }
    
    return true;
  }

  /**
   * Create linear measurement
   */
  private createLinearMeasurement(start: Point, end: Point): Measurement {
    const distance = calculateDistance(start, end);
    
    return {
      id: `linear-${Date.now()}`,
      type: 'linear',
      points: [start, end],
      value: distance,
      text: formatDimension(distance, this.gridSize),
      permanent: true,
      timestamp: Date.now()
    };
  }

  /**
   * Create diagonal measurement
   */
  private createDiagonalMeasurement(start: Point, end: Point): Measurement {
    const distance = calculateDistance(start, end);
    
    return {
      id: `diagonal-${Date.now()}`,
      type: 'diagonal',
      points: [start, end],
      value: distance,
      text: formatDimension(distance, this.gridSize),
      permanent: true,
      timestamp: Date.now()
    };
  }

  /**
   * Create area measurement
   */
  private createAreaMeasurement(points: Point[]): Measurement {
    // Calculate area using shoelace formula
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    area = Math.abs(area) / 2;
    
    // Convert to square feet
    const squareFeet = (area / (this.gridSize * this.gridSize)) * 1; // gridSize represents 1 foot
    
    return {
      id: `area-${Date.now()}`,
      type: 'area',
      points: [...points],
      value: area,
      text: `${squareFeet.toFixed(1)} sq ft`,
      permanent: true,
      timestamp: Date.now()
    };
  }

  /**
   * Create angle measurement
   */
  private createAngleMeasurement(points: Point[]): Measurement {
    if (points.length !== 3) throw new Error('Angle measurement requires exactly 3 points');
    
    const [p1, vertex, p2] = points;
    
    // Calculate angle using dot product
    const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
    const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y };
    
    const dotProduct = v1.x * v2.x + v1.y * v2.y;
    const magnitude1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const magnitude2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    
    const angle = Math.acos(dotProduct / (magnitude1 * magnitude2));
    const degrees = angle * (180 / Math.PI);
    
    return {
      id: `angle-${Date.now()}`,
      type: 'angle',
      points: [...points],
      value: angle,
      text: `${degrees.toFixed(1)}°`,
      permanent: true,
      timestamp: Date.now()
    };
  }

  /**
   * Create running measurement
   */
  private createRunningMeasurement(points: Point[]): Measurement {
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += calculateDistance(points[i - 1], points[i]);
    }
    
    return {
      id: `running-${Date.now()}`,
      type: 'running',
      points: [...points],
      value: totalDistance,
      text: formatDimension(totalDistance, this.gridSize),
      permanent: true,
      timestamp: Date.now()
    };
  }

  /**
   * Render all measurements
   */
  render() {
    // Render permanent measurements
    this.state.measurements.forEach(measurement => {
      this.renderMeasurement(measurement);
    });

    // Render temporary measurement
    if (this.state.isActive && this.state.showTemporary) {
      this.renderTemporaryMeasurement();
    }
  }

  /**
   * Render a single measurement
   */
  private renderMeasurement(measurement: Measurement) {
    switch (measurement.type) {
      case 'linear':
        this.dimensionRenderer.drawCustomMeasurement(
          measurement.points[0],
          measurement.points[1],
          false
        );
        break;
        
      case 'diagonal':
        this.dimensionRenderer.drawDiagonalMeasurement(
          measurement.points[0],
          measurement.points[1]
        );
        break;
        
      case 'area':
        this.renderAreaMeasurement(measurement);
        break;
        
      case 'angle':
        this.renderAngleMeasurement(measurement);
        break;
        
      case 'running':
        this.renderRunningMeasurement(measurement);
        break;
    }
  }

  /**
   * Render temporary measurement
   */
  private renderTemporaryMeasurement() {
    if (this.state.points.length === 0 || !this.state.temporaryEnd) return;

    const lastPoint = this.state.points[this.state.points.length - 1];
    
    switch (this.state.mode) {
      case 'linear':
      case 'diagonal':
        if (this.state.points.length === 1) {
          if (this.state.mode === 'diagonal') {
            this.dimensionRenderer.drawDiagonalMeasurement(lastPoint, this.state.temporaryEnd);
          } else {
            this.dimensionRenderer.drawCustomMeasurement(lastPoint, this.state.temporaryEnd, true);
          }
        }
        break;
        
      case 'area':
        this.renderTemporaryArea();
        break;
        
      case 'angle':
        this.renderTemporaryAngle();
        break;
        
      case 'running':
        this.renderTemporaryRunning();
        break;
    }
  }

  /**
   * Render area measurement
   */
  private renderAreaMeasurement(measurement: Measurement) {
    const ctx = this.ctx;
    ctx.save();
    
    // Draw area polygon
    ctx.strokeStyle = '#16a34a';
    ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(measurement.points[0].x, measurement.points[0].y);
    for (let i = 1; i < measurement.points.length; i++) {
      ctx.lineTo(measurement.points[i].x, measurement.points[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw area text at centroid
    const centroid = this.calculateCentroid(measurement.points);
    ctx.fillStyle = '#15803d';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(measurement.text, centroid.x, centroid.y);
    
    ctx.restore();
  }

  /**
   * Render angle measurement
   */
  private renderAngleMeasurement(measurement: Measurement) {
    const ctx = this.ctx;
    const [p1, vertex, p2] = measurement.points;
    
    ctx.save();
    
    // Draw angle arc
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    
    const radius = 30;
    const angle1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
    const angle2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
    
    ctx.beginPath();
    ctx.arc(vertex.x, vertex.y, radius, angle1, angle2);
    ctx.stroke();
    
    // Draw angle text
    const midAngle = (angle1 + angle2) / 2;
    const textX = vertex.x + Math.cos(midAngle) * (radius + 15);
    const textY = vertex.y + Math.sin(midAngle) * (radius + 15);
    
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(measurement.text, textX, textY);
    
    ctx.restore();
  }

  /**
   * Render running measurement
   */
  private renderRunningMeasurement(measurement: Measurement) {
    const ctx = this.ctx;
    ctx.save();
    
    // Draw connected line segments
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    ctx.beginPath();
    ctx.moveTo(measurement.points[0].x, measurement.points[0].y);
    for (let i = 1; i < measurement.points.length; i++) {
      ctx.lineTo(measurement.points[i].x, measurement.points[i].y);
    }
    ctx.stroke();
    
    // Draw total length at end
    const lastPoint = measurement.points[measurement.points.length - 1];
    ctx.fillStyle = '#047857';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Total: ${measurement.text}`, lastPoint.x + 10, lastPoint.y - 10);
    
    ctx.restore();
  }

  /**
   * Render temporary area
   */
  private renderTemporaryArea() {
    if (this.state.points.length < 2 || !this.state.temporaryEnd) return;
    
    const ctx = this.ctx;
    ctx.save();
    
    // Draw temporary area outline
    ctx.strokeStyle = '#f59e0b';
    ctx.fillStyle = 'rgba(245, 158, 11, 0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    
    ctx.beginPath();
    ctx.moveTo(this.state.points[0].x, this.state.points[0].y);
    for (let i = 1; i < this.state.points.length; i++) {
      ctx.lineTo(this.state.points[i].x, this.state.points[i].y);
    }
    ctx.lineTo(this.state.temporaryEnd.x, this.state.temporaryEnd.y);
    if (this.state.points.length >= 3) {
      ctx.lineTo(this.state.points[0].x, this.state.points[0].y);
    }
    
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
  }

  /**
   * Render temporary angle
   */
  private renderTemporaryAngle() {
    if (this.state.points.length === 2 && this.state.temporaryEnd) {
      const [p1, vertex] = this.state.points;
      const p2 = this.state.temporaryEnd;
      
      const ctx = this.ctx;
      ctx.save();
      
      // Draw angle lines
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      
      ctx.beginPath();
      ctx.moveTo(vertex.x, vertex.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.moveTo(vertex.x, vertex.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      
      ctx.restore();
    }
  }

  /**
   * Render temporary running measurement
   */
  private renderTemporaryRunning() {
    if (this.state.points.length >= 1 && this.state.temporaryEnd) {
      const ctx = this.ctx;
      ctx.save();
      
      // Draw line to temporary end
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      
      const lastPoint = this.state.points[this.state.points.length - 1];
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(this.state.temporaryEnd.x, this.state.temporaryEnd.y);
      ctx.stroke();
      
      ctx.restore();
    }
  }

  /**
   * Calculate centroid of polygon
   */
  private calculateCentroid(points: Point[]): Point {
    let cx = 0, cy = 0;
    for (const point of points) {
      cx += point.x;
      cy += point.y;
    }
    return { x: cx / points.length, y: cy / points.length };
  }

  /**
   * Clear all measurements
   */
  clearMeasurements() {
    this.state.measurements = [];
  }

  /**
   * Remove specific measurement
   */
  removeMeasurement(id: string) {
    this.state.measurements = this.state.measurements.filter(m => m.id !== id);
  }

  /**
   * Get measurement state for external access
   */
  getState(): MeasurementState {
    return { ...this.state };
  }

  /**
   * Toggle temporary measurement visibility
   */
  toggleTemporary(show: boolean) {
    this.state.showTemporary = show;
  }
}