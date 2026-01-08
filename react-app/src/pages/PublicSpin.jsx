import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getWheelByShareId } from '../hooks/useWheels';
import { useAnalytics } from '../hooks/useAnalytics';
import WheelSpinner from '../components/WheelSpinner';

export default function PublicSpin() {
  const { shareId } = useParams();
  const analytics = useAnalytics();

  const [wheel, setWheel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [result, setResult] = useState(null);
  const [recentResults, setRecentResults] = useState([]);

  useEffect(() => {
    loadWheel();
  }, [shareId]);

  async function loadWheel() {
    try {
      const data = await getWheelByShareId(shareId);

      if (data.visibility === 'private') {
        setError(true);
        return;
      }

      setWheel(data);

      // Load recent spins
      const history = await analytics.getSpinHistory(data.id, { limit: 5 });
      setRecentResults(
        history.map(spin => {
          const segment = data.segments.find(s => s.id === spin.resultSegmentId);
          return {
            label: spin.resultLabel,
            color: segment?.color || '#666',
            time: spin.timestamp
          };
        })
      );
    } catch (err) {
      console.error('Failed to load wheel:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleSpinComplete(spinResult) {
    // Record spin
    try {
      await analytics.recordSpin(wheel.id, {
        segmentId: spinResult.segment.id,
        label: spinResult.segment.label,
        duration: spinResult.duration,
        angle: spinResult.finalAngle,
        totalSegments: wheel.segments.length
      });

      // Update recent results
      setRecentResults(prev => [
        {
          label: spinResult.segment.label,
          color: spinResult.segment.color,
          time: new Date()
        },
        ...prev.slice(0, 4)
      ]);

      // Show result modal
      setResult(spinResult.segment);
    } catch (error) {
      console.warn('Failed to record spin:', error);
      setResult(spinResult.segment);
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading wheel...</p>
      </div>
    );
  }

  if (error || !wheel) {
    return (
      <div className="error-state">
        <h2>Wheel Not Found</h2>
        <p>This wheel may have been deleted or the link is invalid.</p>
        <a href="/" className="btn btn-primary">
          Go Home
        </a>
      </div>
    );
  }

  return (
    <div className="spin-page">
      <header className="header header-minimal">
        <div className="container header-content">
          <div className="logo">SpinToWin</div>
          <nav className="nav">
            <a href="/login" className="btn btn-secondary">
              Create Your Own
            </a>
          </nav>
        </div>
      </header>

      <main className="spin-main">
        <div className="spin-content">
          <h1 className="wheel-title">{wheel.name}</h1>

          <div className="spin-wheel-container">
            <WheelSpinner
              segments={wheel.segments}
              onSpinComplete={handleSpinComplete}
              spinConfig={wheel.spinConfig}
              size={500}
            />
          </div>

          <div className="recent-results">
            <h3>Recent Results</h3>
            <div className="recent-list">
              {recentResults.length === 0 ? (
                <div className="recent-item" style={{ color: 'var(--text-muted)' }}>
                  No spins yet. Be the first!
                </div>
              ) : (
                recentResults.map((res, i) => (
                  <div key={i} className="recent-item">
                    <div
                      className="recent-color"
                      style={{ background: res.color }}
                    ></div>
                    <span>{res.label}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {result && (
        <ResultModal result={result} onClose={() => setResult(null)} />
      )}
    </div>
  );
}

function ResultModal({ result, onClose }) {
  return (
    <div className="modal">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="modal-content result-modal-content">
        <Confetti />
        <h2>You got:</h2>
        <div className="modal-result" style={{ color: result.color }}>
          {result.label}
        </div>
        {result.link && (
          <a
            href={result.link}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-large"
            style={{ marginBottom: '0.5rem' }}
          >
            Visit Link
          </a>
        )}
        <button onClick={onClose} className="btn btn-secondary btn-large">
          Spin Again!
        </button>
      </div>
    </div>
  );
}

function Confetti() {
  const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 8 + Math.random() * 8
  }));

  return (
    <div className="confetti-container">
      {pieces.map(piece => (
        <div
          key={piece.id}
          style={{
            position: 'absolute',
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            left: `${piece.left}%`,
            top: '-10px',
            transform: `rotate(${Math.random() * 360}deg)`,
            animation: `fall ${1 + Math.random() * 2}s linear forwards`,
            animationDelay: `${piece.delay}s`
          }}
        />
      ))}
      <style>
        {`
          @keyframes fall {
            to {
              transform: translateY(400px) rotate(720deg);
              opacity: 0;
            }
          }
          .confetti-container {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 300px;
            overflow: hidden;
            pointer-events: none;
          }
        `}
      </style>
    </div>
  );
}
