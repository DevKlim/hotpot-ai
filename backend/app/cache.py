# backend/app/cache.py
from typing import Dict, Optional, List
from .models import Dish, IngredientDetail
import logging
import json

recipe_cache: Dict[str, Dish] = {}
logger = logging.getLogger(__name__)

def get_cache_key(ingredients: List[IngredientDetail], method: str, method_effect: Optional[str]) -> str:
    """Generates a consistent cache key incorporating quantities, units, tags, and recipes."""
    # Sort ingredients by name first for consistency
    sorted_ingredients = sorted(ingredients, key=lambda x: x.name.lower().strip())

    # Create a serializable representation including optional fields
    ingredients_serializable = []
    for ing in sorted_ingredients:
        ing_dict = {
            "name": ing.name.lower().strip(),
            "quantity": str(ing.quantity), # Use string for float stability
            "unit": ing.unit.lower().strip()
        }
        # Add tag and recipe only if they exist to keep keys cleaner/consistent
        if ing.tag:
            ing_dict["tag"] = ing.tag.lower().strip()
        if ing.recipe:
            # Ensure recipe dict itself is sorted for key consistency
            try:
                # Attempt to sort the recipe dict keys, might fail if complex types
                sorted_recipe_str = json.dumps(ing.recipe, sort_keys=True)
                ing_dict["recipe"] = sorted_recipe_str
            except TypeError:
                 # Fallback if recipe is not easily sortable (e.g., contains complex objects)
                 # Warning: This might lead to cache misses if dict order changes but content is same
                 ing_dict["recipe"] = json.dumps(ing.recipe) # Use unsorted recipe dict
                 logger.warning(f"Recipe for {ing.name} could not be sorted for cache key, using unsorted.")

        ingredients_serializable.append(ing_dict)

    # Use JSON dumps with sorted keys for the list of ingredients itself
    ingredients_str = json.dumps(ingredients_serializable, sort_keys=True)

    method_str = method.lower().strip()
    effect_str = method_effect.lower().strip() if method_effect else "none"
    key = f"{ingredients_str}|{method_str}|{effect_str}"
    # logger.debug(f"Generated Cache Key: {key}") # Optional: Log the key for debugging
    return key


# get_cached_dish and add_dish_to_cache should work correctly
# as long as the Dish model they store/retrieve is up-to-date
# and the key generation is consistent.

def get_cached_dish(ingredients: List[IngredientDetail], method: str, method_effect: Optional[str]) -> Optional[Dish]:
    key = get_cache_key(ingredients, method, method_effect)
    dish = recipe_cache.get(key)
    if dish:
        logger.info(f"Cache hit for key: {key}")
        return dish.copy(deep=True)
    logger.info(f"Cache miss for key: {key}")
    return None

def add_dish_to_cache(ingredients: List[IngredientDetail], method: str, method_effect: Optional[str], dish: Dish):
    key = get_cache_key(ingredients, method, method_effect)
    recipe_cache[key] = dish.copy(deep=True)
    logger.info(f"Added to cache key: {key} -> {dish.name}")