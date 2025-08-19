#!/usr/bin/env python3
"""
Test runner script for LLM Tournament Widget
"""

import subprocess
import sys
import os

def run_tests():
    """Run all tests with pytest"""
    print("🧪 Running LLM Tournament Widget Tests...")
    print("=" * 50)
    
    # Change to backend directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Run pytest with coverage
    cmd = [
        sys.executable, "-m", "pytest",
        "tests/",
        "-v",
        "--cov=.",
        "--cov-report=term-missing",
        "--cov-report=html",
        "--tb=short"
    ]
    
    try:
        result = subprocess.run(cmd, check=True)
        print("\n🎉 All tests passed!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Tests failed with exit code {e.returncode}")
        return False

def run_specific_test(test_file):
    """Run a specific test file"""
    print(f"🧪 Running specific test: {test_file}")
    print("=" * 50)
    
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    cmd = [
        sys.executable, "-m", "pytest",
        f"tests/{test_file}",
        "-v",
        "--tb=short"
    ]
    
    try:
        result = subprocess.run(cmd, check=True)
        print(f"\n🎉 Test {test_file} passed!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Test {test_file} failed with exit code {e.returncode}")
        return False

def show_test_coverage():
    """Show test coverage report"""
    print("📊 Test Coverage Report")
    print("=" * 50)
    
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    cmd = [
        sys.executable, "-m", "pytest",
        "tests/",
        "--cov=.",
        "--cov-report=term-missing",
        "--cov-report=html",
        "--tb=no"
    ]
    
    try:
        subprocess.run(cmd, check=True)
        print("\n📁 HTML coverage report generated in htmlcov/ directory")
    except subprocess.CalledProcessError:
        print("❌ Failed to generate coverage report")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "coverage":
            show_test_coverage()
        elif sys.argv[1].endswith(".py"):
            run_specific_test(sys.argv[1])
        else:
            print(f"Unknown argument: {sys.argv[1]}")
            print("Usage: python run_tests.py [test_file.py|coverage]")
    else:
        run_tests()
