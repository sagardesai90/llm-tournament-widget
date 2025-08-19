import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Star, Trophy, RefreshCw, Zap, Bot, Clock } from 'lucide-react';
import { Prompt } from '../App';

interface LeaderboardProps {
  tournamentId: string;
  prompts: Prompt[];
  results: any[];
  onRefresh: () => void;
}

interface LeaderboardItem {
  result_id: string;
  prompt_id: string;
  prompt_name: string;
  response: string;
  score?: number;
  feedback?: string;
  created_at: string;
  ai_evaluated?: boolean;
  evaluation_timestamp?: string;
  evaluation_metrics?: {
    relevance_score: number;
    clarity_score: number;
    strengths: string[];
    areas_for_improvement: string[];
  };
}

const Leaderboard: React.FC<LeaderboardProps> = ({
  tournamentId,
  prompts,
  results,
  onRefresh
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState<string | null>(null);
  const [autoScoring, setAutoScoring] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchLeaderboard();
  }, [results]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:8000/tournaments/${tournamentId}/leaderboard`);
      setLeaderboard(response.data);
    } catch (error: any) {
      console.error('Error fetching leaderboard:', error);
      setError('Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreSubmit = async (resultId: string, score: number, feedback: string) => {
    try {
      setScoring(resultId);
      setError('');

      await axios.post(`http://localhost:8000/tournaments/${tournamentId}/score`, {
        tournament_id: tournamentId,
        prompt_id: leaderboard.find(item => item.result_id === resultId)?.prompt_id,
        score: score,
        feedback: feedback
      });

      setSuccess('Score updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to update score');
    } finally {
      setScoring(null);
    }
  };

  const handleAutoScore = async (resultId: string, promptId: string) => {
    try {
      setScoring(resultId);
      setError('');

      const response = await axios.post(`http://localhost:8000/tournaments/${tournamentId}/auto-score`, {
        prompt_id: promptId,
        result_id: resultId
      });

      setSuccess(`AI scored response: ${response.data.score}/10`);
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to auto-score response');
    } finally {
      setScoring(null);
    }
  };

  const handleAutoScoreAll = async () => {
    try {
      setAutoScoring(true);
      setError('');

      const response = await axios.post(`http://localhost:8000/tournaments/${tournamentId}/auto-score-all`);

      setSuccess(`AI scoring completed: ${response.data.scored_count} responses scored`);
      setTimeout(() => setSuccess(''), 5000);
      onRefresh();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to auto-score all responses');
    } finally {
      setAutoScoring(false);
    }
  };

  const getResultById = (resultId: string) => {
    return results.find(r => r.id === resultId);
  };

  const getPromptById = (promptId: string) => {
    return prompts.find(p => p.id === promptId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number | undefined) => {
    if (!score) return '#6c757d';
    if (score >= 9) return '#28a745';
    if (score >= 7) return '#17a2b8';
    if (score >= 5) return '#ffc107';
    return '#dc3545';
  };

  const getScoreEmoji = (score: number | undefined) => {
    if (!score) return '❓';
    if (score >= 9) return '🏆';
    if (score >= 7) return '🥇';
    if (score >= 5) return '🥈';
    return '🥉';
  };

  if (loading) {
    return <div className="loading">Loading leaderboard...</div>;
  }

  const scoredResults = leaderboard.filter(item => item.score !== null && item.score !== undefined);
  const unscoredResults = results.filter(result =>
    !scoredResults.some(scored => scored.prompt_id === result.prompt_id)
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Tournament Leaderboard</h3>
        <button className="btn-secondary" onClick={fetchLeaderboard}>
          <RefreshCw size={16} style={{ marginRight: '8px' }} />
          Refresh
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {scoredResults.length > 0 && (
        <div className="leaderboard-section">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Trophy size={20} color="#FFD700" />
            Scored Responses
          </h3>
          <div className="leaderboard-grid">
            {scoredResults.map((item, index) => (
              <div key={item.result_id} className="leaderboard-item" style={{ position: 'relative' }}>
                <div className="rank-badge" style={{ backgroundColor: getScoreColor(item.score) }}>
                  {getScoreEmoji(item.score)} {item.score}/10
                </div>
                <div className="item-content">
                  <h4>{item.prompt_name}</h4>
                  <p className="response-text">{item.response}</p>
                  <div className="feedback-section">
                    <strong>Feedback:</strong>
                    <p>{item.feedback}</p>
                  </div>

                  {/* Enhanced Evaluation Metrics */}
                  {item.evaluation_metrics && (
                    <div className="evaluation-metrics">
                      <div className="metrics-grid">
                        <div className="metric-item">
                          <span className="metric-label">Overall Score:</span>
                          <span className="metric-value score-{Math.floor(item.score || 0)}">
                            {item.score}/10
                          </span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">Relevance:</span>
                          <span className="metric-value">
                            {item.evaluation_metrics.relevance_score}/10
                          </span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">Clarity:</span>
                          <span className="metric-value">
                            {item.evaluation_metrics.clarity_score}/10
                          </span>
                        </div>
                      </div>

                      {item.evaluation_metrics.strengths && item.evaluation_metrics.strengths.length > 0 && (
                        <div className="strengths-section">
                          <strong>Strengths:</strong>
                          <ul>
                            {item.evaluation_metrics.strengths.map((strength: string, idx: number) => (
                              <li key={idx}>{strength}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {item.evaluation_metrics.areas_for_improvement && item.evaluation_metrics.areas_for_improvement.length > 0 && (
                        <div className="improvement-section">
                          <strong>Areas for Improvement:</strong>
                          <ul>
                            {item.evaluation_metrics.areas_for_improvement.map((area: string, idx: number) => (
                              <li key={idx}>{area}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="meta-info">
                    <span>Rank: #{index + 1}</span>
                    <span>Created: {formatDate(item.created_at)}</span>
                    {item.ai_evaluated && (
                      <span style={{ color: '#667eea', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Bot size={14} />
                        AI Evaluated
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {unscoredResults.length > 0 && (
        <div className="leaderboard-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} color="#6c757d" />
              Unscored Responses
            </h3>
            <button
              className="btn"
              onClick={handleAutoScoreAll}
              disabled={autoScoring}
              style={{
                backgroundColor: '#667eea',
                borderColor: '#667eea',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                fontSize: '14px'
              }}
            >
              {autoScoring ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  AI Scoring...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  AI Score All
                </>
              )}
            </button>
          </div>
          <div className="leaderboard-grid">
            {unscoredResults.map((item) => {
              const result = getResultById(item.result_id);
              const prompt = getPromptById(item.prompt_id);

              return (
                <div key={item.result_id} className="leaderboard-item unscored" style={{ position: 'relative' }}>
                  <div className="rank-badge unscored">
                    <Clock size={16} />
                    Unscored
                  </div>
                  <div className="item-content">
                    <h4>{item.prompt_name}</h4>
                    <p className="response-text">{item.response}</p>
                    <div className="meta-info">
                      <span>Created: {formatDate(item.created_at)}</span>
                    </div>
                    <div className="action-buttons" style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                      <button
                        className="btn-secondary"
                        onClick={() => handleAutoScore(item.result_id, item.prompt_id)}
                        disabled={scoring === item.result_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          fontSize: '13px'
                        }}
                      >
                        {scoring === item.result_id ? (
                          <>
                            <RefreshCw size={14} className="spin" />
                            Scoring...
                          </>
                        ) : (
                          <>
                            <Bot size={14} />
                            AI Score
                          </>
                        )}
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          // TODO: Implement manual scoring modal
                          alert('Manual scoring coming soon!');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          fontSize: '13px'
                        }}
                      >
                        <Star size={14} />
                        Manual Score
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {leaderboard.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
          <Trophy size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <h3>No responses yet</h3>
          <p>Generate some responses to see them ranked here!</p>
        </div>
      )}
    </div>
  );
};

interface ScoreFormProps {
  promptId: string;
  onSubmit: (promptId: string, score: number, feedback?: string) => void;
}

const ScoreForm: React.FC<ScoreFormProps> = ({ promptId, onSubmit }) => {
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const scoreNum = parseFloat(score);
    if (scoreNum >= 1 && scoreNum <= 10) {
      onSubmit(promptId, scoreNum, feedback.trim() || undefined);
      setScore('');
      setFeedback('');
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button className="btn" onClick={() => setIsOpen(true)}>
        <Star size={16} style={{ marginRight: '8px' }} />
        Score Response
      </button>
    );
  }

  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef',
      minWidth: '250px'
    }}>
      <h6 style={{ margin: '0 0 12px 0' }}>Score this response</h6>
      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{ marginBottom: '12px' }}>
          <label htmlFor={`score-${promptId}`} style={{ fontSize: '14px' }}>
            Score (1-10) *
          </label>
          <input
            type="number"
            id={`score-${promptId}`}
            className="form-control"
            min="1"
            max="10"
            step="0.1"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            required
            style={{ fontSize: '14px', padding: '8px' }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '12px' }}>
          <label htmlFor={`feedback-${promptId}`} style={{ fontSize: '14px' }}>
            Feedback (optional)
          </label>
          <textarea
            id={`feedback-${promptId}`}
            className="form-control"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Why this score?"
            rows={2}
            style={{ fontSize: '14px', padding: '8px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setIsOpen(false)}
            style={{ padding: '6px 12px', fontSize: '14px' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn"
            disabled={!score || parseFloat(score) < 1 || parseFloat(score) > 10}
            style={{ padding: '6px 12px', fontSize: '14px' }}
          >
            Submit Score
          </button>
        </div>
      </form>
    </div>
  );
};

export default Leaderboard;
