import { useEffect, useRef } from 'react';

export default function WheelCanvas({ segments, rotation = 0, size = 500, options = {} }) {
  const canvasRef = useRef(null);

  const opts = {
    borderWidth: 4,
    borderColor: '#333333',
    centerRadius: 35,
    centerColor: '#1e293b',
    pointerColor: '#ef4444',
    fontSize: 14,
    fontFamily: 'Arial, sans-serif',
    ...options
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - opts.borderWidth - 20;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    if (!segments || segments.length === 0) {
      // Draw empty state
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = opts.borderColor;
      ctx.lineWidth = opts.borderWidth;
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '16px ' + opts.fontFamily;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Add segments', centerX, centerY);
      return;
    }

    // Save context and apply rotation
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.translate(-centerX, -centerY);

    // Draw segments
    const totalWeight = segments.reduce((sum, seg) => sum + (seg.weight || 1), 0);
    let startAngle = -Math.PI / 2;

    segments.forEach((segment, index) => {
      const segmentWeight = segment.weight || 1;
      const sliceAngle = (segmentWeight / totalWeight) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = segment.color || getDefaultColor(index);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw label
      const midAngle = startAngle + sliceAngle / 2;
      const labelRadius = radius * 0.65;
      const x = centerX + Math.cos(midAngle) * labelRadius;
      const y = centerY + Math.sin(midAngle) * labelRadius;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(midAngle + Math.PI / 2);

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${opts.fontSize}px ${opts.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let displayLabel = segment.label;
      const maxWidth = radius * 0.4;
      while (ctx.measureText(displayLabel).width > maxWidth && displayLabel.length > 3) {
        displayLabel = displayLabel.slice(0, -1);
      }
      if (displayLabel !== segment.label) {
        displayLabel += '...';
      }

      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(displayLabel, 0, 0);

      ctx.restore();

      startAngle = endAngle;
    });

    ctx.restore();

    // Draw border
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = opts.borderColor;
    ctx.lineWidth = opts.borderWidth;
    ctx.stroke();

    // Draw center
    ctx.beginPath();
    ctx.arc(centerX, centerY, opts.centerRadius + 5, 0, Math.PI * 2);
    ctx.fillStyle = opts.borderColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, opts.centerRadius, 0, Math.PI * 2);
    ctx.fillStyle = opts.centerColor;
    ctx.fill();

    // Draw pointer
    const pointerSize = 20;
    ctx.save();
    ctx.translate(centerX, opts.borderWidth + 10);

    ctx.beginPath();
    ctx.moveTo(0, pointerSize);
    ctx.lineTo(-pointerSize / 2, 0);
    ctx.lineTo(pointerSize / 2, 0);
    ctx.closePath();

    ctx.fillStyle = opts.pointerColor;
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }, [segments, rotation, size, opts]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    />
  );
}

function getDefaultColor(index) {
  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
    '#9966FF', '#FF9F40', '#7CFC00', '#FF6B6B',
    '#48D1CC', '#DDA0DD', '#F0E68C', '#87CEEB'
  ];
  return colors[index % colors.length];
}

export function getSegmentAtAngle(segments, angle) {
  if (!segments || segments.length === 0) return null;

  let normalizedAngle = angle % (Math.PI * 2);
  if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;

  const totalWeight = segments.reduce((sum, seg) => sum + (seg.weight || 1), 0);

  const pointerAngle = -Math.PI / 2;
  let checkAngle = pointerAngle - normalizedAngle;

  while (checkAngle < 0) checkAngle += Math.PI * 2;
  checkAngle = checkAngle % (Math.PI * 2);

  let segmentAngle = checkAngle + Math.PI / 2;
  if (segmentAngle >= Math.PI * 2) segmentAngle -= Math.PI * 2;

  let currentAngle = 0;
  for (const segment of segments) {
    const segmentWeight = segment.weight || 1;
    const segmentSize = (segmentWeight / totalWeight) * Math.PI * 2;

    if (segmentAngle >= currentAngle && segmentAngle < currentAngle + segmentSize) {
      return segment;
    }
    currentAngle += segmentSize;
  }

  return segments[0];
}
