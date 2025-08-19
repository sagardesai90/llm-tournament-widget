# LLM Tournament Widget

A web application for creating and running tournaments to compare different LLM prompts and evaluate their performance.

## Features

- **Tournament Creation**: Create tournaments with multiple prompt variations
- **Tournament Management**: Delete tournaments and all associated data
- **Automated Response Generation**: Use OpenAI to automatically generate responses for all prompts
- **AI-Powered Scoring**: Automatic evaluation and scoring of responses using OpenAI
- **Individual Auto-Generate**: Generate responses for specific prompts one at a time
- **Manual Response Submission**: Submit your own LLM responses for evaluation
- **Scoring System**: Score and provide feedback on responses (manual or AI)
- **Leaderboard**: View tournament results ranked by performance
- **Data Persistence**: All data is automatically saved to JSON files and persists between server restarts
- **Real-Time Streaming**: Watch AI responses being generated token by token in real-time

## Setup

### Prerequisites

- Python 3.8+
- Node.js 16+
- OpenAI API key with access to **GPT-5-mini** (required for AI evaluation and response generation)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file with your OpenAI API key:
   ```bash
   echo "OPENAI_API_KEY=your_actual_api_key_here" > .env
   ```
   
   **Important**: Make sure your OpenAI API key has access to GPT-5-mini for the AI evaluation features to work properly.

5. Start the backend server:
   ```bash
   python3 main.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## Usage

### Creating a Tournament

1. Click "Create New Tournament"
2. Fill in the tournament details:
   - Name and description
   - The question/input that will be tested
   - Multiple prompt variations to compare
3. Click "Create Tournament"

### Managing Tournaments

- **View Tournaments**: See all your tournaments in the main list
- **Delete Tournaments**: 
  - Click the 🗑️ delete button on any tournament card
  - Or open a tournament and click "Delete Tournament" in the header
  - Confirm deletion in the dialog
  - **Warning**: This permanently removes the tournament, all prompts, and all results
- **Add Prompts to Existing Tournaments**: 
  - Open any tournament
  - Click "Add Prompt" to expand the form
  - Enter a prompt name and content
  - Submit to add the new prompt
  - **Auto-generate responses** for the new prompt immediately
  - **AI evaluation** will score the new prompt's responses automatically

### Automated Response Generation

After creating a tournament, you have two options:

1. **Bulk Generate All Responses**: Click "Auto-Generate All Responses" to generate responses for all prompts at once
2. **Individual Generation**: Click "Auto-Generate" on specific prompt cards to generate responses one at a time

The system will:
- Use **OpenAI's GPT-5-mini** model for enhanced response quality and evaluation
- Combine your prompt with the tournament question
- Generate comprehensive responses
- **Automatically score responses using AI** (1-10 scale)
- Store results automatically
- Skip prompts that already have responses
- **Save all data to JSON files** for persistence

### AI-Powered Scoring

The system automatically evaluates responses using AI:

- **Automatic Scoring**: Responses are scored immediately when generated
- **AI Evaluation**: Uses **OpenAI's GPT-5-mini** to assess response quality, relevance, and clarity
- **Structured Outputs**: Leverages OpenAI's latest structured outputs feature for reliable, schema-compliant evaluation
- **Comprehensive Metrics**: Provides detailed scoring across multiple dimensions:
  - **Overall Score**: 1-10 scale for overall response quality
  - **Relevance Score**: How well the response addresses the prompt (1-10)
  - **Clarity Score**: How clear and well-structured the response is (1-10)
  - **Strengths**: Specific positive aspects of the response
  - **Areas for Improvement**: Specific suggestions for enhancement
- **Scoring Scale**: 1-10 scale with detailed feedback
- **Real-time Updates**: Leaderboard updates automatically as responses are scored
- **Batch Scoring**: Use "AI Score All" to score multiple responses at once
- **Individual Scoring**: Score specific responses with "AI Score" button

### Manual Response Submission

You can also manually submit responses:
1. Select a prompt card
2. Enter the LLM response in the text area
3. Click "Submit Response"
4. Use "AI Score" to automatically evaluate your response

### Evaluating Responses

1. Navigate to the Leaderboard tab
2. **AI-scored responses** appear in the "Scored Responses" section
3. **Unscored responses** appear in the "Unscored Responses" section
4. Use "AI Score All" to automatically score all responses
5. View detailed feedback and reasoning for each score
6. **Manual scoring** option available for custom evaluation

## Data Persistence

### Automatic Saving
- **Tournaments**: Saved to `backend/data/tournaments.json`
- **Prompts**: Saved to `backend/data/prompts.json`
- **Results**: Saved to `backend/data/results.json`
- **Real-time**: Data is saved immediately when created/modified
- **Server Restarts**: All data persists between server restarts

### Data Management Utilities

The backend includes a data management utility script:

```bash
cd backend

# Create a backup of all data
python data_utils.py backup

# List available backups
python data_utils.py list

# Restore from a backup
python data_utils.py restore data_backup_20241201_143022

# Export all data to a single file
python data_utils.py export my_tournament_data.json

# Import data from an export file
python data_utils.py import my_tournament_data.json
```

### Backup and Restore
- **Automatic Backups**: Create timestamped backups before major operations
- **Data Export**: Export all data to a single JSON file for sharing/backup
- **Data Import**: Import data from export files to restore or migrate

## API Endpoints

- `POST /tournaments` - Create a new tournament
- `DELETE /tournaments/{id}` - Delete a tournament and all associated data
- `POST /tournaments/{id}/prompts` - Add a new prompt to an existing tournament
- `POST /tournaments/{id}/auto-generate` - Generate response for a single prompt
- `POST /tournaments/{id}/auto-generate-all` - Generate responses for all prompts
- `POST /tournaments/{id}/auto-score` - Automatically score a response using AI
- `POST /tournaments/{id}/auto-score-all` - Automatically score all unscored responses
- `POST /tournaments/{id}/results` - Submit a manual response
- `GET /tournaments/{id}/leaderboard` - Get tournament results

## Configuration

The application uses environment variables for configuration:

- `OPENAI_API_KEY`: Your OpenAI API key (required for auto-generation)

## Future Enhancements

- Support for other LLM providers (Claude, Gemini, etc.)
- Custom evaluation criteria
- Response quality metrics
- Tournament templates
- Export results
- Database integration (PostgreSQL, MongoDB)
- User authentication and authorization

## Troubleshooting

- **OpenAI API errors**: Check your API key and billing status
- **CORS issues**: Ensure backend is running on port 8000 and frontend on port 3000
- **Missing responses**: Check that prompts have been created and the tournament is active
- **Data loss**: All data is automatically saved to JSON files in `backend/data/`
- **Backup issues**: Use `python data_utils.py backup` to create manual backups
