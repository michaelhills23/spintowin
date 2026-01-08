import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWheels } from '../hooks/useWheels';
import WheelCanvas from '../components/WheelCanvas';

export default function Dashboard() {
  const { currentUser, signOut } = useAuth();
  const { wheels, loading, createWheel, deleteWheel } = useWheels();
  const navigate = useNavigate();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [wheelToDelete, setWheelToDelete] = useState(null);

  async function handleCreateWheel() {
    const wheel = await createWheel({ name: 'New Wheel' });
    navigate(`/wheel/${wheel.id}`);
  }

  function handleDeleteClick(wheel) {
    setWheelToDelete(wheel);
    setDeleteModalOpen(true);
  }

  async function confirmDelete() {
    if (!wheelToDelete) return;
    await deleteWheel(wheelToDelete.id);
    setDeleteModalOpen(false);
    setWheelToDelete(null);
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading your wheels...</p>
      </div>
    );
  }

  return (
    <div>
      <header className="header">
        <div className="container header-content">
          <div className="logo">SpinToWin</div>
          <nav className="nav">
            <span className="user-name">
              {currentUser?.displayName || currentUser?.email}
            </span>
            <button onClick={() => signOut()} className="btn btn-secondary">
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      <main className="dashboard">
        <div className="container">
          <div className="dashboard-header">
            <h1>My Wheels</h1>
            <button onClick={handleCreateWheel} className="btn btn-primary">
              + Create Wheel
            </button>
          </div>

          {wheels.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">O</div>
              <h2>No wheels yet</h2>
              <p>Create your first spin wheel to get started!</p>
              <button onClick={handleCreateWheel} className="btn btn-primary btn-large">
                Create Your First Wheel
              </button>
            </div>
          ) : (
            <div className="wheels-grid">
              {wheels.map((wheel) => (
                <div key={wheel.id} className="wheel-card">
                  <div className="wheel-preview">
                    <WheelCanvas segments={wheel.segments} size={180} />
                  </div>
                  <div className="wheel-info">
                    <h3>{wheel.name}</h3>
                    <p>
                      {wheel.segments.length} segments | {wheel.stats?.totalSpins || 0} spins
                    </p>
                  </div>
                  <div className="wheel-actions">
                    <button
                      onClick={() => navigate(`/wheel/${wheel.id}`)}
                      className="btn btn-primary"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => window.open(`/spin/${wheel.shareId}`, '_blank')}
                      className="btn btn-secondary"
                    >
                      Spin
                    </button>
                    <button
                      onClick={() => handleDeleteClick(wheel)}
                      className="btn btn-icon delete-wheel"
                    >
                      X
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {deleteModalOpen && (
        <div className="modal">
          <div className="modal-backdrop" onClick={() => setDeleteModalOpen(false)}></div>
          <div className="modal-content">
            <h2>Delete Wheel?</h2>
            <p>
              Are you sure you want to delete "{wheelToDelete?.name}"? This action cannot be
              undone.
            </p>
            <div className="modal-actions">
              <button onClick={() => setDeleteModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={confirmDelete} className="btn btn-danger">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
