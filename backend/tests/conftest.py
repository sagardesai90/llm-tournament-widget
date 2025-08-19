import pytest
import tempfile
import os
import json
from fastapi.testclient import TestClient
from main import app
import shutil

@pytest.fixture
def test_data_dir():
    """Create a temporary test data directory"""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)

@pytest.fixture
def test_client(test_data_dir):
    """Create a test client with temporary data directory"""
    # Override the data directory for testing
    import main
    main.DATA_DIR = test_data_dir
    main.TOURNAMENTS_FILE = os.path.join(test_data_dir, "tournaments.json")
    main.PROMPTS_FILE = os.path.join(test_data_dir, "prompts.json")
    main.RESULTS_FILE = os.path.join(test_data_dir, "results.json")
    
    # Ensure the test data directory exists
    os.makedirs(test_data_dir, exist_ok=True)
    
    # Reset the in-memory data
    main.tournaments = {}
    main.prompts = {}
    main.results = {}
    
    with TestClient(app) as client:
        yield client

@pytest.fixture
def sample_tournament():
    """Sample tournament data for testing"""
    return {
        "name": "Test Tournament",
        "description": "A test tournament",
        "question": "What is 2+2?",
        "prompts": [
            {
                "name": "Simple Prompt",
                "content": "Please answer: ",
                "description": "A simple prompt"
            },
            {
                "name": "Detailed Prompt",
                "content": "Please provide a detailed explanation for: ",
                "description": "A detailed prompt"
            }
        ]
    }

@pytest.fixture
def sample_prompt():
    """Sample prompt data for testing"""
    return {
        "name": "Test Prompt",
        "content": "Please answer the following question: ",
        "description": "A test prompt"
    }

@pytest.fixture
def sample_result():
    """Sample result data for testing"""
    return {
        "prompt_id": "test-prompt-123",
        "response": "2+2 equals 4",
        "score": 8.5,
        "feedback": "Good answer!"
    }
