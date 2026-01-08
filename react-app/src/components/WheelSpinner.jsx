import { useState, useRef, useCallback } from 'react';
import WheelCanvas, { getSegmentAtAngle } from './WheelCanvas';

export default function WheelSpinner({
  segments,
  onSpinComplete,
  spinConfig = {},
  size = 500
}) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const currentRotationRef = useRef(0);

  const config = {
    duration: 5000,
    minRotations: 5,
    maxRotations: 10,
    easing: 'easeOutCubic',
    ...spinConfig
  };

  const spin = useCallback(() => {
    if (isSpinning || !segments || segments.length === 0) return;

    setIsSpinning(true);

    // Calculate target
    const rotations = config.minRotations +
      Math.random() * (config.maxRotations - config.minRotations);

    const totalWeight = segments.reduce((sum, seg) => sum + (seg.weight || 1), 0);
    let randomValue = Math.random() * totalWeight;
    let selectedIndex = 0;
    let accumulatedWeight = 0;

    for (let i = 0; i < segments.length; i++) {
      accumulatedWeight += segments[i].weight || 1;
      if (randomValue <= accumulatedWeight) {
        selectedIndex = i;
        break;
      }
    }

    let segmentStartAngle = 0;
    for (let i = 0; i < selectedIndex; i++) {
      const weight = segments[i].weight || 1;
      segmentStartAngle += (weight / totalWeight) * Math.PI * 2;
    }

    const selectedWeight = segments[selectedIndex].weight || 1;
    const segmentAngle = (selectedWeight / totalWeight) * Math.PI * 2;
    const landingOffset = segmentStartAngle + (Math.random() * 0.6 + 0.2) * segmentAngle;

    const pointerAngle = -Math.PI / 2;
    const targetOffset = pointerAngle - landingOffset;

    const startRotation = currentRotationRef.current;
    const targetAngle = startRotation + (rotations * Math.PI * 2) + targetOffset;
    const totalRotation = targetAngle - startRotation;

    // Animation
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / config.duration, 1);

      const easedProgress = easeOutCubic(progress);
      const newRotation = startRotation + totalRotation * easedProgress;

      currentRotationRef.current = newRotation;
      setRotation(newRotation);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);

        let normalizedRotation = newRotation % (Math.PI * 2);
        if (normalizedRotation < 0) normalizedRotation += Math.PI * 2;

        currentRotationRef.current = normalizedRotation;
        setRotation(normalizedRotation);

        const winningSegment = getSegmentAtAngle(segments, normalizedRotation);

        if (onSpinComplete && winningSegment) {
          onSpinComplete({
            segment: winningSegment,
            finalAngle: normalizedRotation,
            duration: config.duration
          });
        }
      }
    };

    requestAnimationFrame(animate);
  }, [segments, isSpinning, config, onSpinComplete]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <WheelCanvas segments={segments} rotation={rotation} size={size} />
      <button
        onClick={spin}
        disabled={isSpinning}
        className="spin-button"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: isSpinning ? 0.7 : 1,
          cursor: isSpinning ? 'not-allowed' : 'pointer'
        }}
      >
        {isSpinning ? '...' : 'SPIN'}
      </button>
    </div>
  );
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
