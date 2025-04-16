# backend/app/llm_handler.py
import google.generativeai as genai
import os
import logging
from dotenv import load_dotenv
from .models import Dish, IngredientDetail # Ensure IngredientDetail is imported
import re
from typing import Optional, List, Dict, Any # Added Dict, Any

# ... (load_dotenv, logger setup, API Key check, genai configure) ...
load_dotenv()
logger = logging.getLogger(__name__)

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    logger.error("GEMINI_API_KEY not found.")
    raise ValueError("API Key not configured.")
else:
    try:
        genai.configure(api_key=API_KEY)
    except Exception as e:
        logger.error(f"Failed to configure Gemini: {e}")
        raise

generation_config = {
    "temperature": 0.7,
    "top_p": 0.95,
    "top_k": 0,
    "max_output_tokens": 400, # Increased slightly more for potential recipe details
}

safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    generation_config=generation_config,
    safety_settings=safety_settings
)


# --- REVISED PROMPT V3 ---

# Helper to format recipe details concisely for the prompt
def format_recipe_for_prompt(recipe: Optional[Dict[str, Any]]) -> str:
    if not recipe or not recipe.get('ingredients'):
        return ""
    ings = ", ".join([f"{i.get('name', '?')} ({i.get('quantity', '?')} {i.get('unit', '?')})" for i in recipe['ingredients']])
    method = recipe.get('method', '?')
    effect = recipe.get('method_effect', '')
    return f" (made from: {ings} via {method}{f' [{effect}]' if effect else ''})"

def generate_dish_idea(ingredients: List[IngredientDetail], method: str, method_effect: Optional[str]) -> Optional[Dish]:
    """
    Uses Gemini API to generate a dish considering ingredient amounts, tags, and lineage (recipe).
    Prioritizes real recipes if applicable. Returns a Dish object or None.
    """
    # Format ingredients including tags and concise recipe summaries
    ingredient_list_str_parts = []
    for ing in ingredients:
        recipe_summary = format_recipe_for_prompt(ing.recipe) if ing.type != 'base' else ""
        tag_str = f" ({ing.tag})" if ing.tag else ""
        ingredient_list_str_parts.append(f"{ing.name}{tag_str} ({ing.quantity} {ing.unit}){recipe_summary}")
    ingredient_list_str = "; ".join(ingredient_list_str_parts) # Use semicolon to separate complex ingredients

    method_effect_str = f" ({method_effect})" if method_effect else ""

    prompt = f"""You are an eccentric but exacting culinary AI judge. Your goal is to predict the realistic culinary outcome of combining specific ingredients (with amounts, tags, and potentially their own creation recipe) using a particular cooking method. Base the outcome on real-world cooking, BUT describe it with a quirky, funny, or slightly absurd tone.

    CRITICAL RULES:
    1.  **Real Recipe Check FIRST:** Before anything else, determine if the exact combination of ingredients (considering their lineage if provided), amounts, and method strongly correspond to a known, real-world recipe. If yes, identify THAT recipe as the 'Name', assign 'Good' or 'Excellent' quality, and provide an accurate (but quirky) 'Description' and 'Rationale' mentioning the identified recipe. The user might have stumbled upon it accidentally!
    2.  **Ingredient Lineage:** If an ingredient includes '(made from: ...)', use that information. The original components matter for the final reaction.
    3.  **Amounts & Ratios Matter:** Be HARSH but fair. Incorrect ratios (too much salt, not enough liquid), strange combinations for the method, or nonsensical inputs drastically lower the 'Quality'. Explain this clearly in the 'Rationale'.
    4.  **Tags Matter:** Consider ingredient tags (e.g., 'Basic', 'Fine', 'Rough') if provided. 'Rough Dough' + 'Bake' might yield a different result than 'Fine Dough' + 'Bake'.
    5.  **Goofy but Accurate Description:** The 'Description' MUST be humorous/quirky/weird, BUT it must accurately reflect the *physical state* and likely taste/texture of the predicted outcome based on the inputs.
    6.  **Macro Estimation:** *Estimate* macros (Calories, Protein(g), Fat(g), Carbohydrates(g)) for the *total* result. Prefix with "Approx. ". Use "N/A" if impossible (e.g., rocks) or highly uncertain. Account for ingredient lineage if possible.
    7.  **Clear Rationale:** Briefly explain *why* the combination resulted in the given Quality, citing specific issues like ratios, technique mismatch, ingredient incompatibility, OR successful execution / real recipe identification.
    8.  **Output Format:** STRICTLY adhere to this format (including labels):

        Name: [Generated Name or Identified Real Recipe Name]
        Modifier: [Generated Modifier or None]
        Description: [Funny/Quirky Description reflecting the outcome]
        Quality: [Poor/Decent/Good/Excellent/Dubious]
        Rationale: [Explanation for quality, mentioning real recipe if applicable]
        Calories: [Approx. XXX kcal or N/A]
        Protein: [Approx. XX g or N/A]
        Fat: [Approx. XX g or N/A]
        Carbohydrates: [Approx. XX g or N/A]

    EXAMPLES:

    Ingredients: Simple Dough (Basic) (500 g) (made from: Flour (500 g), Water (300 ml), Salt (10 g), Yeast (7 g) via Mix & Knead [Until smooth]); Olive Oil (1 tbsp)
    Method: Bake
    Method Effect: at 200C for 25 minutes
    Name: Basic Loaf of Bread
    Modifier: w/ olive oil crust
    Description: It's bread! Puffy, golden, and probably edible. Smells less like alien putty now. Just don't expect artisanal perfection from its humble beginnings.
    Quality: Good
    Rationale: Successfully baked the provided basic dough, resulting in a standard loaf of bread. Olive oil adds minor flavor.
    Calories: Approx. 1900 kcal
    Protein: Approx. 56 g
    Fat: Approx. 20 g
    Carbohydrates: Approx. 375 g

    Ingredients: Flour (150 g); Sugar (300 g); Butter (100 g); Egg (1 pcs); Salt (20 g)
    Method: Cream
    Method Effect: butter and sugar, then mix others
    Name: Salty Cookie Dough Disaster
    Modifier: w/ excessive salt
    Description: A grainy, greasy blob weeping butter and radiating pure saltiness. Looks less like dough, more like a cry for help. Baking this might yield salt crystals you could weaponize.
    Quality: Poor
    Rationale: The salt-to-flour ratio (20g salt to 150g flour) is extremely high, making it inedible. Sugar ratio is also very high.
    Calories: Approx. 2200 kcal
    Protein: Approx. 15 g
    Fat: Approx. 90 g
    Carbohydrates: Approx. 330 g

    Ingredients: Egg (2 pcs); Milk (50 ml); Cheese (30 g); Butter (10 g)
    Method: Whisk
    Method Effect: Vigorously
    Name: Omelette Base Mixture
    Modifier: w/ milk and cheese
    Description: A bubbly yellow liquid suspiciously speckled with cheese shreds. It dreams of a hot pan and perhaps some questionable fillings.
    Quality: Good
    Rationale: Standard ingredients and ratios for preparing an omelette or scrambled eggs base. Identified real recipe preparation step.
    Calories: Approx. 350 kcal
    Protein: Approx. 20 g
    Fat: Approx. 28 g
    Carbohydrates: Approx. 4 g

    Ingredients: Chicken Breast (200 g); Flour (50 g); Egg Wash (Basic) (50 ml) (made from: Egg (1 pcs), Milk (50 ml) via Whisk [until combined]); Breadcrumbs (100 g)
    Method: Combine
    Method Effect: Coat chicken: flour, then egg, then breadcrumbs
    Name: Breaded Chicken Cutlet (Uncooked)
    Modifier: w/ flour, egg wash, breadcrumbs
    Description: This chicken is now wearing a three-piece suit of potential crispiness. Currently pale and needing a fiery transformation (frying or baking).
    Quality: Good
    Rationale: Correct procedure and ingredients for preparing a standard breaded chicken cutlet, ready for cooking. Uses the provided 'Egg Wash (Basic)'.
    Calories: Approx. 550 kcal
    Protein: Approx. 55 g
    Fat: Approx. 15 g
    Carbohydrates: Approx. 45 g


    NOW, YOUR TASK:
    Ingredients: {ingredient_list_str}
    Method: {method}
    Method Effect: {method_effect if method_effect else 'N/A'}
    """

    try:
        logger.info(f"Sending prompt to Gemini. Ingredients: {ingredient_list_str} | Method: {method} | Effect: {method_effect}")
        response = model.generate_content(prompt)

        if not response.parts:
             feedback_info = f"Feedback: {response.prompt_feedback}" if hasattr(response, 'prompt_feedback') else "No feedback available."
             logger.warning(f"Gemini response has no parts. {feedback_info}")
             if hasattr(response, 'prompt_feedback') and response.prompt_feedback.block_reason:
                 logger.error(f"Content blocked. Reason: {response.prompt_feedback.block_reason}")
             return None

        generated_text = response.text.strip()
        logger.info(f"Gemini raw response:\n---\n{generated_text}\n---")

        # --- Parsing (Keep existing robust parsing logic) ---
        # Use re.DOTALL for multi-line fields like Description and Rationale
        name_match = re.search(r"Name:\s*(.*)", generated_text, re.IGNORECASE)
        modifier_match = re.search(r"Modifier:\s*(.*)", generated_text, re.IGNORECASE)
        desc_match = re.search(r"Description:\s*(.*)", generated_text, re.IGNORECASE | re.DOTALL)
        quality_match = re.search(r"Quality:\s*(Poor|Decent|Good|Excellent|Dubious)", generated_text, re.IGNORECASE)
        rationale_match = re.search(r"Rationale:\s*(.*)", generated_text, re.IGNORECASE | re.DOTALL)
        # Macro parsing remains the same
        calories_match = re.search(r"Calories:\s*Approx\.\s*([\d.]+)\s*kcal", generated_text, re.IGNORECASE)
        protein_match = re.search(r"Protein:\s*Approx\.\s*([\d.]+)\s*g", generated_text, re.IGNORECASE)
        fat_match = re.search(r"Fat:\s*Approx\.\s*([\d.]+)\s*g", generated_text, re.IGNORECASE)
        carbs_match = re.search(r"Carbohydrates:\s*Approx\.\s*([\d.]+)\s*g", generated_text, re.IGNORECASE)
        calories_na_match = re.search(r"Calories:\s*N/A", generated_text, re.IGNORECASE)
        protein_na_match = re.search(r"Protein:\s*N/A", generated_text, re.IGNORECASE)
        fat_na_match = re.search(r"Fat:\s*N/A", generated_text, re.IGNORECASE)
        carbs_na_match = re.search(r"Carbohydrates:\s*N/A", generated_text, re.IGNORECASE)

        if name_match and desc_match and quality_match and rationale_match:
            name = name_match.group(1).strip()
            modifier_raw = modifier_match.group(1).strip() if modifier_match else "None"
            modifier = None if modifier_raw.lower() == 'none' else modifier_raw
            description = desc_match.group(1).strip()
            quality = quality_match.group(1).strip().capitalize()
            rationale = rationale_match.group(1).strip()

            def parse_macro(match, na_match):
                if match:
                    try: return float(match.group(1))
                    except ValueError: return None
                elif na_match: return None
                else: return None

            calories = parse_macro(calories_match, calories_na_match)
            protein = parse_macro(protein_match, protein_na_match)
            fat = parse_macro(fat_match, fat_na_match)
            carbohydrates = parse_macro(carbs_match, carbs_na_match)

            if not name or not description or not rationale:
                logger.warning(f"Failed to parse essential fields from: {generated_text}")
                return None # Return None if essential parts missing

            logger.info(f"Successfully parsed: Name='{name}', Modifier='{modifier}', Quality='{quality}'")
            return Dish(
                name=name, modifier=modifier, description=description, quality=quality,
                rationale=rationale, calories=calories, protein=protein, fat=fat,
                carbohydrates=carbohydrates, is_new_discovery=True
            )
        else:
            logger.warning(f"Could not parse expected format from Gemini response: {generated_text}")
            # Fallback remains necessary
            return Dish(
                name="Mysterious Concoction", modifier=None,
                description="The culinary gods averted their gaze. What this is remains unknown, perhaps wisely.",
                quality="Dubious", rationale="Failed to interpret the combination or LLM response format was invalid.",
                is_new_discovery=True
            )

    except Exception as e:
        logger.exception(f"Error during Gemini API call or processing: {e}")
        return None # Return None on exceptions