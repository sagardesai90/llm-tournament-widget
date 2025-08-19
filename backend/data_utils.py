#!/usr/bin/env python3
"""
Data management utilities for the LLM Tournament Widget
"""

import json
import os
import shutil
from datetime import datetime

DATA_DIR = "data"
TOURNAMENTS_FILE = os.path.join(DATA_DIR, "tournaments.json")
PROMPTS_FILE = os.path.join(DATA_DIR, "prompts.json")
RESULTS_FILE = os.path.join(DATA_DIR, "results.json")

def backup_data():
    """Create a backup of all data files"""
    backup_dir = f"data_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    os.makedirs(backup_dir, exist_ok=True)
    
    files_to_backup = [TOURNAMENTS_FILE, PROMPTS_FILE, RESULTS_FILE]
    
    for file_path in files_to_backup:
        if os.path.exists(file_path):
            filename = os.path.basename(file_path)
            backup_path = os.path.join(backup_dir, filename)
            shutil.copy2(file_path, backup_path)
            print(f"📁 Backed up {filename} to {backup_path}")
    
    print(f"✅ Backup completed: {backup_dir}")
    return backup_dir

def restore_data(backup_dir):
    """Restore data from a backup directory"""
    if not os.path.exists(backup_dir):
        print(f"❌ Backup directory {backup_dir} not found")
        return False
    
    files_to_restore = [TOURNAMENTS_FILE, PROMPTS_FILE, RESULTS_FILE]
    
    for file_path in files_to_restore:
        filename = os.path.basename(file_path)
        backup_path = os.path.join(backup_dir, filename)
        
        if os.path.exists(backup_path):
            shutil.copy2(backup_path, file_path)
            print(f"📁 Restored {filename} from {backup_path}")
        else:
            print(f"⚠️  Backup file {filename} not found in {backup_dir}")
    
    print(f"✅ Restore completed from {backup_dir}")
    return True

def list_backups():
    """List all available backup directories"""
    backups = []
    for item in os.listdir("."):
        if item.startswith("data_backup_") and os.path.isdir(item):
            backups.append(item)
    
    if backups:
        print("📁 Available backups:")
        for backup in sorted(backups, reverse=True):
            print(f"  - {backup}")
    else:
        print("📁 No backups found")
    
    return backups

def export_data(export_file="tournament_data_export.json"):
    """Export all data to a single JSON file"""
    data = {
        "tournaments": {},
        "prompts": {},
        "results": {},
        "exported_at": datetime.now().isoformat()
    }
    
    # Load current data
    for file_path, key in [(TOURNAMENTS_FILE, "tournaments"), (PROMPTS_FILE, "prompts"), (RESULTS_FILE, "results")]:
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data[key] = json.load(f)
            except Exception as e:
                print(f"⚠️  Error loading {file_path}: {e}")
    
    # Save export file
    try:
        with open(export_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"📤 Data exported to {export_file}")
        return True
    except Exception as e:
        print(f"❌ Error exporting data: {e}")
        return False

def import_data(import_file):
    """Import data from an export file"""
    if not os.path.exists(import_file):
        print(f"❌ Import file {import_file} not found")
        return False
    
    try:
        with open(import_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Validate data structure
        required_keys = ["tournaments", "prompts", "results"]
        if not all(key in data for key in required_keys):
            print(f"❌ Invalid export file format. Expected keys: {required_keys}")
            return False
        
        # Save data to individual files
        save_data_to_file(TOURNAMENTS_FILE, data["tournaments"])
        save_data_to_file(PROMPTS_FILE, data["prompts"])
        save_data_to_file(RESULTS_FILE, data["results"])
        
        print(f"📥 Data imported from {import_file}")
        return True
        
    except Exception as e:
        print(f"❌ Error importing data: {e}")
        return False

def save_data_to_file(filename: str, data: dict):
    """Save data to JSON file"""
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"💾 Saved {len(data)} items to {filename}")
    except Exception as e:
        print(f"❌ Error saving {filename}: {e}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python data_utils.py [backup|restore|list|export|import] [backup_dir|import_file]")
        print("\nCommands:")
        print("  backup                    - Create a backup of all data")
        print("  restore <backup_dir>      - Restore data from backup")
        print("  list                      - List available backups")
        print("  export [filename]         - Export all data to JSON file")
        print("  import <filename>         - Import data from JSON file")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "backup":
        backup_data()
    elif command == "restore":
        if len(sys.argv) < 3:
            print("❌ Please specify backup directory")
            sys.exit(1)
        restore_data(sys.argv[2])
    elif command == "list":
        list_backups()
    elif command == "export":
        export_file = sys.argv[2] if len(sys.argv) > 2 else "tournament_data_export.json"
        export_data(export_file)
    elif command == "import":
        if len(sys.argv) < 3:
            print("❌ Please specify import file")
            sys.exit(1)
        import_data(sys.argv[2])
    else:
        print(f"❌ Unknown command: {command}")
        sys.exit(1)
