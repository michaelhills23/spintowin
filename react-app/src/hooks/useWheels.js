import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export function useWheels() {
  const { currentUser } = useAuth();
  const [wheels, setWheels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setWheels([]);
      setLoading(false);
      return;
    }

    loadWheels();
  }, [currentUser]);

  async function loadWheels() {
    try {
      const q = query(
        collection(db, 'wheels'),
        where('ownerId', '==', currentUser.uid),
        orderBy('updatedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const wheelsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setWheels(wheelsData);
    } catch (error) {
      console.error('Error loading wheels:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createWheel(wheelData = {}) {
    const shareId = generateShareId();

    const newWheel = {
      name: wheelData.name || 'New Wheel',
      description: wheelData.description || '',
      ownerId: currentUser.uid,
      segments: wheelData.segments || [
        { id: generateId(), label: 'Option 1', color: '#FF6384', weight: 1 },
        { id: generateId(), label: 'Option 2', color: '#36A2EB', weight: 1 }
      ],
      appearance: {
        borderColor: '#333333',
        borderWidth: 4,
        pointerStyle: 'arrow',
        fontSize: 14,
        fontFamily: 'Arial'
      },
      visibility: 'private',
      shareId,
      allowAnonymousSpins: true,
      spinConfig: {
        duration: 5000,
        minRotations: 5,
        maxRotations: 10,
        easing: 'easeOutCubic'
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastSpunAt: null,
      stats: {
        totalSpins: 0,
        uniqueSpinners: 0
      }
    };

    const docRef = await addDoc(collection(db, 'wheels'), newWheel);

    // Update user stats
    await updateDoc(doc(db, 'users', currentUser.uid), {
      'stats.totalWheels': increment(1)
    });

    const createdWheel = { id: docRef.id, ...newWheel };
    setWheels(prev => [createdWheel, ...prev]);
    return createdWheel;
  }

  async function updateWheel(wheelId, updates) {
    await updateDoc(doc(db, 'wheels', wheelId), {
      ...updates,
      updatedAt: serverTimestamp()
    });

    setWheels(prev =>
      prev.map(w => (w.id === wheelId ? { ...w, ...updates } : w))
    );
  }

  async function deleteWheel(wheelId) {
    const batch = writeBatch(db);

    // Delete spins subcollection
    const spinsSnapshot = await getDocs(
      collection(db, 'wheels', wheelId, 'spins')
    );
    spinsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    // Delete analytics subcollection
    const analyticsSnapshot = await getDocs(
      collection(db, 'wheels', wheelId, 'analytics')
    );
    analyticsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    // Delete wheel
    batch.delete(doc(db, 'wheels', wheelId));

    // Update user stats
    batch.update(doc(db, 'users', currentUser.uid), {
      'stats.totalWheels': increment(-1)
    });

    await batch.commit();

    setWheels(prev => prev.filter(w => w.id !== wheelId));
  }

  return {
    wheels,
    loading,
    createWheel,
    updateWheel,
    deleteWheel,
    reload: loadWheels
  };
}

export async function getWheelById(wheelId) {
  const docRef = doc(db, 'wheels', wheelId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error('Wheel not found');
  }

  return { id: docSnap.id, ...docSnap.data() };
}

export async function getWheelByShareId(shareId) {
  const q = query(
    collection(db, 'wheels'),
    where('shareId', '==', shareId),
    firestoreLimit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error('Wheel not found');
  }

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

function generateId() {
  return 'seg_' + Math.random().toString(36).substr(2, 9);
}

function generateShareId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
