import React, { useState } from 'react';
import axios from 'axios';
import { Plus, X } from 'lucide-react';
import { Prompt, Tournament } from '../App';

interface CreateTournamentProps {
  onTournamentCreated: (tournament: Tournament) => void;
}

const CreateTournament: React.FC<CreateTournamentProps> = ({ onTournamentCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    question: ''
  });
  const [prompts, setPrompts] = useState<Prompt[]>([
    { id: '', name: '', content: '', description: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.question || prompts.some(p => !p.name || !p.content)) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await axios.post('http://localhost:8000/tournaments', {
        name: formData.name,
        description: formData.description,
        question: formData.question,
        prompts: prompts.map(p => ({
          name: p.name,
          content: p.content,
          description: p.description || undefined
        }))
      });

      const newTournament = response.data.tournament;
      onTournamentCreated(newTournament);

      // Reset form
      setFormData({ name: '', description: '', question: '' });
      setPrompts([{ id: '', name: '', content: '', description: '' }]);
      setIsOpen(false);
    } catch (error) {
      console.error('Error creating tournament:', error);
      setError('Failed to create tournament. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addPrompt = () => {
    setPrompts([...prompts, { id: '', name: '', content: '', description: '' }]);
  };

  const removePrompt = (index: number) => {
    if (prompts.length > 1) {
      setPrompts(prompts.filter((_, i) => i !== index));
    }
  };

  const updatePrompt = (index: number, field: keyof Prompt, value: string) => {
    const newPrompts = [...prompts];
    newPrompts[index] = { ...newPrompts[index], [field]: value };
    setPrompts(newPrompts);
  };

  if (!isOpen) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <button className="btn" onClick={() => setIsOpen(true)}>
          <Plus size={20} style={{ marginRight: '8px' }} />
          Create New Tournament
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Create New Tournament</h2>
        <button
          className="btn-secondary"
          onClick={() => setIsOpen(false)}
          style={{ padding: '8px 12px' }}
        >
          <X size={16} />
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Tournament Name *</label>
          <input
            type="text"
            id="name"
            className="form-control"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Best Code Review Prompt"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            className="form-control textarea"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe what this tournament is about..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="question">Question/Input *</label>
          <textarea
            id="question"
            className="form-control textarea"
            value={formData.question}
            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
            placeholder="The question or input that will be used to test all prompts..."
          />
        </div>

        <div className="form-group">
          <label>Prompts *</label>
          {prompts.map((prompt, index) => (
            <div key={index} style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e9ecef', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4>Prompt {index + 1}</h4>
                {prompts.length > 1 && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => removePrompt(index)}
                    style={{ padding: '4px 8px' }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={prompt.name}
                  onChange={(e) => updatePrompt(index, 'name', e.target.value)}
                  placeholder="e.g., Concise and Clear"
                />
              </div>

              <div className="form-group">
                <label>Content *</label>
                <textarea
                  className="form-control textarea"
                  value={prompt.content}
                  onChange={(e) => updatePrompt(index, 'content', e.target.value)}
                  placeholder="Enter your prompt here..."
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  className="form-control"
                  value={prompt.description || ''}
                  onChange={(e) => updatePrompt(index, 'description', e.target.value)}
                  placeholder="Optional description of this prompt's approach..."
                />
              </div>
            </div>
          ))}

          <button type="button" className="btn-secondary" onClick={addPrompt}>
            <Plus size={16} style={{ marginRight: '8px' }} />
            Add Another Prompt
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={() => setIsOpen(false)}>
            Cancel
          </button>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Creating...' : 'Create Tournament'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTournament;
