/**
 * Analytics Service
 * Handles spin tracking and analytics data
 */
class AnalyticsService {
  constructor() {
    this.db = window.firebaseDb || firebase.firestore();
  }

  /**
   * Record a spin event
   */
  async recordSpin(wheelId, spinResult) {
    const user = firebase.auth().currentUser;
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    // Create spin record
    const spinData = {
      wheelId: wheelId,
      resultSegmentId: spinResult.segmentId,
      resultLabel: spinResult.label,
      spunBy: user?.uid || null,
      spunByName: user?.displayName || 'Anonymous',
      isAnonymous: !user,
      spinDuration: spinResult.duration || 5000,
      finalAngle: spinResult.angle || 0,
      timestamp: timestamp,
      segmentCount: spinResult.totalSegments || 0
    };

    // Add to spins subcollection
    const spinRef = await this.db
      .collection('wheels')
      .doc(wheelId)
      .collection('spins')
      .add(spinData);

    // Update wheel stats
    try {
      await this.db.collection('wheels').doc(wheelId).update({
        'stats.totalSpins': firebase.firestore.FieldValue.increment(1),
        lastSpunAt: timestamp
      });
    } catch (e) {
      console.warn('Could not update wheel stats:', e);
    }

    // Update daily analytics
    await this._updateDailyAnalytics(wheelId, spinResult);

    return spinRef.id;
  }

  /**
   * Update daily analytics aggregate
   */
  async _updateDailyAnalytics(wheelId, spinResult) {
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours().toString();

    const analyticsRef = this.db
      .collection('wheels')
      .doc(wheelId)
      .collection('analytics')
      .doc(today);

    const user = firebase.auth().currentUser;

    try {
      await analyticsRef.set({
        wheelId: wheelId,
        period: 'daily',
        date: today,
        totalSpins: firebase.firestore.FieldValue.increment(1),
        anonymousSpins: firebase.firestore.FieldValue.increment(user ? 0 : 1),
        [`results.${spinResult.segmentId}`]: firebase.firestore.FieldValue.increment(1),
        [`hourlyDistribution.${hour}`]: firebase.firestore.FieldValue.increment(1)
      }, { merge: true });
    } catch (error) {
      console.warn('Failed to update analytics:', error);
    }
  }

  /**
   * Get spin history for a wheel
   */
  async getSpinHistory(wheelId, options = {}) {
    const { limit = 50, startAfter = null } = options;

    let query = this.db
      .collection('wheels')
      .doc(wheelId)
      .collection('spins')
      .orderBy('timestamp', 'desc')
      .limit(limit);

    if (startAfter) {
      query = query.startAfter(startAfter);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    }));
  }

  /**
   * Get analytics for date range
   */
  async getAnalytics(wheelId, options = {}) {
    const {
      startDate = this._getDateDaysAgo(30),
      endDate = new Date().toISOString().split('T')[0]
    } = options;

    const snapshot = await this.db
      .collection('wheels')
      .doc(wheelId)
      .collection('analytics')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'asc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Calculate segment distribution from analytics
   */
  calculateDistribution(analyticsData, segments) {
    const totals = {};

    // Sum up results across all days
    analyticsData.forEach(day => {
      if (day.results) {
        Object.entries(day.results).forEach(([segmentId, count]) => {
          totals[segmentId] = (totals[segmentId] || 0) + count;
        });
      }
    });

    // Calculate total spins
    const totalSpins = Object.values(totals).reduce((a, b) => a + b, 0);

    // Map to segment labels and calculate percentages
    return segments.map(segment => ({
      segmentId: segment.id,
      label: segment.label,
      color: segment.color,
      count: totals[segment.id] || 0,
      percentage: totalSpins > 0
        ? ((totals[segment.id] || 0) / totalSpins * 100).toFixed(1)
        : '0.0'
    }));
  }

  /**
   * Get date N days ago
   */
  _getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Format relative time
   */
  formatRelativeTime(date) {
    if (!date) return 'Unknown';

    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  }
}

// Export singleton
window.analyticsService = new AnalyticsService();
