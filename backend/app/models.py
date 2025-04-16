# backend/app/models.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

# Define a structure for the recipe if needed, or use Dict[str, Any]
# class RecipeDetail(BaseModel):
#     ingredients: List[Dict[str, Any]] # Or List[IngredientDetail] if recursive structure allowed/needed
#     method: str
#     method_effect: Optional[str] = None

class IngredientDetail(BaseModel):
    name: str
    quantity: float = Field(..., gt=0)
    unit: str
    # NEW: Add type field, default to 'base' if not provided by frontend
    type: str = 'base'
    recipe: Optional[Dict[str, Any]] = None
    tag: Optional[str] = None

class CookRequest(BaseModel):
    ingredients: List[IngredientDetail] = Field(..., min_items=1)
    method: str
    method_effect: Optional[str] = None

class Dish(BaseModel):
    name: str
    modifier: Optional[str] = None
    description: str
    quality: str
    is_new_discovery: bool = False
    calories: Optional[float] = None
    protein: Optional[float] = None
    fat: Optional[float] = None
    carbohydrates: Optional[float] = None
    rationale: Optional[str] = None

class CookResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    dish: Optional[Dish] = None