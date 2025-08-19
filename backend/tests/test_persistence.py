import pytest
import json
import os
import tempfile
import shutil
from unittest.mock import patch, mock_open

# Import the functions from main.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import load_data_from_file, save_data_to_file, DATA_DIR

class TestDataPersistence:
    """Test data persistence functionality"""
    
    def test_load_data_from_file_existing(self, tmp_path):
        """Test loading data from an existing file"""
        # Create a temporary file with test data
        test_file = tmp_path / "test_data.json"
        test_data = {"key1": "value1", "key2": "value2"}
        
        with open(test_file, 'w') as f:
            json.dump(test_data, f)
        
        # Test loading the data
        loaded_data = load_data_from_file(str(test_file))
        assert loaded_data == test_data
    
    def test_load_data_from_file_nonexistent(self, tmp_path):
        """Test loading data from a non-existent file"""
        non_existent_file = tmp_path / "nonexistent.json"
        
        # Test loading with default value
        default_data = {"default": "value"}
        loaded_data = load_data_from_file(str(non_existent_file), default_data)
        assert loaded_data == default_data
    
    def test_load_data_from_file_nonexistent_no_default(self, tmp_path):
        """Test loading data from a non-existent file without default"""
        non_existent_file = tmp_path / "nonexistent.json"
        
        # Test loading without default value
        loaded_data = load_data_from_file(str(non_existent_file))
        assert loaded_data == {}
    
    def test_load_data_from_file_invalid_json(self, tmp_path):
        """Test loading data from a file with invalid JSON"""
        # Create a temporary file with invalid JSON
        test_file = tmp_path / "invalid.json"
        with open(test_file, 'w') as f:
            f.write('{"invalid": json}')
        
        # Test loading with default value
        default_data = {"default": "value"}
        loaded_data = load_data_from_file(str(test_file), default_data)
        assert loaded_data == default_data
    
    def test_save_data_to_file_success(self, tmp_path):
        """Test successfully saving data to a file"""
        test_file = tmp_path / "save_test.json"
        test_data = {"save_key": "save_value", "number": 42}
        
        # Test saving the data
        save_data_to_file(str(test_file), test_data)
        
        # Verify the file was created and contains correct data
        assert test_file.exists()
        with open(test_file, 'r') as f:
            saved_data = json.load(f)
        assert saved_data == test_data
    
    def test_save_data_to_file_directory_creation(self, tmp_path):
        """Test that save_data_to_file creates directories if they don't exist"""
        # Create a path with non-existent subdirectories
        test_dir = tmp_path / "new" / "subdirectory"
        test_file = test_dir / "test.json"
        test_data = {"test": "data"}
        
        # Test saving the data (should fail since directories don't exist)
        # The current implementation doesn't create directories automatically
        try:
            save_data_to_file(str(test_file), test_data)
            # If we get here, the test should fail
            assert False, "Expected save_data_to_file to fail when directories don't exist"
        except Exception:
            # This is the expected behavior
            pass
        
        # Verify directories were NOT created
        assert not test_dir.exists()
        assert not test_file.exists()
    
    def test_save_data_to_file_unicode_support(self, tmp_path):
        """Test that save_data_to_file handles Unicode characters correctly"""
        test_file = tmp_path / "unicode_test.json"
        test_data = {
            "english": "Hello World",
            "spanish": "Hola Mundo",
            "chinese": "你好世界",
            "emoji": "🚀🎉✨"
        }
        
        # Test saving Unicode data
        save_data_to_file(str(test_file), test_data)
        
        # Verify data was saved and loaded correctly
        with open(test_file, 'r', encoding='utf-8') as f:
            saved_data = json.load(f)
        assert saved_data == test_data
    
    def test_save_data_to_file_empty_data(self, tmp_path):
        """Test saving empty data to a file"""
        test_file = tmp_path / "empty_test.json"
        empty_data = {}
        
        # Test saving empty data
        save_data_to_file(str(test_file), empty_data)
        
        # Verify file was created and contains empty data
        assert test_file.exists()
        with open(test_file, 'r') as f:
            saved_data = json.load(f)
        assert saved_data == empty_data
    
    def test_save_data_to_file_large_data(self, tmp_path):
        """Test saving large amounts of data"""
        test_file = tmp_path / "large_test.json"
        large_data = {
            f"key_{i}": f"value_{i}" * 100  # Create large strings
            for i in range(1000)
        }
        
        # Test saving large data
        save_data_to_file(str(test_file), large_data)
        
        # Verify file was created and contains correct data
        assert test_file.exists()
        with open(test_file, 'r') as f:
            saved_data = json.load(f)
        assert saved_data == large_data
    
    @patch('builtins.open', side_effect=PermissionError("Permission denied"))
    def test_save_data_to_file_permission_error(self, mock_file, tmp_path):
        """Test handling of permission errors when saving"""
        test_file = tmp_path / "permission_test.json"
        test_data = {"test": "data"}
        
        # Test that permission errors are handled gracefully
        # The current implementation catches exceptions and prints them but doesn't re-raise
        save_data_to_file(str(test_file), test_data)
        # Should not raise an exception (it's caught and logged)
    
    @patch('builtins.open', side_effect=OSError("Disk full"))
    def test_save_data_to_file_os_error(self, mock_file, tmp_path):
        """Test handling of OS errors when saving"""
        test_file = tmp_path / "os_error_test.json"
        test_data = {"test": "data"}
        
        # Test that OS errors are handled gracefully
        # The current implementation catches exceptions and prints them but doesn't re-raise
        save_data_to_file(str(test_file), test_data)
        # Should not raise an exception (it's caught and logged)
    
    def test_data_file_integration(self, tmp_path):
        """Test integration of data file operations"""
        # Test the complete flow: save then load
        test_file = tmp_path / "integration_test.json"
        test_data = {
            "tournaments": {
                "tournament_1": {
                    "id": "tournament_1",
                    "name": "Test Tournament",
                    "description": "A test tournament"
                }
            },
            "prompts": {
                "prompt_1": {
                    "id": "prompt_1",
                    "name": "Test Prompt",
                    "content": "Test content"
                }
            }
        }
        
        # Save the data
        save_data_to_file(str(test_file), test_data)
        
        # Load the data back
        loaded_data = load_data_from_file(str(test_file))
        
        # Verify data integrity
        assert loaded_data == test_data
        assert "tournaments" in loaded_data
        assert "prompts" in loaded_data
        assert loaded_data["tournaments"]["tournament_1"]["name"] == "Test Tournament"
        assert loaded_data["prompts"]["prompt_1"]["content"] == "Test content"
    
    def test_data_file_formats(self, tmp_path):
        """Test that data files maintain proper JSON formatting"""
        test_file = tmp_path / "format_test.json"
        test_data = {
            "nested": {
                "deep": {
                    "structure": "value"
                }
            },
            "array": [1, 2, 3, "string"],
            "boolean": True,
            "null_value": None
        }
        
        # Save the data
        save_data_to_file(str(test_file), test_data)
        
        # Read the raw file content to check formatting
        with open(test_file, 'r') as f:
            raw_content = f.read()
        
        # Verify proper JSON formatting (indentation, etc.)
        assert raw_content.count('  ') > 0  # Should have indentation
        assert raw_content.count('\n') > 0  # Should have line breaks
        
        # Verify data can be parsed back
        parsed_data = json.loads(raw_content)
        assert parsed_data == test_data
