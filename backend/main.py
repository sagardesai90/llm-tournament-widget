from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import json
import os
from datetime import datetime
import uuid
import openai
from dotenv import load_dotenv
import asyncio

# Load environment variables
load_dotenv()

# Configure OpenAI
openai.api_key = os.getenv("OPENAI_API_KEY")

# Verify API key configuration
if not openai.api_key or openai.api_key == "your_openai_api_key_here":
    print("⚠️  Warning: OpenAI API key not properly configured!")
    print("   Please set OPENAI_API_KEY in your .env file")
    print("   Get your API key from: https://platform.openai.com/api-keys")
else:
    print("✅ OpenAI API key configured successfully")

app = FastAPI(title="LLM Tournament Widget API", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data storage configuration
DATA_DIR = "data"
TOURNAMENTS_FILE = os.path.join(DATA_DIR, "tournaments.json")
PROMPTS_FILE = os.path.join(DATA_DIR, "prompts.json")
RESULTS_FILE = os.path.join(DATA_DIR, "results.json")

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

def load_data_from_file(filename: str, default: dict = None) -> dict:
    """Load data from JSON file, return default if file doesn't exist"""
    if default is None:
        default = {}
    
    try:
        if os.path.exists(filename):
            with open(filename, 'r', encoding='utf-8') as f:
                data = json.load(f)
                print(f"📁 Loaded {len(data)} items from {filename}")
                return data
        else:
            print(f"📁 Creating new data file: {filename}")
            return default
    except Exception as e:
        print(f"⚠️  Error loading {filename}: {e}, using default")
        return default

def save_data_to_file(filename: str, data: dict):
    """Save data to JSON file"""
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"💾 Saved {len(data)} items to {filename}")
    except Exception as e:
        print(f"❌ Error saving {filename}: {e}")

# Load existing data from files
tournaments = load_data_from_file(TOURNAMENTS_FILE, {})
prompts = load_data_from_file(PROMPTS_FILE, {})
results = load_data_from_file(RESULTS_FILE, {})

print(f"🚀 Server started with {len(tournaments)} tournaments, {len(prompts)} prompts, and {len(results)} results")

class Prompt(BaseModel):
    id: Optional[str] = None
    name: str
    content: str
    description: Optional[str] = None

class CreatePromptRequest(BaseModel):
    name: str
    content: str
    description: Optional[str] = None

class Tournament(BaseModel):
    id: str
    name: str
    description: str
    question: str
    prompt_ids: List[str]
    created_at: str
    status: str = "active"  # active, completed, archived

class TournamentResult(BaseModel):
    id: Optional[str] = None
    tournament_id: str
    prompt_id: str
    response: str
    score: Optional[float] = None
    feedback: Optional[str] = None
    created_at: Optional[str] = None
    ai_evaluated: Optional[bool] = None
    evaluation_timestamp: Optional[str] = None
    evaluation_metrics: Optional[dict] = None

class AIEvaluationResponse(BaseModel):
    """Pydantic model for AI evaluation responses using structured outputs"""
    score: float = Field(
        ge=1, 
        le=10, 
        description="Score from 1-10 where 1-3=poor, 4-6=adequate, 7-8=good, 9-10=excellent"
    )
    feedback: str = Field(
        description="Brief feedback explaining the score and highlighting strengths/weaknesses"
    )
    reasoning: str = Field(
        description="Detailed reasoning for the score including specific examples from the response"
    )
    strengths: List[str] = Field(
        description="List of specific strengths in the response"
    )
    areas_for_improvement: List[str] = Field(
        description="List of specific areas where the response could be improved"
    )
    relevance_score: float = Field(
        ge=1, 
        le=10, 
        description="How relevant the response is to the prompt (1-10)"
    )
    clarity_score: float = Field(
        ge=1, 
        le=10, 
        description="How clear and well-structured the response is (1-10)"
    )

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "score": 8.5,
                    "feedback": "Strong response with clear structure and relevant examples",
                    "reasoning": "The response effectively addresses the prompt with specific economic indicators and clear explanations",
                    "strengths": ["Clear structure", "Relevant examples", "Comprehensive coverage"],
                    "areas_for_improvement": ["Could include more recent data", "Might benefit from visual aids"],
                    "relevance_score": 9.0,
                    "clarity_score": 8.5
                }
            ]
        }

class CreateTournamentRequest(BaseModel):
    name: str
    description: str
    question: str
    prompts: List[CreatePromptRequest]

class ScoreRequest(BaseModel):
    tournament_id: str
    prompt_id: str
    score: float
    feedback: Optional[str] = None

class AutoGenerateRequest(BaseModel):
    tournament_id: str
    prompt_id: str
    model: str = "gpt-3.5-turbo"  # Default model

class BulkAutoGenerateRequest(BaseModel):
    tournament_id: str
    model: str = "gpt-3.5-turbo"  # Default model

@app.get("/test-stream")
async def test_stream():
    """Test endpoint for Server-Sent Events"""
    async def test_stream_generator():
        for i in range(5):
            yield f"data: {json.dumps({'message': f'Test message {i+1}', 'timestamp': datetime.now().isoformat()})}\n\n"
            await asyncio.sleep(1)
        yield f"data: {json.dumps({'complete': True})}\n\n"
    
    return StreamingResponse(
        test_stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*"
        }
    )

@app.get("/")
async def root():
    return {"message": "LLM Tournament Widget API"}

@app.get("/tournaments")
async def get_tournaments():
    return list(tournaments.values())

@app.get("/tournaments/{tournament_id}")
async def get_tournament(tournament_id: str):
    global tournaments
    print(f"🔍 Looking for tournament: {tournament_id}")
    print(f"📊 Available tournaments: {list(tournaments.keys())}")
    print(f"📊 Tournaments type: {type(tournaments)}")
    print(f"📊 Tournaments length: {len(tournaments)}")
    
    if tournament_id not in tournaments:
        print(f"❌ Tournament {tournament_id} not found in tournaments dict")
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    print(f"✅ Found tournament: {tournament_id}")
    return tournaments[tournament_id]

@app.post("/tournaments")
async def create_tournament(request: CreateTournamentRequest):
    tournament_id = str(uuid.uuid4())
    
    # Store prompts
    prompt_ids = []
    for prompt_data in request.prompts:
        prompt_id = str(uuid.uuid4())
        prompt = Prompt(
            id=prompt_id,
            name=prompt_data.name,
            content=prompt_data.content,
            description=prompt_data.description
        )
        prompts[prompt_id] = prompt.dict()
        prompt_ids.append(prompt_id)
    
    # Create tournament
    tournament = Tournament(
        id=tournament_id,
        name=request.name,
        description=request.description,
        question=request.question,
        prompt_ids=prompt_ids,
        created_at=datetime.now().isoformat()
    )
    
    tournaments[tournament_id] = tournament.dict()
    
    # Save data to files
    save_data_to_file(PROMPTS_FILE, prompts)
    save_data_to_file(TOURNAMENTS_FILE, tournaments)
    
    return {"tournament_id": tournament_id, "tournament": tournament.dict()}

@app.get("/tournaments/{tournament_id}/prompts")
async def get_tournament_prompts(tournament_id: str):
    if tournament_id not in tournaments:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    tournament = tournaments[tournament_id]
    tournament_prompts = [prompts[pid] for pid in tournament["prompt_ids"] if pid in prompts]
    return tournament_prompts

@app.post("/tournaments/{tournament_id}/auto-generate")
@app.get("/tournaments/{tournament_id}/auto-generate")
async def auto_generate_response(
    tournament_id: str,
    prompt_id: str = Query(..., description="ID of the prompt to generate response for"),
    model: str = Query("gpt-5", description="OpenAI model to use for generation"),
    request: Optional[AutoGenerateRequest] = None
):
    """Automatically generate an LLM response for a prompt using OpenAI"""
    global tournaments, prompts, results
    
    # Handle both GET and POST requests
    if request:
        tournament_id = request.tournament_id
        prompt_id = request.prompt_id
        model = request.model
    
    if not prompt_id:
        raise HTTPException(status_code=400, detail="prompt_id is required")
    
    if tournament_id not in tournaments:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    if prompt_id not in prompts:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    if not openai.api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    try:
        tournament = tournaments[tournament_id]
        prompt = prompts[prompt_id]
        
        print(f"🚀 Starting auto-generation for prompt '{prompt['name']}' using model {model}")
        
        # Construct the full prompt by combining the prompt content with the tournament question
        full_prompt = f"{prompt['content']}\n\nQuestion: {tournament['question']}"
        
        print(f"📝 Full prompt: {full_prompt[:100]}...")
        
                # Try streaming first, fallback to non-streaming if organization not verified
        try:
            print(f"🔄 Attempting streaming response...")
            response = await openai.ChatCompletion.acreate(
                model="gpt-4o-mini",  # Use the more reliable GPT-4o-mini model
                messages=[
                    {"role": "system", "content": "You are a helpful AI assistant. Please provide a comprehensive and well-reasoned response to the following prompt and question."},
                    {"role": "user", "content": full_prompt}
                ],
                max_tokens=1000,  # GPT-4o-mini uses max_tokens, not max_completion_tokens
                stream=True
            )
            
            print(f"✅ OpenAI API streaming call successful, starting stream...")
            
            # Stream the response
            async def generate_stream():
                full_response = ""
                chunk_count = 0
                try:
                    print(f"🔄 Starting to stream response for prompt {prompt_id}...")
                    async for chunk in response:
                        chunk_count += 1
                        print(f"🔍 Processing chunk {chunk_count}: {type(chunk)}")
                        print(f"   Chunk attributes: {dir(chunk)}")
                        
                        if hasattr(chunk, 'choices') and len(chunk.choices) > 0:
                            print(f"   ✅ Chunk has choices: {len(chunk.choices)}")
                            choice = chunk.choices[0]
                            print(f"   Choice attributes: {dir(choice)}")
                            
                            if hasattr(choice, 'delta') and hasattr(choice.delta, 'content'):
                                print(f"   ✅ Choice has delta with content")
                                if choice.delta.content and choice.delta.content.strip():
                                    content = choice.delta.content
                                    full_response += content
                                    print(f"📝 Received token: '{content}' (total length: {len(full_response)})")
                                    # Send each token as it arrives
                                    yield f"data: {json.dumps({'prompt_id': prompt_id, 'token': content, 'full_response': full_response})}\n\n"
                                else:
                                    print(f"   ⚠️ Delta content is empty/falsy: '{choice.delta.content}' (skipping)")
                            else:
                                print(f"   ❌ Choice missing delta or content")
                        else:
                            print(f"   ❌ Chunk missing choices or empty choices")
                    
                    print(f"✅ Streaming completed. Processed {chunk_count} chunks. Final response length: {len(full_response)}")
                    print(f"📄 Response preview: {full_response[:100]}...")
                    
                    # Check if we actually received content
                    if not full_response.strip():
                        print(f"❌ No content received from GPT-5. This might indicate an issue with the model or prompt.")
                        yield f"data: {json.dumps({'error': 'No content received from GPT-5. Please try again.', 'prompt_id': prompt_id})}\n\n"
                        return
                    
                    # Store the complete result
                    result_id = str(uuid.uuid4())
                    result = TournamentResult(
                        id=result_id,
                        tournament_id=tournament_id,
                        prompt_id=prompt_id,
                        response=full_response,
                        created_at=datetime.now().isoformat()
                    )
                    
                    results[result_id] = result.dict()
                    
                    # Save results to file
                    save_data_to_file(RESULTS_FILE, results)
                    
                    print(f"💾 Saved result {result_id} with response length: {len(full_response)}")
                    
                    # Automatically score the response using AI
                    try:
                        print(f"🤖 Auto-scoring generated response {result_id}...")
                        score_request = {
                            "prompt_id": prompt_id,
                            "result_id": result_id
                        }
                        await auto_score_response(tournament_id, score_request)
                        print(f"✅ AI scoring completed for response {result_id}")
                    except Exception as scoring_error:
                        print(f"⚠️ AI scoring failed for response {result_id}: {str(scoring_error)}")
                        # Continue even if scoring fails
                    
                    # Send completion signal
                    yield f"data: {json.dumps({'complete': True, 'result_id': result_id})}\n\n"
                    
                except Exception as e:
                    print(f"Error in generate_stream for prompt {prompt_id}: {str(e)}")
                    
                    # Save partial response if we have any content
                    if full_response.strip():
                        try:
                            result_id = str(uuid.uuid4())
                            result = TournamentResult(
                                id=result_id,
                                tournament_id=tournament_id,
                                prompt_id=prompt_id,
                                response=full_response + "\n\n[Response was cut off due to an error]",
                                created_at=datetime.now().isoformat()
                            )
                            results[result_id] = result.dict()
                            
                            # Save partial results to file
                            save_data_to_file(RESULTS_FILE, results)
                            
                            # Send partial completion signal
                            yield f"data: {json.dumps({'partial_complete': True, 'result_id': result_id, 'message': 'Response saved but was cut off due to an error'})}\n\n"
                        except Exception as save_error:
                            print(f"Error saving partial response: {str(save_error)}")
                            yield f"data: {json.dumps({'error': f'Failed to save partial response: {str(e)}', 'prompt_id': prompt_id})}\n\n"
                    else:
                        # Send error signal
                        yield f"data: {json.dumps({'error': str(e), 'prompt_id': prompt_id})}\n\n"
                    
                    # Don't raise here, just log the error
                    print(f"Streaming completed with error for prompt {prompt_id}: {str(e)}")
            
            return StreamingResponse(
                generate_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Methods": "*"
                }
            )
        
        except Exception as streaming_error:
            print(f"⚠️ Streaming failed, falling back to non-streaming: {str(streaming_error)}")
            
            # Fallback to non-streaming
            try:
                print(f"🔄 Attempting non-streaming response...")
                response = await openai.ChatCompletion.acreate(
                    model="gpt-4o-mini",  # Use the more reliable GPT-4o-mini model
                    messages=[
                        {"role": "system", "content": "You are a helpful AI assistant. Please provide a comprehensive and well-reasoned response to the following prompt and question."},
                        {"role": "user", "content": full_prompt}
                    ],
                    max_tokens=1000  # GPT-4o-mini uses max_tokens, not max_completion_tokens
                )
                
                print(f"✅ OpenAI API non-streaming call successful!")
                
                # Get the response content
                full_response = response.choices[0].message.content
                print(f"📝 Received response: {full_response[:100]}...")
                print(f"📊 Response length: {len(full_response)}")
                
                # Store the complete result
                result_id = str(uuid.uuid4())
                result = TournamentResult(
                    id=result_id,
                    tournament_id=tournament_id,
                    prompt_id=prompt_id,
                    response=full_response,
                    created_at=datetime.now().isoformat()
                )
                
                results[result_id] = result.dict()
                
                # Save results to file
                save_data_to_file(RESULTS_FILE, results)
                
                print(f"💾 Saved result {result_id} with response length: {len(full_response)}")
                
                # Automatically score the response using AI
                try:
                    print(f"🤖 Auto-scoring generated response {result_id}...")
                    score_request = {
                        "prompt_id": prompt_id,
                        "result_id": result_id
                    }
                    await auto_score_response(tournament_id, score_request)
                    print(f"✅ AI scoring completed for response {result_id}")
                except Exception as scoring_error:
                    print(f"⚠️ AI scoring failed for response {result_id}: {str(scoring_error)}")
                    # Continue even if scoring fails
                
                # Return the response as a single event
                async def fallback_stream():
                    yield f"data: {json.dumps({'prompt_id': prompt_id, 'full_response': full_response, 'fallback': True})}\n\n"
                    yield f"data: {json.dumps({'complete': True, 'result_id': result_id})}\n\n"
                
                return StreamingResponse(
                    fallback_stream(),
                    media_type="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Headers": "*",
                        "Access-Control-Allow-Methods": "*"
                    }
                )
                
            except Exception as fallback_error:
                print(f"❌ Both streaming and fallback failed: {str(fallback_error)}")
                raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(fallback_error)}")
        
    except openai.error.OpenAIError as e:
        print(f"❌ OpenAI API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")
    except Exception as e:
        print(f"❌ Unexpected error in auto_generate_response: {str(e)}")
        print(f"   Tournament ID: {tournament_id}")
        print(f"   Prompt ID: {prompt_id}")
        print(f"   Model: {model}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

@app.post("/tournaments/{tournament_id}/auto-generate-all")
@app.get("/tournaments/{tournament_id}/auto-generate-all")
async def auto_generate_all_responses(
    tournament_id: str,
    model: str = Query("gpt-5", description="OpenAI model to use for generation"),
    request: Optional[BulkAutoGenerateRequest] = None
):
    """Automatically generate LLM responses for all prompts in a tournament using OpenAI"""
    # Handle both GET and POST requests
    if request:
        tournament_id = request.tournament_id
        model = request.model
    
    if tournament_id not in tournaments:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    if not openai.api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    tournament = tournaments[tournament_id]
    tournament_prompts = [prompts[pid] for pid in tournament["prompt_ids"] if pid in prompts]
    
    if not tournament_prompts:
        raise HTTPException(status_code=404, detail="No prompts found for tournament")
    
    print(f"🚀 Starting bulk auto-generation for tournament '{tournament['name']}' using model {model}")
    
    async def generate_all_stream():
        generated_results = []
        
        for prompt in tournament_prompts:
            # Check if response already exists
            existing_result = next(
                (r for r in results.values() 
                 if r["tournament_id"] == tournament_id and r["prompt_id"] == prompt["id"]), 
                None
            )
            
            if existing_result:
                generated_results.append({
                    "prompt_id": prompt["id"],
                    "status": "skipped",
                    "message": "Response already exists"
                })
                yield f"data: {json.dumps({'prompt_id': prompt['id'], 'status': 'skipped', 'message': 'Response already exists'})}\n\n"
                continue
            
            # Send start signal for this prompt
            yield f"data: {json.dumps({'prompt_id': prompt['id'], 'status': 'starting'})}\n\n"
            
            try:
                # Construct the full prompt
                full_prompt = f"{prompt['content']}\n\nQuestion: {tournament['question']}"
                
                # Call OpenAI API with streaming
                response = await openai.ChatCompletion.acreate(
                    model="gpt-4o-mini",  # Use the more reliable GPT-4o-mini model
                    messages=[
                        {"role": "system", "content": "You are a helpful AI assistant. Please provide a comprehensive and well-reasoned response to the following prompt and question."},
                        {"role": "user", "content": full_prompt}
                    ],
                    max_tokens=1000,  # GPT-4o-mini uses max_tokens, not max_completion_tokens
                    stream=True
                )
                
                # Stream the response for this prompt
                full_response = ""
                try:
                    async for chunk in response:
                        if hasattr(chunk, 'choices') and len(chunk.choices) > 0:
                            if hasattr(chunk.choices[0], 'delta') and hasattr(chunk.choices[0].delta, 'content'):
                                if chunk.choices[0].delta.content:
                                    content = chunk.choices[0].delta.content
                                    full_response += content
                                    yield f"data: {json.dumps({'prompt_id': prompt['id'], 'token': content, 'full_response': full_response})}\n\n"
                    
                    # Create and store the result
                    result_id = str(uuid.uuid4())
                    result = TournamentResult(
                        id=result_id,
                        tournament_id=tournament_id,
                        prompt_id=prompt["id"],
                        response=full_response,
                        created_at=datetime.now().isoformat()
                    )
                    
                    results[result_id] = result.dict()
                    
                    generated_results.append({
                        "prompt_id": prompt["id"],
                        "status": "generated",
                        "result_id": result_id,
                        "response": full_response
                    })
                    
                    # Save results to file after each successful generation
                    save_data_to_file(RESULTS_FILE, results)
                    
                    # Automatically score the response using AI
                    try:
                        print(f"🤖 Auto-scoring generated response {result_id}...")
                        score_request = {
                            "prompt_id": prompt["id"],
                            "result_id": result_id
                        }
                        await auto_score_response(tournament_id, score_request)
                        print(f"✅ AI scoring completed for response {result_id}")
                    except Exception as scoring_error:
                        print(f"⚠️ AI scoring failed for response {result_id}: {str(scoring_error)}")
                        # Continue even if scoring fails
                    
                    # Send completion signal for this prompt
                    yield f"data: {json.dumps({'prompt_id': prompt['id'], 'status': 'complete', 'result_id': result_id})}\n\n"
                    
                except Exception as e:
                    print(f"Error streaming response for prompt {prompt['id']}: {str(e)}")
                    
                    # Save partial response if we have any content
                    if full_response.strip():
                        try:
                            result_id = str(uuid.uuid4())
                            result = TournamentResult(
                                id=result_id,
                                tournament_id=tournament_id,
                                prompt_id=prompt["id"],
                                response=full_response + "\n\n[Response was cut off due to an error]",
                                created_at=datetime.now().isoformat()
                            )
                            results[result_id] = result.dict()
                            
                            generated_results.append({
                                "prompt_id": prompt["id"],
                                "status": "partial",
                                "result_id": result_id,
                                "response": full_response + "\n\n[Response was cut off due to an error]"
                            })
                            
                            # Save partial results to file
                            save_data_to_file(RESULTS_FILE, results)
                            
                            # Send partial completion signal
                            yield f"data: {json.dumps({'prompt_id': prompt['id'], 'status': 'partial_complete', 'result_id': result_id, 'message': 'Response saved but was cut off due to an error'})}\n\n"
                        except Exception as save_error:
                            print(f"Error saving partial response for prompt {prompt['id']}: {str(save_error)}")
                            generated_results.append({
                                "prompt_id": prompt["id"],
                                "status": "error",
                                "error": f"Failed to save partial response: {str(e)}"
                            })
                            yield f"data: {json.dumps({'prompt_id': prompt['id'], 'status': 'error', 'error': f'Failed to save partial response: {str(e)}'})}\n\n"
                    else:
                        generated_results.append({
                            "prompt_id": prompt["id"],
                            "status": "error",
                            "error": str(e)
                        })
                        yield f"data: {json.dumps({'prompt_id': prompt['id'], 'status': 'error', 'error': str(e)})}\n\n"
                
            except Exception as e:
                print(f"Error setting up OpenAI API call for prompt {prompt['id']}: {str(e)}")
                error_msg = f"Error setting up API call for prompt {prompt['id']}: {str(e)}"
                generated_results.append({
                    "prompt_id": prompt["id"],
                    "status": "error",
                    "error": str(e)
                })
                yield f"data: {json.dumps({'prompt_id': prompt['id'], 'status': 'error', 'error': str(e)})}\n\n"
        
        # Send final summary
        yield f"data: {json.dumps({'complete': True, 'summary': {'total': len(tournament_prompts), 'generated': len([r for r in generated_results if r['status'] == 'generated']), 'skipped': len([r for r in generated_results if r['status'] == 'skipped']), 'errors': len([r for r in generated_results if r['status'] == 'error'])}})}\n\n"
    
    return StreamingResponse(
        generate_all_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*"
        }
    )

@app.post("/tournaments/{tournament_id}/results")
async def submit_result(tournament_id: str, result: TournamentResult):
    if tournament_id not in tournaments:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    result.id = str(uuid.uuid4())
    result.tournament_id = tournament_id
    result.created_at = datetime.now().isoformat()
    
    results[result.id] = result.dict()
    
    # Save results to file
    save_data_to_file(RESULTS_FILE, results)
    
    return {"result_id": result.id, "result": result.dict()}

@app.post("/tournaments/{tournament_id}/score")
async def score_result(tournament_id: str, score_request: ScoreRequest):
    if tournament_id not in tournaments:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Find the result to score
    result_to_score = None
    for result_id, result in results.items():
        if (result["tournament_id"] == tournament_id and 
            result["prompt_id"] == score_request.prompt_id):
            result_to_score = result
            break
    
    if not result_to_score:
        raise HTTPException(status_code=404, detail="Result not found")
    
    # Update the result with score and feedback
    result_to_score["score"] = score_request.score
    result_to_score["feedback"] = score_request.feedback
    results[result_id] = result_to_score
    
    # Save updated results to file
    save_data_to_file(RESULTS_FILE, results)
    
    return {"message": "Score updated successfully"}

@app.post("/tournaments/{tournament_id}/auto-score")
async def auto_score_response(
    tournament_id: str,
    request: dict
):
    """Automatically score a response using AI evaluation with structured outputs"""
    if tournament_id not in tournaments:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    if not openai.api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    tournament = tournaments[tournament_id]
    prompt_id = request.get("prompt_id")
    result_id = request.get("result_id")
    
    if not prompt_id or not result_id:
        raise HTTPException(status_code=400, detail="prompt_id and result_id are required")
    
    # Find the result to score
    result = results.get(result_id)
    if not result or result["tournament_id"] != tournament_id or result["prompt_id"] != prompt_id:
        raise HTTPException(status_code=404, detail="Result not found")
    
    # Find the prompt for context
    prompt = prompts.get(prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    try:
        # Use GPT-4o-mini for evaluation (more reliable than GPT-5)
        response = await openai.ChatCompletion.acreate(
            model="gpt-4o-mini",  # Use GPT-4o-mini for reliable evaluation
            messages=[
                {
                    "role": "system", 
                    "content": "You are an expert AI evaluator. Evaluate responses based on quality, relevance, clarity, and completeness. Always provide constructive feedback."
                },
                {
                    "role": "user", 
                    "content": f"""
Tournament Question: {tournament['question']}
Prompt: {prompt['content']}
Response to Evaluate: {result['response']}

Please evaluate this response and provide:
1. A score from 1-10 (where 1-3=poor, 4-6=adequate, 7-8=good, 9-10=excellent)
2. Brief feedback explaining the score
3. 2-3 specific strengths
4. 2-3 areas for improvement

Format your response as a simple text evaluation.
"""
                }
            ],
            max_tokens=500  # GPT-4o-mini uses max_tokens
        )
        
        # Parse the AI evaluation response
        ai_feedback = response.choices[0].message.content
        
        try:
            # Simple parsing of the text response
            # Extract score (look for a number 1-10)
            import re
            score_match = re.search(r'(\d+(?:\.\d+)?)/10|score[:\s]*(\d+(?:\.\d+)?)', ai_feedback.lower())
            if score_match:
                score = float(score_match.group(1) or score_match.group(2))
                score = max(1, min(10, score))  # Clamp between 1-10
            else:
                score = 7.0  # Default score if none found
            
            # Use the full AI feedback as the feedback text
            feedback = ai_feedback
            
            # Update the result with AI score and feedback
            result["score"] = score
            result["feedback"] = feedback
            result["ai_evaluated"] = True
            result["evaluation_timestamp"] = datetime.now().isoformat()
            
            # Save updated results to file
            save_data_to_file(RESULTS_FILE, results)
            
            print(f"🤖 AI scored result {result_id} with score {score}/10")
            
            return {
                "result_id": result_id,
                "score": score,
                "feedback": feedback,
                "ai_evaluated": True
            }
            
        except Exception as e:
            print(f"Error parsing AI scoring response: {str(e)}")
            # Fallback to basic scoring
            score = 7.0
            feedback = f"AI Evaluation completed with fallback scoring. Raw response: {ai_feedback[:200]}..."
            
            result["score"] = score
            result["feedback"] = feedback
            result["ai_evaluated"] = True
            result["evaluation_timestamp"] = datetime.now().isoformat()
            
            save_data_to_file(RESULTS_FILE, results)
            
            return {
                "result_id": result_id,
                "score": score,
                "feedback": feedback,
                "reasoning": reasoning,
                "ai_evaluated": True
            }
        except Exception as validation_error:
            print(f"Pydantic validation error in AI scoring: {str(validation_error)}")
            # Fallback to basic scoring if validation fails
            score = 5
            feedback = f"AI Evaluation completed with fallback scoring. Validation error: {str(validation_error)}"
            reasoning = "Automated scoring with fallback due to validation error"
            
            result["score"] = score
            result["feedback"] = feedback
            result["ai_evaluated"] = True
            result["evaluation_timestamp"] = datetime.now().isoformat()
            
            save_data_to_file(RESULTS_FILE, results)
            
            return {
                "result_id": result_id,
                "score": score,
                "feedback": feedback,
                "reasoning": reasoning,
                "ai_evaluated": True
            }
        
    except Exception as e:
        print(f"Error in AI scoring: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI scoring failed: {str(e)}")

@app.post("/tournaments/{tournament_id}/auto-score-all")
async def auto_score_all_responses(tournament_id: str):
    """Automatically score all unscored responses in a tournament"""
    if tournament_id not in tournaments:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    if not openai.api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    tournament = tournaments[tournament_id]
    
    # Find all unscored results for this tournament
    unscored_results = [
        result for result in results.values()
        if result["tournament_id"] == tournament_id and result.get("score") is None
    ]
    
    if not unscored_results:
        return {"message": "All responses are already scored", "scored_count": 0}
    
    scored_count = 0
    failed_count = 0
    
    for result in unscored_results:
        try:
            # Score each result
            request_data = {
                "prompt_id": result["prompt_id"],
                "result_id": result["id"]
            }
            
            # Call the auto-score endpoint
            score_response = await auto_score_response(tournament_id, request_data)
            scored_count += 1
            
            # Small delay to avoid rate limiting
            await asyncio.sleep(0.5)
            
        except Exception as e:
            print(f"Failed to score result {result['id']}: {str(e)}")
            failed_count += 1
    
    # Save all updated results
    save_data_to_file(RESULTS_FILE, results)
    
    return {
        "message": f"AI scoring completed",
        "total_unscored": len(unscored_results),
        "scored_count": scored_count,
        "failed_count": failed_count
    }

@app.get("/tournaments/{tournament_id}/results")
async def get_tournament_results(tournament_id: str):
    if tournament_id not in tournaments:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    tournament_results = [
        result for result in results.values() 
        if result["tournament_id"] == tournament_id
    ]
    return tournament_results

@app.get("/tournaments/{tournament_id}/leaderboard")
async def get_tournament_leaderboard(tournament_id: str):
    if tournament_id not in tournaments:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    tournament_results = [
        result for result in results.values() 
        if result["tournament_id"] == tournament_id and result["score"] is not None
    ]
    
    # Sort by score (highest first)
    tournament_results.sort(key=lambda x: x["score"], reverse=True)
    
    # Add prompt information to each result
    for result in tournament_results:
        if result["prompt_id"] in prompts:
            result["prompt_name"] = prompts[result["prompt_id"]]["name"]
            result["prompt_content"] = prompts[result["prompt_id"]]["content"]
    
    return tournament_results

@app.delete("/tournaments/{tournament_id}")
async def delete_tournament(tournament_id: str):
    """Delete a tournament and all associated prompts and results"""
    if tournament_id not in tournaments:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    tournament = tournaments[tournament_id]
    
    # Get all prompt IDs for this tournament
    prompt_ids = tournament.get("prompt_ids", [])
    
    # Delete all results for this tournament
    results_to_delete = []
    for result_id, result in results.items():
        if result["tournament_id"] == tournament_id:
            results_to_delete.append(result_id)
    
    for result_id in results_to_delete:
        del results[result_id]
    
    # Delete all prompts for this tournament
    for prompt_id in prompt_ids:
        if prompt_id in prompts:
            del prompts[prompt_id]
    
    # Delete the tournament
    del tournaments[tournament_id]
    
    # Save updated data to files
    save_data_to_file(TOURNAMENTS_FILE, tournaments)
    save_data_to_file(PROMPTS_FILE, prompts)
    save_data_to_file(RESULTS_FILE, results)
    
    print(f"🗑️  Deleted tournament '{tournament.get('name', tournament_id)}' with {len(prompt_ids)} prompts and {len(results_to_delete)} results")
    
    return {"message": f"Tournament '{tournament.get('name', tournament_id)}' deleted successfully"}

@app.delete("/tournaments/{tournament_id}/prompts/{prompt_id}")
async def delete_prompt_from_tournament(
    tournament_id: str,
    prompt_id: str
):
    """Delete a prompt from a tournament"""
    try:
        if tournament_id not in tournaments:
            raise HTTPException(status_code=404, detail="Tournament not found")
        
        if prompt_id not in prompts:
            raise HTTPException(status_code=404, detail="Prompt not found")
        
        # Verify the prompt belongs to this tournament
        prompt = prompts[prompt_id]
        if prompt.get("tournament_id") != tournament_id:
            raise HTTPException(status_code=400, detail="Prompt does not belong to this tournament")
        
        # Get prompt name for logging
        prompt_name = prompt.get("name", "Unknown prompt")
        
        # Remove the prompt from prompts dictionary
        del prompts[prompt_id]
        
        # Remove the prompt ID from the tournament's prompt_ids list
        if "prompt_ids" in tournaments[tournament_id]:
            tournaments[tournament_id]["prompt_ids"] = [
                pid for pid in tournaments[tournament_id]["prompt_ids"] 
                if pid != prompt_id
            ]
        
        # Delete all results associated with this prompt
        results_to_delete = [
            result_id for result_id, result in results.items()
            if result.get("prompt_id") == prompt_id
        ]
        
        for result_id in results_to_delete:
            del results[result_id]
        
        # Save updated data to files
        save_data_to_file(PROMPTS_FILE, prompts)
        save_data_to_file(TOURNAMENTS_FILE, tournaments)
        save_data_to_file(RESULTS_FILE, results)
        
        print(f"🗑️ Deleted prompt '{prompt_name}' from tournament '{tournaments[tournament_id]['name']}'")
        print(f"   Also deleted {len(results_to_delete)} associated results")
        
        return {"message": f"Prompt '{prompt_name}' deleted successfully", "deleted_results": len(results_to_delete)}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting prompt {prompt_id} from tournament {tournament_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete prompt: {str(e)}")

@app.get("/ai-evaluation-schema")
async def get_ai_evaluation_schema():
    """Get the JSON schema for AI evaluation responses"""
    return {
        "schema": AIEvaluationResponse.schema(),
        "description": "Schema for AI evaluation responses using structured outputs",
        "model_info": {
            "name": "AIEvaluationResponse",
            "fields": list(AIEvaluationResponse.__fields__.keys()),
            "required_fields": [field for field, info in AIEvaluationResponse.__fields__.items() if info.required]
        }
    }

@app.post("/tournaments/{tournament_id}/prompts")
async def add_prompt_to_tournament(
    tournament_id: str,
    prompt: Prompt
):
    """Add a new prompt to an existing tournament"""
    try:
        if tournament_id not in tournaments:
            raise HTTPException(status_code=404, detail="Tournament not found")
        
        # Validate prompt data
        if not prompt.name or not prompt.name.strip():
            raise HTTPException(status_code=400, detail="Prompt name is required")
        
        if not prompt.content or not prompt.content.strip():
            raise HTTPException(status_code=400, detail="Prompt content is required")
        
        # Generate a unique ID for the prompt
        prompt_id = str(uuid.uuid4())
        
        # Create the prompt data dictionary - use the same format as original prompts
        prompt_data = {
            "id": prompt_id,
            "name": prompt.name.strip(),
            "content": prompt.content.strip(),
            "description": prompt.description or ""  # Ensure description is always present
        }
        
        # Add the prompt to the prompts dictionary
        prompts[prompt_id] = prompt_data
        
        # Add the prompt ID to the tournament's prompt_ids list
        if "prompt_ids" not in tournaments[tournament_id]:
            tournaments[tournament_id]["prompt_ids"] = []
        
        tournaments[tournament_id]["prompt_ids"].append(prompt_id)
        
        # Save updated data to files
        save_data_to_file(PROMPTS_FILE, prompts)
        save_data_to_file(TOURNAMENTS_FILE, tournaments)
        
        print(f"📝 Added prompt '{prompt.name}' to tournament '{tournaments[tournament_id]['name']}'")
        
        return {"prompt_id": prompt_id, "prompt": prompt_data}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error adding prompt to tournament {tournament_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add prompt: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
