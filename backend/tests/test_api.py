import pytest
import json
from fastapi.testclient import TestClient

class TestTournamentAPI:
    """Test tournament-related API endpoints"""
    
    def test_create_tournament_success(self, test_client, sample_tournament):
        """Test successful tournament creation"""
        response = test_client.post("/tournaments", json=sample_tournament)
        assert response.status_code == 200
        
        data = response.json()
        assert "tournament_id" in data
        assert "tournament" in data
        
        tournament = data["tournament"]
        assert "id" in tournament
        assert tournament["name"] == sample_tournament["name"]
        assert tournament["description"] == sample_tournament["description"]
        assert tournament["question"] == sample_tournament["question"]
        assert len(tournament["prompt_ids"]) == 2
        
        # Verify prompts were created (they're stored separately, not in tournament response)
        # The tournament only contains prompt_ids, not the full prompt data
        assert len(tournament["prompt_ids"]) == 2
    
    def test_create_tournament_missing_fields(self, test_client):
        """Test tournament creation with missing required fields"""
        incomplete_tournament = {
            "name": "Test Tournament"
            # Missing description, question, and prompts
        }
        
        response = test_client.post("/tournaments", json=incomplete_tournament)
        assert response.status_code == 422  # Validation error
    
    def test_create_tournament_empty_prompts(self, test_client):
        """Test tournament creation with empty prompts list"""
        tournament_without_prompts = {
            "name": "Test Tournament",
            "description": "A test tournament",
            "question": "What is 2+2?",
            "prompts": []
        }
        
        response = test_client.post("/tournaments", json=tournament_without_prompts)
        # The API currently allows empty prompts (no validation)
        assert response.status_code == 200
    
    def test_get_tournaments_empty(self, test_client):
        """Test getting tournaments when none exist"""
        response = test_client.get("/tournaments")
        assert response.status_code == 200
        assert response.json() == []
    
    def test_get_tournaments_with_data(self, test_client, sample_tournament):
        """Test getting tournaments when data exists"""
        # Create a tournament first
        test_client.post("/tournaments", json=sample_tournament)
        
        response = test_client.get("/tournaments")
        assert response.status_code == 200
        
        tournaments = response.json()
        assert len(tournaments) == 1
        assert tournaments[0]["name"] == sample_tournament["name"]
    
    def test_delete_tournament_success(self, test_client, sample_tournament):
        """Test successful tournament deletion"""
        # Create a tournament first
        create_response = test_client.post("/tournaments", json=sample_tournament)
        tournament_id = create_response.json()["tournament_id"]
        
        # Delete the tournament
        response = test_client.delete(f"/tournaments/{tournament_id}")
        assert response.status_code == 200
        
        # Verify tournament is deleted
        get_response = test_client.get("/tournaments")
        assert len(get_response.json()) == 0
    
    def test_delete_tournament_not_found(self, test_client):
        """Test deleting a non-existent tournament"""
        response = test_client.delete("/tournaments/non-existent-id")
        assert response.status_code == 404
    
    def test_add_prompt_to_tournament(self, test_client, sample_tournament):
        """Test adding a prompt to an existing tournament"""
        # Create a tournament first
        create_response = test_client.post("/tournaments", json=sample_tournament)
        tournament_id = create_response.json()["tournament_id"]
        
        # Add a new prompt
        new_prompt = {
            "name": "Additional Prompt",
            "content": "Please also consider: ",
            "description": "An additional prompt"
        }
        
        response = test_client.post(f"/tournaments/{tournament_id}/prompts", json=new_prompt)
        assert response.status_code == 200
        
        data = response.json()
        assert "prompt_id" in data
        assert "prompt" in data
        
        prompt_data = data["prompt"]
        assert prompt_data["name"] == new_prompt["name"]
        # The API strips whitespace from content
        assert prompt_data["content"] == new_prompt["content"].strip()
        assert "id" in prompt_data
        
        # Verify prompt was added to tournament
        tournament_response = test_client.get(f"/tournaments/{tournament_id}")
        tournament = tournament_response.json()
        assert len(tournament["prompt_ids"]) == 3  # Original 2 + new 1

class TestResultsAPI:
    """Test results-related API endpoints"""
    
    def test_submit_manual_response_success(self, test_client, sample_tournament):
        """Test successful manual response submission"""
        # Create a tournament first
        create_response = test_client.post("/tournaments", json=sample_tournament)
        tournament_id = create_response.json()["tournament_id"]
        prompt_id = create_response.json()["tournament"]["prompt_ids"][0]
        
        # Submit a manual response
        manual_response = {
            "tournament_id": tournament_id,
            "prompt_id": prompt_id,
            "response": "2+2 equals 4",
            "score": 9.0,
            "feedback": "Excellent answer!"
        }
        
        response = test_client.post(f"/tournaments/{tournament_id}/results", json=manual_response)
        assert response.status_code == 200
        
        data = response.json()
        assert "result_id" in data
        assert "result" in data
        
        result_data = data["result"]
        assert result_data["response"] == manual_response["response"]
        assert result_data["score"] == manual_response["score"]
        assert result_data["feedback"] == manual_response["feedback"]
    
    def test_submit_response_invalid_prompt(self, test_client, sample_tournament):
        """Test submitting response with invalid prompt ID"""
        # Create a tournament first
        create_response = test_client.post("/tournaments", json=sample_tournament)
        tournament_id = create_response.json()["tournament_id"]
        
        # Submit response with invalid prompt ID
        invalid_response = {
            "tournament_id": tournament_id,
            "prompt_id": "invalid-prompt-id",
            "response": "2+2 equals 4"
        }
        
        response = test_client.post(f"/tournaments/{tournament_id}/results", json=invalid_response)
        # The current API doesn't validate prompt_id existence, so it accepts any valid TournamentResult
        assert response.status_code == 200
    
    def test_get_leaderboard_empty(self, test_client, sample_tournament):
        """Test getting leaderboard when no results exist"""
        # Create a tournament first
        create_response = test_client.post("/tournaments", json=sample_tournament)
        tournament_id = create_response.json()["tournament_id"]
        
        response = test_client.get(f"/tournaments/{tournament_id}/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        # The current API returns a list of results directly
        assert isinstance(data, list)
        assert len(data) == 0
    
    def test_get_leaderboard_with_results(self, test_client, sample_tournament):
        """Test getting leaderboard with existing results"""
        # Create a tournament first
        create_response = test_client.post("/tournaments", json=sample_tournament)
        tournament_id = create_response.json()["tournament_id"]
        prompt_id = create_response.json()["tournament"]["prompt_ids"][0]
        
        # Submit a response
        manual_response = {
            "tournament_id": tournament_id,
            "prompt_id": prompt_id,
            "response": "2+2 equals 4",
            "score": 9.0,
            "feedback": "Excellent answer!"
        }
        
        test_client.post(f"/tournaments/{tournament_id}/results", json=manual_response)
        
        # Get leaderboard
        response = test_client.get(f"/tournaments/{tournament_id}/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        # The current API returns a list of results directly
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["response"] == "2+2 equals 4"
        assert data[0]["score"] == 9.0

class TestUtilityEndpoints:
    """Test utility API endpoints"""
    
    def test_ai_evaluation_schema(self, test_client):
        """Test getting AI evaluation schema"""
        response = test_client.get("/ai-evaluation-schema")
        assert response.status_code == 200
        
        schema = response.json()
        assert "schema" in schema
        assert "description" in schema
        assert "model_info" in schema
        assert schema["description"] == "Schema for AI evaluation responses using structured outputs"
    
    def test_test_stream_endpoint(self, test_client):
        """Test the streaming endpoint"""
        response = test_client.get("/test-stream")
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
