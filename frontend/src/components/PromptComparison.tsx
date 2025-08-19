import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Send, Star, MessageSquare, Zap, Loader, ChevronDown, ChevronUp, Bot, Trash2 } from 'lucide-react';
import { Tournament, Prompt, TournamentResult } from '../App';

interface PromptComparisonProps {
  tournament: Tournament;
  prompts: Prompt[];
  results: TournamentResult[];
  onResultSubmitted: () => void;
}

interface StreamingResponse {
  token?: string;
  full_response?: string;
  complete?: boolean;
  result_id?: string;
  prompt_id?: string;
  status?: string;
  error?: string;
  message?: string;
  summary?: {
    total: number;
    generated: number;
    skipped: number;
    errors: number;
  };
}

const PromptComparison: React.FC<PromptComparisonProps> = ({
  tournament,
  prompts,
  results,
  onResultSubmitted
}) => {
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [autoGenerating, setAutoGenerating] = useState<string | null>(null); // prompt ID being auto-generated
  const [bulkGenerating, setBulkGenerating] = useState(false); // for bulk generation
  const [expandedResponses, setExpandedResponses] = useState<Set<string>>(new Set()); // track which responses are expanded
  const [autoScoreManual, setAutoScoreManual] = useState(true); // automatically score manual responses

  // Streaming state
  const [streamingResponses, setStreamingResponses] = useState<Map<string, string>>(new Map()); // promptId -> current streaming text
  const [streamingStatus, setStreamingStatus] = useState<Map<string, string>>(new Map()); // promptId -> streaming status

  const eventSourceRef = useRef<EventSource | null>(null);

  const handlePromptSelect = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setResponse('');
    setError('');
    setSuccess('');
  };

  const handleDeletePrompt = async (promptId: string, promptName: string) => {
    if (!window.confirm(`Are you sure you want to delete the prompt "${promptName}"? This will also delete all associated responses and cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await axios.delete(`http://localhost:8000/tournaments/${tournament.id}/prompts/${promptId}`);

      setSuccess(`Prompt "${promptName}" deleted successfully!`);
      setTimeout(() => setSuccess(''), 3000);

      // Refresh the data to show the updated prompt list
      onResultSubmitted();
    } catch (error: any) {
      console.error('Error deleting prompt:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to delete prompt. Please try again.';
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const toggleResponseExpansion = (promptId: string) => {
    const newExpanded = new Set(expandedResponses);
    if (newExpanded.has(promptId)) {
      newExpanded.delete(promptId);
    } else {
      newExpanded.add(promptId);
    }
    setExpandedResponses(newExpanded);
  };

  const handleStreamingResponse = (data: StreamingResponse) => {
    if (data.prompt_id && data.token) {
      // Individual token streaming
      setStreamingResponses(prev => {
        const newMap = new Map(prev);
        const currentText = newMap.get(data.prompt_id!) || '';
        newMap.set(data.prompt_id!, currentText + data.token);
        return newMap;
      });
    } else if (data.prompt_id && data.status === 'starting') {
      // Prompt starting
      setStreamingResponses(prev => {
        const newMap = new Map(prev);
        newMap.set(data.prompt_id!, '');
        return newMap;
      });
      setStreamingStatus(prev => {
        const newMap = new Map(prev);
        newMap.set(data.prompt_id!, 'generating');
        return newMap;
      });
    } else if (data.prompt_id && data.status === 'complete') {
      // Prompt complete
      setStreamingStatus(prev => {
        const newMap = new Map(prev);
        newMap.set(data.prompt_id!, 'complete');
        return newMap;
      });

      // Refresh results to show the newly generated response
      onResultSubmitted();

      // Clear streaming state after a delay to show completion
      setTimeout(() => {
        setStreamingResponses(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.prompt_id!);
          return newMap;
        });
        setStreamingStatus(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.prompt_id!);
          return newMap;
        });
      }, 2000); // Increased delay to 2 seconds so user can see completion
    } else if (data.prompt_id && data.status === 'partial_complete') {
      // Prompt partially complete (response was cut off due to error)
      setStreamingStatus(prev => {
        const newMap = new Map(prev);
        newMap.set(data.prompt_id!, 'partial_complete');
        return newMap;
      });

      // Refresh results to show the partial response
      onResultSubmitted();

      // Clear streaming state after a delay
      setTimeout(() => {
        setStreamingResponses(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.prompt_id!);
          return newMap;
        });
        setStreamingStatus(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.prompt_id!);
          return newMap;
        });
      }, 3000); // Longer delay for partial completion
    } else if (data.prompt_id && data.status === 'skipped') {
      // Prompt skipped - show existing response in streaming style
      setStreamingStatus(prev => {
        const newMap = new Map(prev);
        newMap.set(data.prompt_id!, 'skipped');
        return newMap;
      });

      // For skipped prompts, we need to show the existing response
      // We'll get this from the results when we refresh
      onResultSubmitted();

      // Clear streaming state after a delay to show the skipped status
      setTimeout(() => {
        setStreamingResponses(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.prompt_id!);
          return newMap;
        });
        setStreamingStatus(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.prompt_id!);
          return newMap;
        });
      }, 3000); // Show skipped status for 3 seconds
    } else if (data.prompt_id && data.status === 'error') {
      // Prompt error
      setStreamingStatus(prev => {
        const newMap = new Map(prev);
        newMap.set(data.prompt_id!, 'error');
        return newMap;
      });
    } else if (data.complete && data.summary) {
      // Bulk generation complete
      setSuccess(`Bulk generation complete! Generated ${data.summary.generated} responses, skipped ${data.summary.skipped} existing ones.`);

      // Refresh results to show all newly generated responses
      onResultSubmitted();

      // Clear streaming state after completion
      setTimeout(() => {
        setStreamingResponses(new Map());
        setStreamingStatus(new Map());
      }, 1000);

      setTimeout(() => setSuccess(''), 5000);
    }
  };

  const handleBulkAutoGenerate = async () => {
    try {
      setBulkGenerating(true);
      setError('');
      setSuccess('');

      // Clear previous streaming state
      setStreamingResponses(new Map());
      setStreamingStatus(new Map());

      // Create EventSource for streaming
      const eventSource = new EventSource(`http://localhost:8000/tournaments/${tournament.id}/auto-generate-all?tournament_id=${tournament.id}&model=gpt-4o-mini`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data: StreamingResponse = JSON.parse(event.data);
          handleStreamingResponse(data);
        } catch (e) {
          console.error('Error parsing streaming data:', e);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        setError('Connection error during streaming. Please try again.');
        eventSource.close();
        setBulkGenerating(false);

        // Clear streaming state on error
        setStreamingResponses(new Map());
        setStreamingStatus(new Map());
      };

      eventSource.onopen = () => {
        console.log('EventSource connection opened');
      };

    } catch (error: any) {
      console.error('Error starting bulk auto-generation:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to start bulk generation. Please try again.';
      setError(errorMessage);
      setBulkGenerating(false);
    }
  };

  const handleAutoGenerate = async (promptId: string) => {
    try {
      setAutoGenerating(promptId);
      setError('');
      setSuccess('');

      // Clear previous streaming state for this prompt
      setStreamingResponses(prev => {
        const newMap = new Map(prev);
        newMap.set(promptId, '');
        return newMap;
      });
      setStreamingStatus(prev => {
        const newMap = new Map(prev);
        newMap.set(promptId, 'generating');
        return newMap;
      });

      // Create EventSource for streaming
      const eventSource = new EventSource(`http://localhost:8000/tournaments/${tournament.id}/auto-generate?tournament_id=${tournament.id}&prompt_id=${promptId}&model=gpt-4o-mini`);

      eventSource.onmessage = (event) => {
        try {
          const data: StreamingResponse = JSON.parse(event.data);
          handleStreamingResponse(data);

          if (data.complete) {
            setSuccess('Response auto-generated successfully!');
            onResultSubmitted();
            setTimeout(() => setSuccess(''), 3000);
            eventSource.close();
            setAutoGenerating(null);
          }
        } catch (e) {
          console.error('Error parsing streaming data:', e);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        setError('Connection error during streaming. Please try again.');
        eventSource.close();
        setAutoGenerating(null);

        // Clear streaming state for this prompt on error
        setStreamingResponses(prev => {
          const newMap = new Map(prev);
          newMap.delete(promptId);
          return newMap;
        });
        setStreamingStatus(prev => {
          const newMap = new Map(prev);
          newMap.set(promptId, 'error');
          return newMap;
        });
      };

    } catch (error: any) {
      console.error('Error auto-generating response:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to auto-generate response. Please try again.';
      setError(errorMessage);
      setAutoGenerating(null);
    }
  };

  const handleSubmitResponse = async () => {
    if (!selectedPrompt || !response.trim()) {
      setError('Please select a prompt and provide a response');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const result: Partial<TournamentResult> = {
        tournament_id: tournament.id,
        prompt_id: selectedPrompt.id,
        response: response.trim()
      };

      const response_result = await axios.post(`http://localhost:8000/tournaments/${tournament.id}/results`, result);

      setSuccess('Response submitted successfully!');
      setResponse('');

      // If auto-scoring is enabled, automatically score the response
      if (autoScoreManual) {
        try {
          setSuccess('Response submitted! AI scoring in progress...');

          // Wait a moment for the result to be saved, then auto-score
          setTimeout(async () => {
            try {
              await axios.post(`http://localhost:8000/tournaments/${tournament.id}/auto-score`, {
                prompt_id: selectedPrompt.id,
                result_id: response_result.data.result_id
              });
              setSuccess('Response submitted and AI scored successfully!');
              setTimeout(() => setSuccess(''), 3000);
            } catch (scoringError: any) {
              console.error('AI scoring failed:', scoringError);
              setSuccess('Response submitted! AI scoring failed, but you can manually score it.');
              setTimeout(() => setSuccess(''), 5000);
            }
          }, 1000);
        } catch (scoringError: any) {
          console.error('AI scoring failed:', scoringError);
          setSuccess('Response submitted! AI scoring failed, but you can manually score it.');
          setTimeout(() => setSuccess(''), 5000);
        }
      } else {
        setSuccess('Response submitted successfully! You can now score it manually.');
        setTimeout(() => setSuccess(''), 3000);
      }

      onResultSubmitted();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to submit response');
    } finally {
      setLoading(false);
    }
  };

  const getPromptResult = (promptId: string) => {
    return results.find(r => r.prompt_id === promptId);
  };

  const renderResponsePreview = (result: TournamentResult, promptId: string) => {
    const isExpanded = expandedResponses.has(promptId);
    const responseText = result.response;
    const previewText = responseText.length > 150 ? responseText.substring(0, 150) + '...' : responseText;

    return (
      <div style={{
        padding: '12px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef',
        marginTop: '12px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <strong style={{ fontSize: '13px', color: '#495057' }}>
            <MessageSquare size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            AI Generated Response
          </strong>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleResponseExpansion(promptId);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6c757d',
              padding: '4px'
            }}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        <div style={{ fontSize: '13px', color: '#495057', lineHeight: '1.4' }}>
          {isExpanded ? responseText : previewText}
        </div>

        {responseText.length > 150 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleResponseExpansion(promptId);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#007bff',
              fontSize: '12px',
              padding: '4px 0',
              marginTop: '8px'
            }}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}

        {result.score && (
          <div style={{
            marginTop: '8px',
            padding: '6px 10px',
            backgroundColor: '#fff3cd',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#856404',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Star size={12} style={{ color: '#ffc107' }} />
            Score: {result.score}
          </div>
        )}
      </div>
    );
  };

  const renderStreamingResponse = (promptId: string) => {
    const streamingText = streamingResponses.get(promptId) || '';
    const status = streamingStatus.get(promptId);

    if (status === 'skipped') {
      // For skipped prompts, show the existing response in blue streaming style
      const existingResult = results.find(r => r.prompt_id === promptId);
      if (existingResult) {
        return (
          <div style={{
            padding: '12px',
            backgroundColor: '#e3f2fd',
            borderRadius: '8px',
            border: '1px solid #bbdefb',
            marginTop: '12px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <strong style={{ fontSize: '13px', color: '#1976d2' }}>
                ⏭️ Response already exists
              </strong>
              <span style={{ fontSize: '12px', color: '#1976d2' }}>
                {existingResult.response.length} chars
              </span>
            </div>

            <div style={{
              fontSize: '13px',
              color: '#1976d2',
              lineHeight: '1.4',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              minHeight: '20px'
            }}>
              {existingResult.response}
            </div>

            {/* Note: Message would be available in the streaming data but we're showing the existing response */}
            <div style={{
              fontSize: '11px',
              color: '#1976d2',
              fontStyle: 'italic',
              marginTop: '8px',
              textAlign: 'center'
            }}>
              This response was generated previously
            </div>
          </div>
        );
      }

      // Fallback if no existing result found
      return (
        <div style={{
          padding: '12px',
          backgroundColor: '#e9ecef',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          marginTop: '12px',
          textAlign: 'center',
          color: '#6c757d',
          fontSize: '13px'
        }}>
          ⏭️ Response already exists
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div style={{
          padding: '12px',
          backgroundColor: '#f8d7da',
          borderRadius: '8px',
          border: '1px solid #f5c6cb',
          marginTop: '12px',
          textAlign: 'center',
          color: '#721c24',
          fontSize: '13px'
        }}>
          ❌ Generation failed
        </div>
      );
    }

    if (status === 'partial_complete') {
      return (
        <div style={{
          padding: '12px',
          backgroundColor: '#fff3cd',
          borderRadius: '8px',
          border: '1px solid #ffeaa7',
          marginTop: '12px',
          textAlign: 'center',
          color: '#856404',
          fontSize: '13px'
        }}>
          ⚠️ Partial response saved (was cut off due to error)
        </div>
      );
    }

    if (status === 'generating' || streamingText) {
      return (
        <div style={{
          padding: '12px',
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          border: '1px solid #bbdefb',
          marginTop: '12px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <strong style={{ fontSize: '13px', color: '#1976d2' }}>
              <Loader size={14} className="spin" style={{ marginRight: '6px' }} />
              Generating Response...
            </strong>
            <span style={{ fontSize: '12px', color: '#1976d2' }}>
              {streamingText.length} chars
            </span>
          </div>

          <div style={{
            fontSize: '13px',
            color: '#1976d2',
            lineHeight: '1.4',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            minHeight: '20px'
          }}>
            {streamingText || 'Starting generation...'}
            <span style={{ animation: 'blink 1s infinite' }}>|</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div>
      <h3>Compare Prompts</h3>
      <p style={{ color: '#6c757d', marginBottom: '20px' }}>
        Select a prompt below and provide the LLM response to evaluate its performance, or use auto-generate to get AI responses instantly.
      </p>

      {/* Bulk Auto-Generate Button */}
      <div style={{ marginBottom: '20px' }}>
        <button
          className="btn"
          onClick={handleBulkAutoGenerate}
          disabled={bulkGenerating}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            fontSize: '14px'
          }}
        >
          {bulkGenerating ? (
            <>
              <Loader size={16} className="spin" />
              Streaming All Responses...
            </>
          ) : (
            <>
              <Zap size={16} />
              Auto-Generate All Responses
            </>
          )}
        </button>
        <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
          This will generate responses for all prompts using OpenAI with real-time streaming. Existing responses will be skipped.
        </p>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="grid grid-3">
        {prompts.map((prompt) => {
          const result = getPromptResult(prompt.id);
          const isSelected = selectedPrompt?.id === prompt.id;
          const isGenerating = autoGenerating === prompt.id;
          const isStreaming = streamingStatus.has(prompt.id);

          return (
            <div
              key={prompt.id}
              className={`prompt-card ${isSelected ? 'selected' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => handlePromptSelect(prompt)}
            >
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#495057' }}>{prompt.name}</h4>
                    {prompt.description && (
                      <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '8px' }}>
                        {prompt.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePrompt(prompt.id, prompt.name);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#dc3545',
                      padding: '4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    title="Delete prompt"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8d7da';
                      e.currentTarget.style.color = '#721c24';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#dc3545';
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong style={{ fontSize: '14px', color: '#495057' }}>Prompt:</strong>
                <p style={{
                  fontSize: '13px',
                  color: '#6c757d',
                  marginTop: '4px',
                  lineHeight: '1.4',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {prompt.content}
                </p>
              </div>

              {/* Show streaming response if active */}
              {isStreaming && renderStreamingResponse(prompt.id)}

              {/* Show AI generated response if available */}
              {result && !isStreaming && renderResponsePreview(result, prompt.id)}

              {/* Auto-generate button */}
              <div style={{ marginTop: '12px' }}>
                <button
                  className="btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAutoGenerate(prompt.id);
                  }}
                  disabled={isGenerating || isStreaming || !!result}
                  style={{
                    width: '100%',
                    fontSize: '12px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {isGenerating || isStreaming ? (
                    <>
                      <Loader size={14} className="spin" />
                      {isStreaming ? 'Streaming...' : 'Generating...'}
                    </>
                  ) : result ? (
                    <>
                      <MessageSquare size={14} />
                      Response Ready
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      Auto-Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedPrompt && (
        <div className="card" style={{ marginTop: '20px' }}>
          <h4>Submit Response for: {selectedPrompt.name}</h4>
          <p style={{ color: '#6c757d', marginBottom: '16px' }}>
            <strong>Prompt:</strong> {selectedPrompt.content}
          </p>

          <div className="form-group">
            <label htmlFor="response">LLM Response *</label>
            <textarea
              id="response"
              className="form-control textarea"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Enter the response generated by the LLM for this prompt..."
              rows={6}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <input
                type="checkbox"
                checked={autoScoreManual}
                onChange={(e) => setAutoScoreManual(e.target.checked)}
                style={{ margin: 0 }}
              />
              <span style={{ fontSize: '14px', color: '#495057' }}>
                Automatically score this response using AI
              </span>
            </label>
            <p style={{ fontSize: '12px', color: '#6c757d', margin: 0 }}>
              When enabled, your response will be automatically evaluated and scored (1-10) using AI
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              type="submit"
              className="btn"
              disabled={loading || !response.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                fontSize: '14px'
              }}
            >
              {loading ? (
                <>
                  <Loader size={16} className="spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Submit Response
                </>
              )}
            </button>

            {autoScoreManual && (
              <span style={{ fontSize: '12px', color: '#667eea', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Bot size={14} />
                Will be AI scored
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptComparison;
