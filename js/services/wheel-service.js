/**
 * Wheel Service
 * Handles CRUD operations for wheels in Firestore
 */
class WheelService {
  constructor() {
    this.db = window.firebaseDb || firebase.firestore();
    this.wheelsCollection = this.db.collection('wheels');
  }

  /**
   * Generate unique ID
   */
  _generateId() {
    return 'seg_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate share ID (8 characters, URL-safe)
   */
  _generateShareId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate random color
   */
  _generateColor(index = 0) {
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
      '#9966FF', '#FF9F40', '#7CFC00', '#FF6B6B',
      '#48D1CC', '#DDA0DD', '#F0E68C', '#87CEEB'
    ];
    return colors[index % colors.length];
  }

  /**
   * CREATE - Create a new wheel
   */
  async createWheel(wheelData = {}) {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Must be authenticated');

    const shareId = this._generateShareId();

    const newWheel = {
      name: wheelData.name || 'My Wheel',
      description: wheelData.description || '',
      ownerId: user.uid,
      segments: wheelData.segments || [
        { id: this._generateId(), label: 'Option 1', color: '#FF6384', weight: 1 },
        { id: this._generateId(), label: 'Option 2', color: '#36A2EB', weight: 1 }
      ],
      appearance: {
        borderColor: '#333333',
        borderWidth: 4,
        pointerStyle: 'arrow',
        fontSize: 14,
        fontFamily: 'Arial'
      },
      visibility: 'private',
      shareId: shareId,
      allowAnonymousSpins: true,
      spinConfig: {
        duration: 5000,
        minRotations: 5,
        maxRotations: 10,
        easing: 'easeOutCubic'
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastSpunAt: null,
      stats: {
        totalSpins: 0,
        uniqueSpinners: 0
      }
    };

    const docRef = await this.wheelsCollection.add(newWheel);

    // Update user stats
    try {
      await this.db.collection('users').doc(user.uid).update({
        'stats.totalWheels': firebase.firestore.FieldValue.increment(1)
      });
    } catch (e) {
      console.warn('Could not update user stats:', e);
    }

    return { id: docRef.id, ...newWheel };
  }

  /**
   * READ - Get single wheel by ID
   */
  async getWheel(wheelId) {
    const doc = await this.wheelsCollection.doc(wheelId).get();
    if (!doc.exists) throw new Error('Wheel not found');
    return { id: doc.id, ...doc.data() };
  }

  /**
   * READ - Get wheel by share ID
   */
  async getWheelByShareId(shareId) {
    const snapshot = await this.wheelsCollection
      .where('shareId', '==', shareId)
      .limit(1)
      .get();

    if (snapshot.empty) throw new Error('Wheel not found');
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  /**
   * READ - Get all wheels for a user
   */
  async getUserWheels(userId) {
    const snapshot = await this.wheelsCollection
      .where('ownerId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * UPDATE - Update wheel
   */
  async updateWheel(wheelId, updates) {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Must be authenticated');

    // Verify ownership
    const wheel = await this.getWheel(wheelId);
    if (wheel.ownerId !== user.uid) throw new Error('Not authorized');

    // Remove fields that shouldn't be updated directly
    const safeUpdates = { ...updates };
    delete safeUpdates.id;
    delete safeUpdates.ownerId;
    delete safeUpdates.createdAt;

    await this.wheelsCollection.doc(wheelId).update({
      ...safeUpdates,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    return this.getWheel(wheelId);
  }

  /**
   * DELETE - Delete wheel
   */
  async deleteWheel(wheelId) {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Must be authenticated');

    // Verify ownership
    const wheel = await this.getWheel(wheelId);
    if (wheel.ownerId !== user.uid) throw new Error('Not authorized');

    // Delete subcollections first
    await this._deleteSubcollection(wheelId, 'spins');
    await this._deleteSubcollection(wheelId, 'analytics');

    // Delete the wheel
    await this.wheelsCollection.doc(wheelId).delete();

    // Update user stats
    try {
      await this.db.collection('users').doc(user.uid).update({
        'stats.totalWheels': firebase.firestore.FieldValue.increment(-1)
      });
    } catch (e) {
      console.warn('Could not update user stats:', e);
    }
  }

  /**
   * Delete subcollection
   */
  async _deleteSubcollection(wheelId, subcollection) {
    const snapshot = await this.wheelsCollection
      .doc(wheelId)
      .collection(subcollection)
      .limit(100)
      .get();

    if (snapshot.empty) return;

    const batch = this.db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    // Recursive call if there are more docs
    if (snapshot.size === 100) {
      await this._deleteSubcollection(wheelId, subcollection);
    }
  }

  // =====================================
  // SEGMENT OPERATIONS
  // =====================================

  /**
   * Add segment to wheel
   */
  async addSegment(wheelId, segmentData) {
    const wheel = await this.getWheel(wheelId);

    const newSegment = {
      id: this._generateId(),
      label: segmentData.label || 'New Option',
      color: segmentData.color || this._generateColor(wheel.segments.length),
      weight: segmentData.weight || 1
    };

    const segments = [...wheel.segments, newSegment];
    await this.updateWheel(wheelId, { segments });

    return newSegment;
  }

  /**
   * Update segment
   */
  async updateSegment(wheelId, segmentId, updates) {
    const wheel = await this.getWheel(wheelId);

    const segments = wheel.segments.map(seg =>
      seg.id === segmentId ? { ...seg, ...updates } : seg
    );

    await this.updateWheel(wheelId, { segments });
    return segments.find(s => s.id === segmentId);
  }

  /**
   * Remove segment
   */
  async removeSegment(wheelId, segmentId) {
    const wheel = await this.getWheel(wheelId);

    if (wheel.segments.length <= 2) {
      throw new Error('Wheel must have at least 2 segments');
    }

    const segments = wheel.segments.filter(seg => seg.id !== segmentId);
    await this.updateWheel(wheelId, { segments });
  }

  /**
   * Reorder segments
   */
  async reorderSegments(wheelId, newOrder) {
    await this.updateWheel(wheelId, { segments: newOrder });
  }

  // =====================================
  // REAL-TIME SUBSCRIPTIONS
  // =====================================

  /**
   * Subscribe to wheel changes
   */
  subscribeToWheel(wheelId, callback) {
    return this.wheelsCollection.doc(wheelId).onSnapshot(doc => {
      if (doc.exists) {
        callback({ id: doc.id, ...doc.data() });
      }
    });
  }

  /**
   * Subscribe to user's wheels
   */
  subscribeToUserWheels(userId, callback) {
    return this.wheelsCollection
      .where('ownerId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .onSnapshot(snapshot => {
        const wheels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(wheels);
      });
  }
}

// Export singleton
window.wheelService = new WheelService();
