/**
 * WheelCanvas - Canvas-based wheel renderer
 * Handles drawing the spin wheel with segments, labels, and pointer
 */
class WheelCanvas {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.segments = [];
    this.rotation = 0;

    this.options = {
      size: options.size || canvas.width || 400,
      borderWidth: options.borderWidth || 4,
      borderColor: options.borderColor || '#333333',
      centerRadius: options.centerRadius || 35,
      centerColor: options.centerColor || '#1e293b',
      pointerColor: options.pointerColor || '#ef4444',
      fontSize: options.fontSize || 14,
      fontFamily: options.fontFamily || 'Arial, sans-serif',
      ...options
    };

    // Set canvas size
    this.canvas.width = this.options.size;
    this.canvas.height = this.options.size;

    // Calculate dimensions
    this.centerX = this.options.size / 2;
    this.centerY = this.options.size / 2;
    this.radius = (this.options.size / 2) - this.options.borderWidth - 20;
  }

  /**
   * Set segments data
   */
  setSegments(segments) {
    this.segments = segments || [];
    return this;
  }

  /**
   * Set rotation angle (in radians)
   */
  setRotation(angle) {
    this.rotation = angle;
    return this;
  }

  /**
   * Update options
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
    return this;
  }

  /**
   * Get segment at a specific angle
   * Used to determine winner after spin
   */
  getSegmentAtAngle(angle) {
    if (this.segments.length === 0) return null;

    // Normalize angle to 0-2PI
    let normalizedAngle = angle % (Math.PI * 2);
    if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;

    // Calculate total weight
    const totalWeight = this.segments.reduce((sum, seg) => sum + (seg.weight || 1), 0);

    // The pointer is at the top (270 degrees or -PI/2)
    // We need to find which segment is at the pointer
    const pointerAngle = Math.PI * 1.5; // 270 degrees

    // Adjust for rotation - the wheel rotates clockwise
    let checkAngle = pointerAngle - normalizedAngle;
    if (checkAngle < 0) checkAngle += Math.PI * 2;

    // Find segment at this angle
    let currentAngle = 0;
    for (const segment of this.segments) {
      const segmentWeight = segment.weight || 1;
      const segmentAngle = (segmentWeight / totalWeight) * Math.PI * 2;

      if (checkAngle >= currentAngle && checkAngle < currentAngle + segmentAngle) {
        return segment;
      }
      currentAngle += segmentAngle;
    }

    return this.segments[0];
  }

  /**
   * Main render function
   */
  render() {
    const ctx = this.ctx;

    // Clear canvas
    ctx.clearRect(0, 0, this.options.size, this.options.size);

    if (this.segments.length === 0) {
      this._drawEmpty();
      return this;
    }

    // Save context and apply rotation
    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.rotation);
    ctx.translate(-this.centerX, -this.centerY);

    // Draw segments
    this._drawSegments();

    // Restore context (remove rotation for static elements)
    ctx.restore();

    // Draw border
    this._drawBorder();

    // Draw center
    this._drawCenter();

    // Draw pointer (static, doesn't rotate)
    this._drawPointer();

    return this;
  }

  /**
   * Draw empty state
   */
  _drawEmpty() {
    const ctx = this.ctx;

    // Draw circle
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();

    // Draw border
    ctx.strokeStyle = this.options.borderColor;
    ctx.lineWidth = this.options.borderWidth;
    ctx.stroke();

    // Draw text
    ctx.fillStyle = '#64748b';
    ctx.font = '16px ' + this.options.fontFamily;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Add segments', this.centerX, this.centerY);
  }

  /**
   * Draw all segments
   */
  _drawSegments() {
    const ctx = this.ctx;
    const totalWeight = this.segments.reduce((sum, seg) => sum + (seg.weight || 1), 0);

    let startAngle = -Math.PI / 2; // Start at top

    this.segments.forEach((segment, index) => {
      const segmentWeight = segment.weight || 1;
      const sliceAngle = (segmentWeight / totalWeight) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;

      // Draw segment slice
      ctx.beginPath();
      ctx.moveTo(this.centerX, this.centerY);
      ctx.arc(this.centerX, this.centerY, this.radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = segment.color || this._getDefaultColor(index);
      ctx.fill();

      // Draw segment border
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw label
      this._drawLabel(segment.label, startAngle, sliceAngle);

      startAngle = endAngle;
    });
  }

  /**
   * Draw segment label
   */
  _drawLabel(label, startAngle, sliceAngle) {
    const ctx = this.ctx;
    const midAngle = startAngle + sliceAngle / 2;

    // Position label at 65% of radius
    const labelRadius = this.radius * 0.65;
    const x = this.centerX + Math.cos(midAngle) * labelRadius;
    const y = this.centerY + Math.sin(midAngle) * labelRadius;

    // Rotate text to follow the slice
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(midAngle + Math.PI / 2);

    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${this.options.fontSize}px ${this.options.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Truncate long labels
    let displayLabel = label;
    const maxWidth = this.radius * 0.4;
    while (ctx.measureText(displayLabel).width > maxWidth && displayLabel.length > 3) {
      displayLabel = displayLabel.slice(0, -1);
    }
    if (displayLabel !== label) {
      displayLabel += '...';
    }

    // Draw with shadow for readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(displayLabel, 0, 0);

    ctx.restore();
  }

  /**
   * Draw wheel border
   */
  _drawBorder() {
    const ctx = this.ctx;

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = this.options.borderColor;
    ctx.lineWidth = this.options.borderWidth;
    ctx.stroke();
  }

  /**
   * Draw center circle
   */
  _drawCenter() {
    const ctx = this.ctx;

    // Outer ring
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.options.centerRadius + 5, 0, Math.PI * 2);
    ctx.fillStyle = this.options.borderColor;
    ctx.fill();

    // Inner circle
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.options.centerRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.options.centerColor;
    ctx.fill();
  }

  /**
   * Draw pointer at top
   */
  _drawPointer() {
    const ctx = this.ctx;
    const pointerSize = 20;

    ctx.save();
    ctx.translate(this.centerX, this.options.borderWidth + 10);

    ctx.beginPath();
    ctx.moveTo(0, pointerSize);
    ctx.lineTo(-pointerSize / 2, 0);
    ctx.lineTo(pointerSize / 2, 0);
    ctx.closePath();

    ctx.fillStyle = this.options.pointerColor;
    ctx.fill();

    // Pointer border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Get default color for segment
   */
  _getDefaultColor(index) {
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
      '#9966FF', '#FF9F40', '#7CFC00', '#FF6B6B',
      '#48D1CC', '#DDA0DD', '#F0E68C', '#87CEEB'
    ];
    return colors[index % colors.length];
  }
}

// Make available globally
window.WheelCanvas = WheelCanvas;
