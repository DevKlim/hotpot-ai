# backend/app/main.py
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import logging

# Ensure necessary imports are present
from .models import CookRequest, CookResponse, Dish, IngredientDetail # Added IngredientDetail
from .llm_handler import generate_dish_idea
from .cache import get_cached_dish, add_dish_to_cache

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Hotpot.AI API - v0.3") # Updated title

# Keep origins as they are, or update if needed
origins = [
    "http://localhost",
    "http://localhost:8000", # Default python http.server port
    "http://127.0.0.1",
    "http://127.0.0.1:8000",
    "https://hotpotai.netlify.app", # Example deployment URL
    # Add your actual Netlify URL if different
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/cook", response_model=CookResponse)
async def cook_combination(request: CookRequest): # Request model validation handles min_items now
    """
    Handles a cooking request with ingredient amounts. Checks cache first, then calls LLM if needed.
    (Removed explicit ingredient count limit)
    """
    logger.info(f"--- /cook endpoint hit ---")
    log_ingredients = ', '.join([f"{ing.name} ({ing.quantity} {ing.unit})" for ing in request.ingredients])
    logger.info(f"Received cook request: Ingredients=[{log_ingredients}], Method={request.method}, Effect={request.method_effect}")

    # REMOVE this explicit check, Pydantic handles min_items=1 and max_items is removed
    # if not request.ingredients or not request.method:
    #     logger.warning("Received empty ingredients or method.")
    #     raise HTTPException(status_code=400, detail="Ingredients and method are required.")
    # if len(request.ingredients) > 5: # REMOVED THIS CHECK
    #      raise HTTPException(status_code=400, detail="Maximum 5 ingredients allowed.")

    # 1. Check cache
    cached_dish = get_cached_dish(request.ingredients, request.method, request.method_effect)
    if cached_dish:
        cached_dish.is_new_discovery = False
        logger.info(f"Returning cached dish: {cached_dish.name}")
        return CookResponse(success=True, dish=cached_dish)

    # 2. If not in cache, call LLM
    logger.info("Cache miss, calling LLM...")
    try:
        generated_dish = generate_dish_idea(request.ingredients, request.method, request.method_effect)

        if generated_dish:
            # 3. Add to cache
            add_dish_to_cache(request.ingredients, request.method, request.method_effect, generated_dish)
            logger.info(f"Returning newly generated dish: {generated_dish.name}")
            return CookResponse(success=True, dish=generated_dish)
        else:
            logger.error("LLM generation failed or returned None/invalid format.")
            fallback_dish = Dish(
                name="Dubious Mess",
                modifier=None,
                description="Something went wrong in the cosmic kitchen. The result is... questionable.",
                quality="Dubious",
                rationale="LLM failed to generate a valid result for this combination.",
                is_new_discovery=True
            )
            add_dish_to_cache(request.ingredients, request.method, request.method_effect, fallback_dish)
            return CookResponse(success=True, dish=fallback_dish)

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception("An unexpected error occurred during cooking.")
        raise HTTPException(status_code=500, detail=f"Internal server error during cooking.")

@app.get("/")
async def read_root():
    return {"message": "Welcome to the Hotpot.AI Backend! v0.3 - Now with quantities and macros!"}

@app.get("/cache-view")
async def view_cache():
    # Be cautious exposing cache in production
    from .cache import recipe_cache
    # Limit the size or complexity if it gets large
    return recipe_cache

# Remember to update requirements.txt if any new libraries were added (though none were in this step)
# pip freeze > requirements.txt