import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Trophy, MessageSquare, Trash2, Calendar, Users, Plus } from 'lucide-react';
import { Tournament, Prompt, TournamentResult } from '../App';
import PromptComparison from './PromptComparison';
import Leaderboard from './Leaderboard';

interface TournamentViewProps {
  tournament: Tournament;
  onBack: () => void;
  onTournamentUpdated: () => void;
  onTournamentDeleted: () => void;
}

const TournamentView: React.FC<TournamentViewProps> = ({
  tournament,
  onBack,
  onTournamentUpdated,
  onTournamentDeleted
}) => {
  const [activeTab, setActiveTab] = useState<'comparison' | 'leaderboard'>('comparison');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAddPrompt, setShowAddPrompt] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ name: '', content: '' });
  const [addingPrompt, setAddingPrompt] = useState(false);

  useEffect(() => {
    fetchTournamentData();
  }, [tournament.id]);

  const fetchTournamentData = async () => {
    try {
      setLoading(true);
      setError('');

      const [promptsResponse, resultsResponse] = await Promise.all([
        axios.get(`http://localhost:8000/tournaments/${tournament.id}/prompts`),
        axios.get(`http://localhost:8000/tournaments/${tournament.id}/results`)
      ]);

      setPrompts(promptsResponse.data);
      setResults(resultsResponse.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch tournament data');
    } finally {
      setLoading(false);
    }
  };

  const handleResultSubmitted = () => {
    fetchTournamentData();
    onTournamentUpdated();
  };

  const handleDeleteTournament = async () => {
    try {
      setDeleting(true);
      await axios.delete(`http://localhost:8000/tournaments/${tournament.id}`);
      setShowDeleteConfirm(false);
      onTournamentDeleted();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete tournament');
      setDeleting(false);
    }
  };

  const handleAddPrompt = async () => {
    if (!newPrompt.name.trim() || !newPrompt.content.trim()) {
      setError('Please provide both a name and content for the prompt');
      return;
    }

    try {
      setAddingPrompt(true);
      setError('');

      await axios.post(`http://localhost:8000/tournaments/${tournament.id}/prompts`, {
        name: newPrompt.name.trim(),
        content: newPrompt.content.trim()
      });

      // Reset form and refresh data
      setNewPrompt({ name: '', content: '' });
      setShowAddPrompt(false);
      fetchTournamentData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add prompt');
    } finally {
      setAddingPrompt(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="loading">Loading tournament...</div>;
  }

  return (
    <div className="tournament-view-container">
      <div className="container">
        <div style={{ marginBottom: '20px' }}>
          <button
            className="btn-secondary"
            onClick={onBack}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
            }}
          >
            <ArrowLeft size={16} />
            Back to Tournaments
          </button>
        </div>

        <div className="tournament-info">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h2>{tournament.name}</h2>
              {tournament.description && <p>{tournament.description}</p>}
            </div>
            <button
              className="btn-secondary"
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: '1px solid #dc3545',
                borderRadius: '20px',
                padding: '6px 16px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(220, 53, 69, 0.3)',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(220, 53, 69, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(220, 53, 69, 0.3)';
              }}
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>

          <div className="question-box">
            <strong>Question:</strong>
            <p>{tournament.question}</p>
          </div>
          <div className="meta-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={16} />
              Created: {formatDate(tournament.created_at)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} />
              {prompts.length} prompts
            </div>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              maxWidth: '400px',
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#dc3545' }}>Delete Tournament?</h3>
              <p style={{ margin: '0 0 24px 0', color: '#6c757d', lineHeight: '1.5' }}>
                This will permanently delete <strong>"{tournament.name}"</strong> and all associated prompts and results. This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  className="btn-secondary confirm-dialog-btn"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className="btn confirm-dialog-btn"
                  onClick={handleDeleteTournament}
                  disabled={deleting}
                  style={{
                    backgroundColor: '#dc3545',
                    borderColor: '#dc3545'
                  }}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="tab-container" style={{
            display: 'flex',
            borderBottom: '2px solid #e9ecef',
            marginBottom: '20px'
          }}>
            <button
              className={`tab-button ${activeTab === 'comparison' ? 'active' : ''}`}
              onClick={() => setActiveTab('comparison')}
              style={{
                border: 'none',
                borderRadius: '8px',
                backgroundColor: activeTab === 'comparison' ? 'white' : 'transparent',
                color: activeTab === 'comparison' ? '#667eea' : '#6c757d',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: activeTab === 'comparison' ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'comparison' ? '0 2px 8px rgba(102, 126, 234, 0.15)' : 'none',
                margin: '4px',
                minWidth: '140px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'comparison') {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.7)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'comparison') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <MessageSquare size={16} />
              Compare Prompts
              {activeTab === 'comparison' && (
                <div style={{
                  position: 'absolute',
                  bottom: '-4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '20px',
                  height: '3px',
                  backgroundColor: '#667eea',
                  borderRadius: '2px'
                }} />
              )}
            </button>
            <button
              className={`tab-button ${activeTab === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('leaderboard')}
              style={{
                border: 'none',
                borderRadius: '8px',
                backgroundColor: activeTab === 'leaderboard' ? 'white' : 'transparent',
                color: activeTab === 'leaderboard' ? '#667eea' : '#6c757d',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: activeTab === 'leaderboard' ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'leaderboard' ? '0 2px 8px rgba(102, 126, 234, 0.15)' : 'none',
                margin: '4px',
                minWidth: '140px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'leaderboard') {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.7)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'leaderboard') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <Trophy size={16} />
              Leaderboard
              {activeTab === 'leaderboard' && (
                <div style={{
                  position: 'absolute',
                  bottom: '-4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '20px',
                  height: '3px',
                  backgroundColor: '#667eea',
                  borderRadius: '2px'
                }} />
              )}
            </button>
          </div>

          {activeTab === 'comparison' ? (
            <PromptComparison
              tournament={tournament}
              prompts={prompts}
              results={results}
              onResultSubmitted={handleResultSubmitted}
            />
          ) : (
            <Leaderboard
              tournamentId={tournament.id}
              prompts={prompts}
              results={results}
              onRefresh={fetchTournamentData}
            />
          )}
        </div>
      </div>

      {/* Add New Prompt Section */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#495057' }}>Add New Prompt</h3>
          <button
            className="btn-secondary"
            onClick={() => setShowAddPrompt(!showAddPrompt)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              fontSize: '14px'
            }}
          >
            <Plus size={16} />
            {showAddPrompt ? 'Cancel' : 'Add Prompt'}
          </button>
        </div>

        {showAddPrompt && (
          <div className="add-prompt-form">
            <div className="form-group">
              <label htmlFor="prompt-name">Prompt Name:</label>
              <input
                id="prompt-name"
                type="text"
                value={newPrompt.name}
                onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
                placeholder="e.g., Alternative Approach"
                style={{ marginBottom: '12px' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="prompt-content">Prompt Content:</label>
              <textarea
                id="prompt-content"
                value={newPrompt.content}
                onChange={(e) => setNewPrompt({ ...newPrompt, content: e.target.value })}
                placeholder="Enter your new prompt here..."
                rows={3}
                style={{ marginBottom: '16px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                className="btn"
                onClick={handleAddPrompt}
                disabled={addingPrompt || !newPrompt.name.trim() || !newPrompt.content.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  fontSize: '14px'
                }}
              >
                {addingPrompt ? (
                  <>
                    <div className="spin" style={{ width: '16px', height: '16px', border: '2px solid transparent', borderTop: '2px solid currentColor', borderRadius: '50%' }} />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Add Prompt
                  </>
                )}
              </button>

              <span style={{ fontSize: '12px', color: '#6c757d' }}>
                After adding, you can auto-generate responses and see AI evaluation
              </span>
            </div>
          </div>
        )}
      </div>

      {error && <div className="error">{error}</div>}
    </div>
  );
};

export default TournamentView;
