import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Header from './components/Header';
import CreateTournament from './components/CreateTournament';
import TournamentList from './components/TournamentList';
import TournamentView from './components/TournamentView';

// Types
export interface Prompt {
  id: string;
  name: string;
  content: string;
  description?: string;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  question: string;
  prompt_ids: string[];
  created_at: string;
  status: string;
}

export interface TournamentResult {
  id: string;
  tournament_id: string;
  prompt_id: string;
  response: string;
  score?: number;
  feedback?: string;
  created_at: string;
}

// API base URL
const API_BASE = 'http://localhost:8000';

function App() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/tournaments`);
      setTournaments(response.data);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTournamentCreated = (newTournament: Tournament) => {
    setTournaments(prev => [...prev, newTournament]);
    setSelectedTournament(newTournament);
  };

  const handleBackToList = () => {
    setSelectedTournament(null);
  };

  const handleTournamentSelect = (tournament: Tournament) => {
    setSelectedTournament(tournament);
  };

  const handleTournamentDeleted = () => {
    setSelectedTournament(null);
    fetchTournaments(); // Refresh the tournament list
  };

  return (
    <div className="App">
      <Header />
      <div className="container">
        {selectedTournament ? (
          <TournamentView
            tournament={selectedTournament}
            onBack={handleBackToList}
            onTournamentUpdated={fetchTournaments}
            onTournamentDeleted={handleTournamentDeleted}
          />
        ) : (
          <>
            <CreateTournament onTournamentCreated={handleTournamentCreated} />
            <TournamentList
              tournaments={tournaments}
              loading={loading}
              onTournamentSelect={handleTournamentSelect}
              onRefresh={fetchTournaments}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
