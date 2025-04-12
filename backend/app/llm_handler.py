# backend/app/llm_handler.py
import google.generativeai as genai
import os
import logging
from dotenv import load_dotenv
from .models import Dish
import re
from typing import Optional

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
    "temperature": 0.6, # Slightly lower temp for more predictable real-world results
    "top_p": 1,
    "top_k": 1,
    "max_output_tokens": 200, # Increased slightly for potentially longer modifiers/desc
}

safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    generation_config=generation_config,
    safety_settings=safety_settings
)

# --- NEW PROMPT ---
def generate_dish_idea(ingredients: list[str], method: str, method_effect: Optional[str]) -> Optional[Dish]:
    """
    Uses Gemini API to generate a real-world based dish name, modifier, description, and quality.
    Returns a Dish object or None if generation fails.
    """
    ingredient_list = ", ".join(ingredients)
    method_effect_str = f" ({method_effect})" if method_effect else ""

    prompt = f"""You are a knowledgeable home chef focused on real-world culinary techniques and existing dishes.
    When given ingredients, a cooking method, and details on how the method is applied, you determine what common cooking step or intermediate product this resembles, or what simple dish it might create.
    Your goal is to identify a plausible outcome based on standard recipes. If the combination is nonsensical or extremely unconventional for the ingredients, classify it as 'Poor' or 'Dubious'.

    RULES:
    1. Base the result on known culinary practices. Think "What would this combination likely produce in a real kitchen?".
    2. Generate a concise Name for the resulting item (e.g., "Creamed Butter", "Basic Marinara Sauce", "Sauteed Mushrooms", "Unpleasant Sludge").
    3. Generate a Modifier (starting with 'w/' or similar) listing the key *distinguishing* ingredients used, especially if the Name is generic (e.g., "w/ shortening, brown sugar", "w/ garlic and herbs", "w/ egg and flour"). If the name is very specific or it's a simple single-ingredient prep, the modifier might be short or omitted (output "Modifier: None").
    4. Provide a short, factual but quirky Description of the result.
    5. Estimate a Quality: Poor (likely mistake/bad combo), Decent (basic/ok), Good (standard successful step/dish), Excellent (perfect execution/combo), or Dubious (weird but maybe edible).
    6. The output MUST strictly follow this format:
       Name: [Generated Name]
       Modifier: [Generated Modifier or None]
       Description: [Generated Description]
       Quality: [Poor/Decent/Good/Excellent/Dubious]

    EXAMPLES:
    Ingredients: butter, shortening, granulated sugar, brown sugar
    Method: cream
    Method Effect: Until well-combined
    Name: Creamed Butter Mixture
    Modifier: w/ shortening, granulated sugar, brown sugar
    Description: A standard base for cookies or cakes, combining fats and sugars.
    Quality: Good

    Ingredients: canned tomatoes, garlic, oregano
    Method: simmer
    Method Effect: for 20 minutes
    Name: Basic Marinara Sauce Base
    Modifier: w/ garlic and oregano
    Description: A simple tomato sauce foundation, ready for pasta or other dishes.
    Quality: Decent

    Ingredients: mushrooms, butter, garlic
    Method: saute
    Method Effect: until tender
    Name: Sauteed Mushrooms
    Modifier: w/ butter and garlic
    Description: Mushrooms cooked until soft in butter and garlic.
    Quality: Good

    Ingredients: flour, rocks, water
    Method: mix
    Method Effect: vigorously
    Name: Gritty Rock Paste
    Modifier: w/ flour and rocks
    Description: An inedible, abrasive paste likely to damage cookware.
    Quality: Poor

    Ingredients: fish, milk, chocolate chips
    Method: boil
    Method Effect: for 10 minutes
    Name: Dubious Fish Scald
    Modifier: w/ milk and chocolate chips
    Description: A bizarre and unappetizing boiled mixture with conflicting flavors.
    Quality: Dubious

    NOW, YOUR TASK:
    Ingredients: {ingredient_list}
    Method: {method}
    Method Effect: {method_effect if method_effect else 'N/A'}
    """

    try:
        logger.info(f"Sending prompt to Gemini for: {ingredient_list} | {method} | {method_effect}")
        response = model.generate_content(prompt)

        if not response.parts:
             logger.warning(f"Gemini response has no parts. Feedback: {response.prompt_feedback}")
             return None

        generated_text = response.text.strip()
        logger.info(f"Gemini raw response: {generated_text}")

        # --- UPDATED PARSING ---
        name_match = re.search(r"Name:\s*(.*)", generated_text)
        modifier_match = re.search(r"Modifier:\s*(.*)", generated_text) # Capture modifier
        desc_match = re.search(r"Description:\s*(.*)", generated_text)
        quality_match = re.search(r"Quality:\s*(Poor|Decent|Good|Excellent|Dubious)", generated_text, re.IGNORECASE)

        if name_match and modifier_match and desc_match and quality_match:
            name = name_match.group(1).strip()
            # Handle "None" modifier explicitly
            modifier_raw = modifier_match.group(1).strip()
            modifier = None if modifier_raw.lower() == 'none' else modifier_raw

            description = desc_match.group(1).strip()
            quality = quality_match.group(1).strip().capitalize()

            if not name or not description: # Basic validation
                logger.warning(f"Failed to parse name/description from: {generated_text}")
                return None

            logger.info(f"Successfully parsed: Name='{name}', Modifier='{modifier}', Desc='{description}', Quality='{quality}'")
            return Dish(
                name=name,
                modifier=modifier, # Pass modifier
                description=description,
                quality=quality,
                is_new_discovery=True
            )
        else:
            logger.warning(f"Could not parse expected format from Gemini response: {generated_text}")
            # Fallback remains similar
            return Dish(
                name="Uncertain Result",
                modifier=None,
                description="The outcome of this combination is unclear based on standard cooking.",
                quality="Dubious",
                is_new_discovery=True
            )

    except Exception as e:
        logger.error(f"Error calling Gemini API: {e}")
        return None