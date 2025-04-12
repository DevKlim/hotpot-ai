# backend/app/cache.py
from typing import Dict, Optional
from .models import Dish
import logging

recipe_cache: Dict[str, Dish] = {}
logger = logging.getLogger(__name__)

def get_cache_key(ingredients: list[str], method: str, method_effect: Optional[str]) -> str: # Added method_effect
    """Generates a consistent cache key."""
    sorted_ingredients = sorted([ing.lower().strip() for ing in ingredients])
    ingredients_str = ','.join(sorted_ingredients)
    method_str = method.lower().strip()
    effect_str = method_effect.lower().strip() if method_effect else "none" # Handle None case
    return f"{ingredients_str}|{method_str}|{effect_str}" # Added effect to key

def get_cached_dish(ingredients: list[str], method: str, method_effect: Optional[str]) -> Optional[Dish]: # Added method_effect
    """Looks up a dish in the cache."""
    key = get_cache_key(ingredients, method, method_effect) # Pass method_effect
    dish = recipe_cache.get(key)
    if dish:
        logger.info(f"Cache hit for key: {key}")
        return dish.copy(deep=True)
    logger.info(f"Cache miss for key: {key}")
    return None

def add_dish_to_cache(ingredients: list[str], method: str, method_effect: Optional[str], dish: Dish): # Added method_effect
    """Adds a newly discovered dish to the cache."""
    key = get_cache_key(ingredients, method, method_effect) # Pass method_effect
    recipe_cache[key] = dish.copy(deep=True)
    logger.info(f"Added to cache key: {key} -> {dish.name}")

# Example pre-filled cache entries (update if needed)
# add_dish_to_cache(['flour', 'water'], 'mix', 'until combined', Dish(name="Simple Dough", description="A basic, sticky dough.", quality="Poor"))