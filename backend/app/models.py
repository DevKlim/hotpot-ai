from pydantic import BaseModel
from typing import List, Optional

class CookRequest(BaseModel):
    ingredients: List[str]
    method: str
    method_effect: Optional[str] = None # Added: e.g., "until smooth", "for 5 minutes"

class Dish(BaseModel):
    name: str
    modifier: Optional[str] = None # Added: e.g., "w/ shortening, sugar"
    description: str
    quality: str # e.g., "Unknown", "Poor", "Decent", "Good", "Excellent", "Dubious"
    is_new_discovery: bool = False

class CookResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    dish: Optional[Dish] = None