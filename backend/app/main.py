# backend/app/main.py
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import logging

# Make sure Dish model is imported correctly if needed elsewhere, though not directly used here
from .models import CookRequest, CookResponse, Dish
from .llm_handler import generate_dish_idea
from .cache import get_cached_dish, add_dish_to_cache

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Hotpot.AI API")

origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://127.0.0.1",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/cook", response_model=CookResponse)
async def cook_combination(request: CookRequest): # Request now includes method_effect
    """
    Handles a cooking request. Checks cache first, then calls LLM if needed.
    """
    logger.info(f"--- /cook endpoint hit ---")
    logger.info(f"Received cook request: Ingredients={request.ingredients}, Method={request.method}, Effect={request.method_effect}")

    if not request.ingredients or not request.method:
        logger.warning("Received empty ingredients or method.")
        raise HTTPException(status_code=400, detail="Ingredients and method are required.")

    if len(request.ingredients) > 5: # Keep limit for now
         raise HTTPException(status_code=400, detail="Maximum 5 ingredients allowed.")

    # 1. Check cache (pass method_effect)
    cached_dish = get_cached_dish(request.ingredients, request.method, request.method_effect)
    if cached_dish:
        cached_dish.is_new_discovery = False
        logger.info(f"Returning cached dish: {cached_dish.name}")
        return CookResponse(success=True, dish=cached_dish)

    # 2. If not in cache, call LLM (pass method_effect)
    logger.info("Cache miss, calling LLM...")
    try:
        generated_dish = generate_dish_idea(request.ingredients, request.method, request.method_effect)

        if generated_dish:
            # 3. Add to cache (pass method_effect)
            add_dish_to_cache(request.ingredients, request.method, request.method_effect, generated_dish)
            logger.info(f"Returning newly generated dish: {generated_dish.name}")
            return CookResponse(success=True, dish=generated_dish)
        else:
            logger.error("LLM generation failed or returned invalid format.")
            # Fallback dish
            dubious_dish = Dish(
                name="Dubious Food",
                modifier=None, # Added modifier
                description="An unappetizing-looking meal that's safe, but only just.",
                quality="Dubious",
                is_new_discovery=True
            )
            # Cache the failure state too
            add_dish_to_cache(request.ingredients, request.method, request.method_effect, dubious_dish)
            return CookResponse(success=True, dish=dubious_dish)

    except Exception as e:
        logger.exception("An unexpected error occurred during cooking.")
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

@app.get("/")
async def read_root():
    return {"message": "Welcome to the Hotpot.AI Backend!"}

@app.get("/cache-view")
async def view_cache():
    from .cache import recipe_cache
    return recipe_cache