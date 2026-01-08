import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  limit as firestoreLimit,
  where,
  serverTimestamp,
  increment,
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export function useAnalytics() {
  const { currentUser } = useAuth();

  async function recordSpin(wheelId, spinResult) {
    const timestamp = serverTimestamp();

    const spinData = {
      wheelId,
      resultSegmentId: spinResult.segmentId,
      resultLabel: spinResult.label,
      spunBy: currentUser?.uid || null,
      spunByName: currentUser?.displayName || 'Anonymous',
      isAnonymous: !currentUser,
      spinDuration: spinResult.duration || 5000,
      finalAngle: spinResult.angle || 0,
      timestamp,
      segmentCount: spinResult.totalSegments || 0
    };

    await addDoc(collection(db, 'wheels', wheelId, 'spins'), spinData);

    // Update wheel stats
    await updateDoc(doc(db, 'wheels', wheelId), {
      'stats.totalSpins': increment(1),
      lastSpunAt: timestamp
    });

    // Update daily analytics
    await updateDailyAnalytics(wheelId, spinResult);

    return spinData;
  }

  async function updateDailyAnalytics(wheelId, spinResult) {
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours().toString();

    const analyticsRef = doc(db, 'wheels', wheelId, 'analytics', today);

    try {
      await setDoc(
        analyticsRef,
        {
          wheelId,
          period: 'daily',
          date: today,
          totalSpins: increment(1),
          anonymousSpins: increment(currentUser ? 0 : 1),
          [`results.${spinResult.segmentId}`]: increment(1),
          [`hourlyDistribution.${hour}`]: increment(1)
        },
        { merge: true }
      );
    } catch (error) {
      console.warn('Failed to update analytics:', error);
    }
  }

  async function getSpinHistory(wheelId, options = {}) {
    const { limit = 50 } = options;

    const q = query(
      collection(db, 'wheels', wheelId, 'spins'),
      orderBy('timestamp', 'desc'),
      firestoreLimit(limit)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    }));
  }

  async function getAnalytics(wheelId, options = {}) {
    const {
      startDate = getDateDaysAgo(30),
      endDate = new Date().toISOString().split('T')[0]
    } = options;

    const q = query(
      collection(db, 'wheels', wheelId, 'analytics'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  function calculateDistribution(analyticsData, segments) {
    const totals = {};

    analyticsData.forEach(day => {
      if (day.results) {
        Object.entries(day.results).forEach(([segmentId, count]) => {
          totals[segmentId] = (totals[segmentId] || 0) + count;
        });
      }
    });

    const totalSpins = Object.values(totals).reduce((a, b) => a + b, 0);

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

  function formatRelativeTime(date) {
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

  return {
    recordSpin,
    getSpinHistory,
    getAnalytics,
    calculateDistribution,
    formatRelativeTime
  };
}

function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}
