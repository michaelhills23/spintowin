/**
 * WheelSpinner - Spin animation controller
 * Handles spin physics, animation, and result determination
 */
class WheelSpinner {
  constructor(wheelCanvas, options = {}) {
    this.wheel = wheelCanvas;
    this.isSpinning = false;
    this.currentRotation = 0;

    this.options = {
      duration: options.duration || 5000,        // Spin duration in ms
      minRotations: options.minRotations || 5,   // Minimum full rotations
      maxRotations: options.maxRotations || 10,  // Maximum full rotations
      easing: options.easing || 'easeOutCubic',  // Easing function
      ...options
    };

    // Callbacks
    this._onStart = null;
    this._onComplete = null;
    this._onTick = null;
  }

  /**
   * Update options
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
    return this;
  }

  /**
   * Register start callback
   */
  onStart(callback) {
    this._onStart = callback;
    return this;
  }

  /**
   * Register complete callback
   */
  onComplete(callback) {
    this._onComplete = callback;
    return this;
  }

  /**
   * Register tick callback (called each animation frame)
   */
  onTick(callback) {
    this._onTick = callback;
    return this;
  }

  /**
   * Start spin animation
   * Returns promise that resolves with the result
   */
  spin() {
    return new Promise((resolve) => {
      if (this.isSpinning) {
        resolve(null);
        return;
      }

      if (this.wheel.segments.length === 0) {
        resolve(null);
        return;
      }

      this.isSpinning = true;

      // Calculate target rotation
      const targetAngle = this._calculateTargetAngle();
      const startRotation = this.currentRotation;
      const totalRotation = targetAngle - startRotation;

      // Notify start
      if (this._onStart) {
        this._onStart();
      }

      // Animation
      const startTime = performance.now();
      const duration = this.options.duration;

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Apply easing
        const easedProgress = this._easing(progress);

        // Calculate current rotation
        this.currentRotation = startRotation + (totalRotation * easedProgress);

        // Update wheel
        this.wheel.setRotation(this.currentRotation).render();

        // Notify tick
        if (this._onTick) {
          this._onTick(this.currentRotation, progress);
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Spin complete
          this.isSpinning = false;

          // Normalize rotation to 0-2PI
          this.currentRotation = this.currentRotation % (Math.PI * 2);
          if (this.currentRotation < 0) {
            this.currentRotation += Math.PI * 2;
          }

          // Get winning segment
          const segment = this.wheel.getSegmentAtAngle(this.currentRotation);

          const result = {
            segment: segment,
            finalAngle: this.currentRotation,
            duration: duration
          };

          // Notify complete
          if (this._onComplete) {
            this._onComplete(result);
          }

          resolve(result);
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /**
   * Force stop the spin
   */
  stop() {
    this.isSpinning = false;
  }

  /**
   * Calculate target angle with weighted randomness
   */
  _calculateTargetAngle() {
    // Random number of full rotations
    const rotations = this.options.minRotations +
      Math.random() * (this.options.maxRotations - this.options.minRotations);

    // Calculate weighted random position
    const segments = this.wheel.segments;
    const totalWeight = segments.reduce((sum, seg) => sum + (seg.weight || 1), 0);

    // Pick random value based on weights
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

    // Calculate angle for selected segment
    let segmentStartAngle = 0;
    for (let i = 0; i < selectedIndex; i++) {
      const weight = segments[i].weight || 1;
      segmentStartAngle += (weight / totalWeight) * Math.PI * 2;
    }

    const selectedWeight = segments[selectedIndex].weight || 1;
    const segmentAngle = (selectedWeight / totalWeight) * Math.PI * 2;

    // Land somewhere in the middle of the segment
    const landingOffset = segmentStartAngle + (Math.random() * 0.6 + 0.2) * segmentAngle;

    // The pointer is at top (270 degrees = 1.5 * PI)
    // We need to rotate so this segment is at the pointer
    const pointerAngle = Math.PI * 1.5;
    const targetOffset = pointerAngle - landingOffset;

    // Total rotation: current + full rotations + offset to land on segment
    return this.currentRotation + (rotations * Math.PI * 2) + targetOffset;
  }

  /**
   * Easing function
   */
  _easing(t) {
    switch (this.options.easing) {
      case 'linear':
        return t;

      case 'easeOutQuad':
        return t * (2 - t);

      case 'easeOutCubic':
        return 1 - Math.pow(1 - t, 3);

      case 'easeOutQuart':
        return 1 - Math.pow(1 - t, 4);

      case 'easeOutExpo':
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

      case 'easeOutBack':
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);

      case 'easeOutElastic':
        if (t === 0 || t === 1) return t;
        return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;

      default:
        return 1 - Math.pow(1 - t, 3); // Default to easeOutCubic
    }
  }
}

// Make available globally
window.WheelSpinner = WheelSpinner;
