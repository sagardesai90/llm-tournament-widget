import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import App from './App';

// Mock axios
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock components to isolate App component testing
jest.mock('./components/Header', () => {
    return function MockHeader() {
        return <div data-testid="header">Header</div>;
    };
});

jest.mock('./components/CreateTournament', () => {
    return function MockCreateTournament({ onTournamentCreated }: { onTournamentCreated: (tournament: any) => void }) {
        return (
            <div data-testid="create-tournament">
                <button onClick={() => onTournamentCreated({
                    id: 'test-tournament-123',
                    name: 'Test Tournament',
                    description: 'A test tournament',
                    question: 'What is 2+2?',
                    prompt_ids: ['prompt-1', 'prompt-2'],
                    created_at: '2024-01-01T00:00:00Z',
                    status: 'active'
                })}>
                    Create Test Tournament
                </button>
            </div>
        );
    };
});

jest.mock('./components/TournamentList', () => {
    return function MockTournamentList({ tournaments, onTournamentSelect }: {
        tournaments: any[],
        onTournamentSelect: (tournament: any) => void
    }) {
        return (
            <div data-testid="tournament-list">
                {tournaments.map(tournament => (
                    <div key={tournament.id} data-testid={`tournament-${tournament.id}`}>
                        <span>{tournament.name}</span>
                        <button onClick={() => onTournamentSelect(tournament)}>
                            Select
                        </button>
                    </div>
                ))}
            </div>
        );
    };
});

jest.mock('./components/TournamentView', () => {
    return function MockTournamentView({ tournament, onBack, onTournamentDeleted }: {
        tournament: any,
        onBack: () => void,
        onTournamentDeleted: () => void
    }) {
        return (
            <div data-testid="tournament-view">
                <h2>{tournament.name}</h2>
                <p>{tournament.description}</p>
                <button onClick={onBack}>Back to List</button>
                <button onClick={onTournamentDeleted}>Delete Tournament</button>
            </div>
        );
    };
});

describe('App Component', () => {
    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Mock successful API response for tournaments
        mockedAxios.get.mockResolvedValue({
            data: []
        });
    });

    test('renders header', () => {
        render(<App />);
        expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    test('renders create tournament form initially', () => {
        render(<App />);
        expect(screen.getByTestId('create-tournament')).toBeInTheDocument();
    });

    test('renders tournament list initially', () => {
        render(<App />);
        expect(screen.getByTestId('tournament-list')).toBeInTheDocument();
    });

    test('fetches tournaments on mount', async () => {
        render(<App />);

        await waitFor(() => {
            expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/tournaments');
        });
    });

    test('creates tournament and switches to tournament view', async () => {
        const user = userEvent.setup();
        render(<App />);

        // Click create tournament button
        const createButton = screen.getByText('Create Test Tournament');
        await user.click(createButton);

        // Should now show tournament view
        expect(screen.getByTestId('tournament-view')).toBeInTheDocument();
        expect(screen.getByText('Test Tournament')).toBeInTheDocument();
        expect(screen.getByText('A test tournament')).toBeInTheDocument();

        // Should not show create form or list
        expect(screen.queryByTestId('create-tournament')).not.toBeInTheDocument();
        expect(screen.queryByTestId('tournament-list')).not.toBeInTheDocument();
    });

    test('returns to tournament list from tournament view', async () => {
        const user = userEvent.setup();
        render(<App />);

        // Create tournament first
        const createButton = screen.getByText('Create Test Tournament');
        await user.click(createButton);

        // Verify we're in tournament view
        expect(screen.getByTestId('tournament-view')).toBeInTheDocument();

        // Click back button
        const backButton = screen.getByText('Back to List');
        await user.click(backButton);

        // Should return to tournament list view
        expect(screen.getByTestId('create-tournament')).toBeInTheDocument();
        expect(screen.getByTestId('tournament-list')).toBeInTheDocument();
        expect(screen.queryByTestId('tournament-view')).not.toBeInTheDocument();
    });

    test('deletes tournament and returns to list', async () => {
        const user = userEvent.setup();
        render(<App />);

        // Create tournament first
        const createButton = screen.getByText('Create Test Tournament');
        await user.click(createButton);

        // Verify we're in tournament view
        expect(screen.getByTestId('tournament-view')).toBeInTheDocument();

        // Click delete button
        const deleteButton = screen.getByText('Delete Tournament');
        await user.click(deleteButton);

        // Should return to tournament list view
        expect(screen.getByTestId('create-tournament')).toBeInTheDocument();
        expect(screen.getByTestId('tournament-list')).toBeInTheDocument();
        expect(screen.queryByTestId('tournament-view')).not.toBeInTheDocument();

        // Should refetch tournaments
        await waitFor(() => {
            expect(mockedAxios.get).toHaveBeenCalledTimes(2); // Initial + after delete
        });
    });

    test('handles API error gracefully', async () => {
        // Mock API error
        mockedAxios.get.mockRejectedValue(new Error('API Error'));

        render(<App />);

        // Should still render the component even if API fails
        expect(screen.getByTestId('create-tournament')).toBeInTheDocument();
        expect(screen.getByTestId('tournament-list')).toBeInTheDocument();
    });

    test('displays loading state', async () => {
        // Mock delayed API response
        mockedAxios.get.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

        render(<App />);

        // Should show loading state initially
        expect(screen.getByTestId('tournament-list')).toBeInTheDocument();
    });

    test('selects tournament from list', async () => {
        const user = userEvent.setup();

        // Mock tournaments in the list
        mockedAxios.get.mockResolvedValue({
            data: [{
                id: 'existing-tournament-123',
                name: 'Existing Tournament',
                description: 'An existing tournament',
                question: 'What is 3+3?',
                prompt_ids: ['prompt-3'],
                created_at: '2024-01-01T00:00:00Z',
                status: 'active'
            }]
        });

        render(<App />);

        // Wait for tournaments to load
        await waitFor(() => {
            expect(screen.getByTestId('tournament-existing-tournament-123')).toBeInTheDocument();
        });

        // Click select button on existing tournament
        const selectButton = screen.getByText('Select');
        await user.click(selectButton);

        // Should show tournament view
        expect(screen.getByTestId('tournament-view')).toBeInTheDocument();
        expect(screen.getByText('Existing Tournament')).toBeInTheDocument();
    });
});
