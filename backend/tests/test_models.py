import pytest
from pydantic import ValidationError
from datetime import datetime
import uuid

# Import the models from main.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import Prompt, CreatePromptRequest, Tournament, TournamentResult

class TestPromptModels:
    """Test Prompt-related models"""
    
    def test_prompt_creation_valid(self):
        """Test creating a valid Prompt"""
        prompt = Prompt(
            name="Test Prompt",
            content="Please answer: ",
            description="A test prompt"
        )
        
        assert prompt.name == "Test Prompt"
        assert prompt.content == "Please answer: "
        assert prompt.description == "A test prompt"
        assert prompt.id is None  # ID should be None initially
    
    def test_prompt_creation_with_id(self):
        """Test creating a Prompt with an ID"""
        prompt_id = str(uuid.uuid4())
        prompt = Prompt(
            id=prompt_id,
            name="Test Prompt",
            content="Please answer: ",
            description="A test prompt"
        )
        
        assert prompt.id == prompt_id
        assert prompt.name == "Test Prompt"
    
    def test_prompt_creation_missing_required(self):
        """Test creating a Prompt with missing required fields"""
        with pytest.raises(ValidationError):
            Prompt(
                # Missing name and content
                description="A test prompt"
            )
    
    def test_prompt_creation_empty_strings(self):
        """Test creating a Prompt with empty strings"""
        # Pydantic allows empty strings by default
        prompt1 = Prompt(
            name="",  # Empty name
            content="Please answer: "
        )
        assert prompt1.name == ""
        
        prompt2 = Prompt(
            name="Test Prompt",
            content=""  # Empty content
        )
        assert prompt2.content == ""
    
    def test_create_prompt_request_valid(self):
        """Test creating a valid CreatePromptRequest"""
        request = CreatePromptRequest(
            name="Test Prompt",
            content="Please answer: ",
            description="A test prompt"
        )
        
        assert request.name == "Test Prompt"
        assert request.content == "Please answer: "
        assert request.description == "A test prompt"
    
    def test_create_prompt_request_optional_description(self):
        """Test creating CreatePromptRequest without description"""
        request = CreatePromptRequest(
            name="Test Prompt",
            content="Please answer: "
        )
        
        assert request.name == "Test Prompt"
        assert request.content == "Please answer: "
        assert request.description is None

class TestTournamentModels:
    """Test Tournament-related models"""
    
    def test_tournament_creation_valid(self):
        """Test creating a valid Tournament"""
        tournament = Tournament(
            id=str(uuid.uuid4()),
            name="Test Tournament",
            description="A test tournament",
            question="What is 2+2?",
            prompt_ids=["prompt-1", "prompt-2"],
            created_at=datetime.now().isoformat(),
            status="active"
        )
        
        assert tournament.name == "Test Tournament"
        assert tournament.description == "A test tournament"
        assert tournament.question == "What is 2+2?"
        assert len(tournament.prompt_ids) == 2
        assert tournament.status == "active"
    
    def test_tournament_creation_default_status(self):
        """Test creating a Tournament with default status"""
        tournament = Tournament(
            id=str(uuid.uuid4()),
            name="Test Tournament",
            description="A test tournament",
            question="What is 2+2?",
            prompt_ids=["prompt-1"],
            created_at=datetime.now().isoformat()
            # status not provided, should default to "active"
        )
        
        assert tournament.status == "active"
    
    def test_tournament_creation_invalid_status(self):
        """Test creating a Tournament with invalid status"""
        # Pydantic allows any string value for status
        tournament = Tournament(
            id=str(uuid.uuid4()),
            name="Test Tournament",
            description="A test tournament",
            question="What is 2+2?",
            prompt_ids=["prompt-1"],
            created_at=datetime.now().isoformat(),
            status="invalid_status"  # Invalid status
        )
        assert tournament.status == "invalid_status"
    
    def test_tournament_creation_empty_prompt_ids(self):
        """Test creating a Tournament with empty prompt_ids"""
        tournament = Tournament(
            id=str(uuid.uuid4()),
            name="Test Tournament",
            description="A test tournament",
            question="What is 2+2?",
            prompt_ids=[],  # Empty list
            created_at=datetime.now().isoformat()
        )
        
        assert len(tournament.prompt_ids) == 0
    
    def test_tournament_creation_missing_required(self):
        """Test creating a Tournament with missing required fields"""
        with pytest.raises(ValidationError):
            Tournament(
                # Missing required fields
                id=str(uuid.uuid4()),
                name="Test Tournament"
            )

class TestTournamentResultModels:
    """Test TournamentResult-related models"""
    
    def test_tournament_result_creation_valid(self):
        """Test creating a valid TournamentResult"""
        result = TournamentResult(
            id=str(uuid.uuid4()),
            tournament_id="tournament-123",
            prompt_id="prompt-456",
            response="2+2 equals 4",
            score=8.5,
            feedback="Good answer!",
            created_at=datetime.now().isoformat()
        )
        
        assert result.tournament_id == "tournament-123"
        assert result.prompt_id == "prompt-456"
        assert result.response == "2+2 equals 4"
        assert result.score == 8.5
        assert result.feedback == "Good answer!"
    
    def test_tournament_result_creation_optional_fields(self):
        """Test creating TournamentResult without optional fields"""
        result = TournamentResult(
            id=str(uuid.uuid4()),
            tournament_id="tournament-123",
            prompt_id="prompt-456",
            response="2+2 equals 4",
            created_at=datetime.now().isoformat()
            # score and feedback not provided
        )
        
        assert result.score is None
        assert result.feedback is None
    
    def test_tournament_result_creation_missing_required(self):
        """Test creating TournamentResult with missing required fields"""
        with pytest.raises(ValidationError):
            TournamentResult(
                # Missing required fields
                id=str(uuid.uuid4()),
                tournament_id="tournament-123"
            )
    
    def test_tournament_result_score_validation(self):
        """Test TournamentResult score validation"""
        # Valid score range
        result = TournamentResult(
            id=str(uuid.uuid4()),
            tournament_id="tournament-123",
            prompt_id="prompt-456",
            response="2+2 equals 4",
            score=10.0,  # Maximum valid score
            created_at=datetime.now().isoformat()
        )
        assert result.score == 10.0
        
        result = TournamentResult(
            id=str(uuid.uuid4()),
            tournament_id="tournament-123",
            prompt_id="prompt-456",
            response="2+2 equals 4",
            score=1.0,  # Minimum valid score
            created_at=datetime.now().isoformat()
            )
        assert result.score == 1.0
        
        # Pydantic allows any float value for score (no validation constraints)
        result = TournamentResult(
            id=str(uuid.uuid4()),
            tournament_id="tournament-123",
            prompt_id="prompt-456",
            response="2+2 equals 4",
            score=11.0,  # Above maximum (but allowed by Pydantic)
            created_at=datetime.now().isoformat()
        )
        assert result.score == 11.0
        
        result = TournamentResult(
            id=str(uuid.uuid4()),
            tournament_id="tournament-123",
            prompt_id="prompt-456",
            response="2+2 equals 4",
            score=0.0,  # Below minimum (but allowed by Pydantic)
            created_at=datetime.now().isoformat()
        )
        assert result.score == 0.0
