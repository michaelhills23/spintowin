import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWheelById } from '../hooks/useWheels';
import { useAnalytics } from '../hooks/useAnalytics';
import { useToast } from '../components/Toast';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import WheelSpinner from '../components/WheelSpinner';

export default function WheelEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const analytics = useAnalytics();

  const [wheel, setWheel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState('segments');
  const [segmentModalOpen, setSegmentModalOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);
  const [spinHistory, setSpinHistory] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    loadWheel();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'analytics' && wheel) {
      loadAnalytics();
    }
  }, [activeTab, wheel]);

  async function loadWheel() {
    try {
      const data = await getWheelById(id);
      setWheel(data);
    } catch (error) {
      console.error('Failed to load wheel:', error);
      toast.error('Failed to load wheel');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalytics() {
    try {
      const [history, data] = await Promise.all([
        analytics.getSpinHistory(id, { limit: 10 }),
        analytics.getAnalytics(id)
      ]);
      setSpinHistory(history);
      setAnalyticsData(data);
    } catch (error) {
      console.warn('Failed to load analytics:', error);
    }
  }

  async function saveWheel() {
    if (!isDirty) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'wheels', id), {
        name: wheel.name,
        segments: wheel.segments,
        spinConfig: wheel.spinConfig,
        appearance: wheel.appearance,
        visibility: wheel.visibility,
        allowAnonymousSpins: wheel.allowAnonymousSpins
      });

      setIsDirty(false);
      toast.success('Wheel saved!');
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save wheel');
    } finally {
      setSaving(false);
    }
  }

  function updateWheel(updates) {
    setWheel(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }

  function addSegment() {
    setEditingSegment(null);
    setSegmentModalOpen(true);
  }

  function editSegment(segment) {
    setEditingSegment(segment);
    setSegmentModalOpen(true);
  }

  function saveSegment(segmentData) {
    if (editingSegment) {
      const newSegments = wheel.segments.map(s =>
        s.id === editingSegment.id ? { ...s, ...segmentData } : s
      );
      updateWheel({ segments: newSegments });
    } else {
      const newSegment = {
        id: 'seg_' + Math.random().toString(36).substr(2, 9),
        ...segmentData
      };
      updateWheel({ segments: [...wheel.segments, newSegment] });
    }
    setSegmentModalOpen(false);
  }

  function deleteSegment(segmentId) {
    if (wheel.segments.length <= 2) {
      toast.error('Wheel must have at least 2 segments');
      return;
    }
    updateWheel({ segments: wheel.segments.filter(s => s.id !== segmentId) });
  }

  async function handleTestSpin(result) {
    setTestResult(result.segment);
  }

  function copyShareUrl() {
    const url = `${window.location.origin}/spin/${wheel.shareId}`;
    navigator.clipboard.writeText(url);
    toast.success('URL copied!');
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading wheel...</p>
      </div>
    );
  }

  if (!wheel) return null;

  const distribution = analytics.calculateDistribution(analyticsData, wheel.segments);
  const maxCount = Math.max(...distribution.map(d => d.count), 1);

  return (
    <div>
      <header className="header">
        <div className="container header-content">
          <div className="logo">SpinToWin</div>
          <nav className="nav">
            <button
              onClick={saveWheel}
              disabled={!isDirty || saving}
              className="btn btn-primary"
            >
              {saving ? 'Saving...' : isDirty ? 'Save*' : 'Save'}
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
              Back
            </button>
          </nav>
        </div>
      </header>

      <main className="wheel-editor">
        <div className="editor-layout">
          <section className="wheel-preview-section">
            <div className="wheel-container">
              <WheelSpinner
                segments={wheel.segments}
                onSpinComplete={handleTestSpin}
                spinConfig={wheel.spinConfig}
                size={500}
              />
            </div>
          </section>

          <section className="editor-panel">
            <div className="editor-tabs">
              <button
                className={`tab-btn ${activeTab === 'segments' ? 'active' : ''}`}
                onClick={() => setActiveTab('segments')}
              >
                Segments
              </button>
              <button
                className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                Settings
              </button>
              <button
                className={`tab-btn ${activeTab === 'share' ? 'active' : ''}`}
                onClick={() => setActiveTab('share')}
              >
                Share
              </button>
              <button
                className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
              >
                Analytics
              </button>
            </div>

            {activeTab === 'segments' && (
              <div className="tab-content">
                <div className="panel-header">
                  <input
                    type="text"
                    className="wheel-name-input"
                    value={wheel.name}
                    onChange={e => updateWheel({ name: e.target.value })}
                    placeholder="Wheel Name"
                  />
                </div>

                <div className="segments-list">
                  {wheel.segments.map(segment => (
                    <div key={segment.id} className="segment-item">
                      <div
                        className="segment-color"
                        style={{ background: segment.color }}
                      ></div>
                      <span className="segment-label">{segment.label}</span>
                      <span className="segment-weight">{segment.weight}x</span>
                      <div className="segment-actions">
                        <button onClick={() => editSegment(segment)}>Edit</button>
                        <button
                          onClick={() => deleteSegment(segment.id)}
                          disabled={wheel.segments.length <= 2}
                          className="delete-btn"
                        >
                          Del
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={addSegment} className="btn btn-secondary btn-full">
                  + Add Segment
                </button>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="tab-content">
                <h3>Spin Settings</h3>

                <div className="form-group">
                  <label>Spin Duration (seconds)</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={wheel.spinConfig.duration / 1000}
                    onChange={e =>
                      updateWheel({
                        spinConfig: {
                          ...wheel.spinConfig,
                          duration: parseInt(e.target.value) * 1000
                        }
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Min Rotations</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={wheel.spinConfig.minRotations}
                    onChange={e =>
                      updateWheel({
                        spinConfig: {
                          ...wheel.spinConfig,
                          minRotations: parseInt(e.target.value)
                        }
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Max Rotations</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={wheel.spinConfig.maxRotations}
                    onChange={e =>
                      updateWheel({
                        spinConfig: {
                          ...wheel.spinConfig,
                          maxRotations: parseInt(e.target.value)
                        }
                      })
                    }
                  />
                </div>

                <h3>Appearance</h3>

                <div className="form-group">
                  <label>Border Color</label>
                  <input
                    type="color"
                    value={wheel.appearance.borderColor}
                    onChange={e =>
                      updateWheel({
                        appearance: { ...wheel.appearance, borderColor: e.target.value }
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Font Size</label>
                  <input
                    type="number"
                    min="10"
                    max="24"
                    value={wheel.appearance.fontSize}
                    onChange={e =>
                      updateWheel({
                        appearance: {
                          ...wheel.appearance,
                          fontSize: parseInt(e.target.value)
                        }
                      })
                    }
                  />
                </div>
              </div>
            )}

            {activeTab === 'share' && (
              <div className="tab-content">
                <h3>Share Your Wheel</h3>

                <div className="form-group">
                  <label>Visibility</label>
                  <select
                    value={wheel.visibility}
                    onChange={e => updateWheel({ visibility: e.target.value })}
                  >
                    <option value="private">Private (only you)</option>
                    <option value="unlisted">Unlisted (anyone with link)</option>
                    <option value="public">Public</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={wheel.allowAnonymousSpins}
                      onChange={e =>
                        updateWheel({ allowAnonymousSpins: e.target.checked })
                      }
                    />
                    Allow anonymous spins
                  </label>
                </div>

                {wheel.visibility !== 'private' && (
                  <div className="share-url-section">
                    <label>Share URL</label>
                    <div className="share-url-group">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/spin/${wheel.shareId}`}
                      />
                      <button onClick={copyShareUrl} className="btn btn-secondary">
                        Copy
                      </button>
                    </div>
                    <a
                      href={`/spin/${wheel.shareId}`}
                      target="_blank"
                      className="btn btn-primary btn-full"
                    >
                      Open Spin Page
                    </a>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="tab-content">
                <h3>Analytics</h3>

                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{wheel.stats?.totalSpins || 0}</div>
                    <div className="stat-label">Total Spins</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{wheel.stats?.uniqueSpinners || 0}</div>
                    <div className="stat-label">Unique Spinners</div>
                  </div>
                </div>

                <h4>Result Distribution</h4>
                <div className="distribution-chart">
                  {distribution.map(item => (
                    <div key={item.segmentId} className="distribution-bar">
                      <span className="bar-label">{item.label}</span>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${(item.count / maxCount) * 100}%`,
                            background: item.color
                          }}
                        ></div>
                      </div>
                      <span className="bar-value">{item.percentage}%</span>
                    </div>
                  ))}
                </div>

                <h4>Recent Spins</h4>
                <div className="recent-spins">
                  {spinHistory.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      No spins yet
                    </p>
                  ) : (
                    spinHistory.map(spin => {
                      const segment = wheel.segments.find(
                        s => s.id === spin.resultSegmentId
                      );
                      return (
                        <div key={spin.id} className="recent-spin-item">
                          <div className="recent-spin-result">
                            <div
                              className="recent-spin-color"
                              style={{ background: segment?.color || '#666' }}
                            ></div>
                            <span>{spin.resultLabel}</span>
                          </div>
                          <span className="recent-spin-time">
                            {analytics.formatRelativeTime(spin.timestamp)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {segmentModalOpen && (
        <SegmentModal
          segment={editingSegment}
          onSave={saveSegment}
          onClose={() => setSegmentModalOpen(false)}
        />
      )}

      {testResult && (
        <TestResultModal result={testResult} onClose={() => setTestResult(null)} />
      )}
    </div>
  );
}

function SegmentModal({ segment, onSave, onClose }) {
  const [label, setLabel] = useState(segment?.label || '');
  const [color, setColor] = useState(segment?.color || '#FF6384');
  const [weight, setWeight] = useState(segment?.weight || 1);
  const [link, setLink] = useState(segment?.link || '');

  function handleSave() {
    if (!label.trim()) return;
    onSave({ label, color, weight, link: link.trim() || null });
  }

  return (
    <div className="modal">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="modal-content">
        <h2>{segment ? 'Edit Segment' : 'Add Segment'}</h2>

        <div className="form-group">
          <label>Label</label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="e.g., Pizza"
            maxLength="50"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>Color</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} />
        </div>

        <div className="form-group">
          <label>Weight (1-100)</label>
          <input
            type="number"
            min="1"
            max="100"
            value={weight}
            onChange={e => setWeight(parseInt(e.target.value))}
          />
          <small>Higher weight = more likely to land on</small>
        </div>

        <div className="form-group">
          <label>Link (optional)</label>
          <input
            type="url"
            value={link}
            onChange={e => setLink(e.target.value)}
            placeholder="https://example.com"
          />
          <small>Button link shown when this segment wins</small>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary" disabled={!label.trim()}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function TestResultModal({ result, onClose }) {
  return (
    <div className="modal">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="modal-content result-modal-content">
        <h2>Test Result:</h2>
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
          Close
        </button>
      </div>
    </div>
  );
}
