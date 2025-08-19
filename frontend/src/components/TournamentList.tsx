import React, { useState } from 'react';
import { ArrowRight, RefreshCw, Users, Calendar, Trash2 } from 'lucide-react';
import { Tournament } from '../App';
import axios from 'axios';

interface TournamentListProps {
  tournaments: Tournament[];
  loading: boolean;
  onTournamentSelect: (tournament: Tournament) => void;
  onRefresh: () => void;
}

const TournamentList: React.FC<TournamentListProps> = ({
  tournaments,
  loading,
  onTournamentSelect,
  onRefresh
}) => {
  const [deletingTournament, setDeletingTournament] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const handleDeleteTournament = async (tournamentId: string, tournamentName: string) => {
    try {
      setDeletingTournament(tournamentId);
      await axios.delete(`http://localhost:8000/tournaments/${tournamentId}`);
      setShowDeleteConfirm(null);
      onRefresh(); // Refresh the tournament list
    } catch (error: any) {
      console.error('Error deleting tournament:', error);
      alert(`Failed to delete tournament: ${error.response?.data?.detail || 'Unknown error'}`);
    } finally {
      setDeletingTournament(null);
    }
  };

  const handleCardClick = (tournament: Tournament, event: React.MouseEvent) => {
    // Don't open tournament if clicking on delete button
    if ((event.target as HTMLElement).closest('.delete-btn')) {
      return;
    }
    onTournamentSelect(tournament);
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <div className="loading">Loading tournaments...</div>
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <h3>No tournaments yet</h3>
        <p style={{ color: '#6c757d', marginBottom: '20px' }}>
          Create your first tournament to get started!
        </p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Your Tournaments</h2>
        <button className="btn-secondary" onClick={onRefresh}>
          <RefreshCw size={16} style={{ marginRight: '8px' }} />
          Refresh
        </button>
      </div>

      <div className="grid grid-2">
        {tournaments.map((tournament) => (
          <div
            key={tournament.id}
            className="prompt-card"
            style={{ cursor: 'pointer' }}
            onClick={(event) => handleCardClick(tournament, event)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#495057' }}>{tournament.name}</h3>
              <ArrowRight size={20} color="#667eea" />
            </div>

            {tournament.description && (
              <p style={{ color: '#6c757d', marginBottom: '12px', lineHeight: '1.5' }}>
                {tournament.description}
              </p>
            )}

            <div style={{ marginBottom: '12px' }}>
              <strong>Question:</strong>
              <p style={{
                color: '#495057',
                marginTop: '4px',
                fontSize: '14px',
                lineHeight: '1.4',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {tournament.question}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: '#6c757d' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users size={16} />
                {tournament.prompt_ids.length} prompts
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={16} />
                {formatDate(tournament.created_at)}
              </div>
            </div>

            <div style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginTop: '12px',
              ...(tournament.status === 'active'
                ? { backgroundColor: '#d4edda', color: '#155724' }
                : { backgroundColor: '#f8d7da', color: '#721c24' }
              )
            }}>
              {tournament.status}
            </div>

            {/* Delete Button */}
            <button
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(tournament.id);
              }}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                padding: '4px 8px',
                cursor: 'pointer',
                opacity: 0.7,
                transition: 'all 0.2s ease',
                fontSize: '11px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                minWidth: 'auto',
                boxShadow: '0 2px 4px rgba(220, 53, 69, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(220, 53, 69, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.7';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(220, 53, 69, 0.3)';
              }}
              title="Delete tournament"
            >
              <Trash2 size={12} />
              <span>Delete</span>
            </button>
          </div>
        ))}
      </div>

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
              This will permanently delete <strong>"{tournaments.find(t => t.id === showDeleteConfirm)?.name}"</strong> and all associated prompts and results. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="btn-secondary confirm-dialog-btn"
                onClick={() => setShowDeleteConfirm(null)}
                disabled={deletingTournament === showDeleteConfirm}
              >
                Cancel
              </button>
              <button
                className="btn confirm-dialog-btn"
                onClick={() => handleDeleteTournament(showDeleteConfirm, tournaments.find(t => t.id === showDeleteConfirm)?.name || '')}
                disabled={deletingTournament === showDeleteConfirm}
                style={{
                  backgroundColor: '#dc3545',
                  borderColor: '#dc3545'
                }}
              >
                {deletingTournament === showDeleteConfirm ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentList;
