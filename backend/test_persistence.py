#!/usr/bin/env python3
"""
Test script to verify JSON data persistence
"""

import json
import os
from datetime import datetime

# Test data
test_tournament = {
    "id": "test-tournament-123",
    "name": "Test Tournament",
    "description": "A test tournament to verify persistence",
    "question": "What is 2+2?",
    "prompt_ids": ["test-prompt-1"],
    "created_at": datetime.now().isoformat(),
    "status": "active"
}

test_prompt = {
    "id": "test-prompt-1",
    "name": "Test Prompt",
    "content": "Please answer the following question:",
    "description": "A simple test prompt"
}

test_result = {
    "id": "test-result-1",
    "tournament_id": "test-tournament-123",
    "prompt_id": "test-prompt-1",
    "response": "2+2 equals 4",
    "score": 10.0,
    "feedback": "Perfect answer!",
    "created_at": datetime.now().isoformat()
}

def test_data_persistence():
    """Test that data can be saved and loaded from JSON files"""
    print("🧪 Testing JSON data persistence...")
    
    # Test data directory creation
    data_dir = "data"
    os.makedirs(data_dir, exist_ok=True)
    print(f"✅ Data directory created: {data_dir}")
    
    # Test saving tournaments
    tournaments_file = os.path.join(data_dir, "tournaments.json")
    tournaments = {"test-tournament-123": test_tournament}
    
    with open(tournaments_file, 'w', encoding='utf-8') as f:
        json.dump(tournaments, f, indent=2, ensure_ascii=False)
    print(f"✅ Tournaments saved to: {tournaments_file}")
    
    # Test saving prompts
    prompts_file = os.path.join(data_dir, "prompts.json")
    prompts = {"test-prompt-1": test_prompt}
    
    with open(prompts_file, 'w', encoding='utf-8') as f:
        json.dump(prompts, f, indent=2, ensure_ascii=False)
    print(f"✅ Prompts saved to: {prompts_file}")
    
    # Test saving results
    results_file = os.path.join(data_dir, "results.json")
    results = {"test-result-1": test_result}
    
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"✅ Results saved to: {results_file}")
    
    # Test loading data
    print("\n📁 Testing data loading...")
    
    with open(tournaments_file, 'r', encoding='utf-8') as f:
        loaded_tournaments = json.load(f)
    print(f"✅ Loaded {len(loaded_tournaments)} tournaments")
    
    with open(prompts_file, 'r', encoding='utf-8') as f:
        loaded_prompts = json.load(f)
    print(f"✅ Loaded {len(loaded_prompts)} prompts")
    
    with open(results_file, 'r', encoding='utf-8') as f:
        loaded_results = json.load(f)
    print(f"✅ Loaded {len(loaded_results)} results")
    
    # Verify data integrity
    if (loaded_tournaments["test-tournament-123"]["name"] == test_tournament["name"] and
        loaded_prompts["test-prompt-1"]["content"] == test_prompt["content"] and
        loaded_results["test-result-1"]["response"] == test_result["response"]):
        print("✅ Data integrity verified - all data matches!")
    else:
        print("❌ Data integrity check failed!")
    
    print(f"\n🎉 JSON persistence test completed successfully!")
    print(f"📁 Data files created in: {os.path.abspath(data_dir)}")
    
    return True

if __name__ == "__main__":
    test_data_persistence()
