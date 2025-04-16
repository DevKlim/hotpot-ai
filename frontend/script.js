// frontend/script.js

// --- CONFIGURATION ---
// Ensure this points to your RUNNING backend (local or deployed)
// For local development with backend on port 8001:
let backendUrl;
const hostname = window.location.hostname;

// --- !!! IMPORTANT: REPLACE PLACEHOLDERS BELOW !!! ---

// 1. Define your LOCAL backend URL (usually running on port 8001)
const localApiUrl = 'http://localhost:8001';

// 2. Define your DEPLOYED Render backend URL
//    Replace 'your-render-app-name.onrender.com' with your actual Render URL
const deployedApiUrl = 'https://hotpot-ai-backend.onrender.com'; 

// --- Logic to choose the URL ---
if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // We are running on a local machine
    backendUrl = localApiUrl;
    console.log(`Frontend running locally. Using backend: ${backendUrl}`);
} else {
    // We are running on a deployed site (Netlify, Vercel, etc.)
    backendUrl = deployedApiUrl;
    console.log(`Frontend running on ${hostname}. Using backend: ${backendUrl}`);
}

// --- STATE ---
// UPDATED: availableIngredients now stores objects
let availableIngredients = [
    { name: 'Flour', type: 'base', tag: null, recipe: null },
    { name: 'Water', type: 'base', tag: null, recipe: null },
    { name: 'Salt', type: 'base', tag: null, recipe: null },
    { name: 'Sugar', type: 'base', tag: null, recipe: null },
    { name: 'Butter', type: 'base', tag: null, recipe: null },
    { name: 'Egg', type: 'base', tag: null, recipe: null },
    { name: 'Milk', type: 'base', tag: null, recipe: null },
    { name: 'Oil', type: 'base', tag: null, recipe: null },
    { name: 'Yeast', type: 'base', tag: null, recipe: null },
    { name: 'Chicken Breast', type: 'base', tag: null, recipe: null },
    { name: 'Soy Sauce', type: 'base', tag: null, recipe: null },
    { name: 'Rocks', type: 'base', tag: null, recipe: null }, // Keep rocks for testing :)
    { name: 'Cheese', type: 'base', tag: null, recipe: null }, // Added cheese
    { name: 'Olive Oil', type: 'base', tag: null, recipe: null }, // Added olive oil
    { name: 'Breadcrumbs', type: 'base', tag: null, recipe: null } // Added breadcrumbs
];
let availableMethods = ['Mix', 'Knead', 'Whisk', 'Cream', 'Simmer', 'Saute', 'Boil', 'Fry', 'Marinate', 'Bake', 'Rest', 'Combine', 'Coat']; // Added Combine, Coat

// selectedIngredients stores objects: { id: uniqueId, name: 'Flour', quantity: 100, unit: 'g', originalIngredient: {...} }
let selectedIngredients = [];
let selectedMethod = null; // Stores the name of the selected method
let discoveryLog = new Set(); // Stores unique "Name // Modifier" strings for the session log
let nextIngredientId = 0; // Simple unique ID for managing ingredient elements in the pot

// Global variable to store the recipe data of the last successful cook
let lastCookRecipeData = null;

// --- UI ELEMENTS ---
const ingredientButtonsContainer = document.getElementById('ingredient-buttons');
const methodButtonsContainer = document.getElementById('method-buttons');
const newIngredientInput = document.getElementById('new-ingredient-input');
const addIngredientButton = document.getElementById('add-ingredient-button');
const newMethodInput = document.getElementById('new-method-input');
const addMethodButton = document.getElementById('add-method-button');
const potIngredientsContainer = document.getElementById('pot-ingredients');
const methodEffectInput = document.getElementById('method-effect-input');
const cookButton = document.getElementById('cook-button');
const clearButton = document.getElementById('clear-button');
const loadingIndicator = document.getElementById('loading-indicator');
const resultDisplay = document.getElementById('result-display');
const dishDiscovery = document.getElementById('dish-discovery');
const dishName = document.getElementById('dish-name');
const dishModifier = document.getElementById('dish-modifier');
const dishDescription = document.getElementById('dish-description');
const dishQuality = document.getElementById('dish-quality');
const addResultToIngredientsButton = document.getElementById('add-result-to-ingredients-button');
const inventoryList = document.getElementById('inventory-list');
const potPlaceholder = potIngredientsContainer.querySelector('.placeholder-text');

// NEW UI Elements for Macros and Rationale
const dishRationaleContainer = document.getElementById('dish-rationale-container');
const dishRationale = document.getElementById('dish-rationale');
const dishMacrosContainer = document.getElementById('dish-macros-container');
const dishCalories = document.getElementById('dish-calories');
const dishProtein = document.getElementById('dish-protein');
const dishFat = document.getElementById('dish-fat');
const dishCarbs = document.getElementById('dish-carbs');


// --- FUNCTIONS ---

// UPDATED: Render buttons based on ingredient objects
function renderButtons(container, items, type, clickHandler) {
    container.innerHTML = ''; // Clear existing buttons
    items.forEach(item => {
        const button = document.createElement('button');
        // If item is an object (ingredient), use item.name, otherwise use item (method string)
        const itemName = typeof item === 'object' ? item.name : item;
        const itemTag = (typeof item === 'object' && item.tag) ? item.tag : null; // Get tag only if it exists

        button.textContent = itemName + (itemTag ? ` (${itemTag})` : ''); // Display name and tag if present
        button.classList.add(`${type}-button`, 'item-button');
        button.dataset.name = itemName; // Store the base name for click handler
        button.addEventListener('click', () => clickHandler(itemName)); // Pass base name on click
        container.appendChild(button);
    });
}

// UPDATED: Add new item as an object if it's an ingredient
function addItem(itemType, itemList, inputElement, renderFunc, container, type, clickHandler) {
    const newItemName = inputElement.value.trim();
    if (!newItemName) {
        alert(`${type.charAt(0).toUpperCase() + type.slice(1)} name cannot be empty.`);
        return;
    }

    if (type === 'ingredient') {
        // Check if ingredient NAME already exists
        const exists = itemList.some(ing => ing.name.toLowerCase() === newItemName.toLowerCase());
        if (exists) {
            alert(`Ingredient "${newItemName}" already exists!`);
        } else {
            const newIngredientObject = {
                name: newItemName,
                type: 'base', // Manually added ingredients are considered 'base'
                tag: null,
                recipe: null
            };
            itemList.push(newIngredientObject);
            // Sort objects by name using localeCompare for better sorting
            itemList.sort((a, b) => a.name.localeCompare(b.name));
            renderFunc(container, itemList, type, clickHandler);
            inputElement.value = '';
        }
    } else { // Handle methods (still strings)
        if (itemList.includes(newItemName)) {
             alert(`Method "${newItemName}" already exists!`);
        } else {
             itemList.push(newItemName);
             itemList.sort(); // Simple sort for strings
             renderFunc(container, itemList, type, clickHandler);
             inputElement.value = '';
        }
    }
}


// UPDATED: Handle clicking an available ingredient button
function handleIngredientClick(name) {
    // Find the original ingredient object from the available list
    const originalIngredient = availableIngredients.find(ing => ing.name === name);
    if (!originalIngredient) {
        console.error("Could not find original ingredient object for:", name);
        return; // Should not happen if lists are synced
    }

    // Add to selected list
    const newId = nextIngredientId++;
    const newSelectedIngredient = {
        id: newId,
        name: name,
        quantity: 1, // Default quantity
        unit: 'pcs',   // Default unit
        // Store a reference to the original ingredient object to access its recipe/tag later
        originalIngredient: originalIngredient
    };
    selectedIngredients.push(newSelectedIngredient);
    renderSelectedIngredients();
}

// UPDATED: Render the selected ingredients WITH quantity/unit inputs and tags
function renderSelectedIngredients() {
    potIngredientsContainer.innerHTML = ''; // Clear previous
    if (selectedIngredients.length === 0) {
         if (potPlaceholder) potPlaceholder.style.display = 'block'; // Show placeholder
        return;
    }
     if (potPlaceholder) potPlaceholder.style.display = 'none'; // Hide placeholder

    selectedIngredients.forEach(selIng => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('pot-ingredient-item');
        itemDiv.dataset.id = selIng.id; // Link element to ingredient data

        const nameSpan = document.createElement('span');
        // Display name + tag if the *original* ingredient had one
        const originalTag = selIng.originalIngredient ? selIng.originalIngredient.tag : null;
        nameSpan.textContent = selIng.name + (originalTag ? ` (${originalTag})` : '');
        nameSpan.classList.add('pot-ingredient-name');

        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.value = selIng.quantity;
        quantityInput.min = "0.1"; // Minimum quantity
        quantityInput.step = "0.1"; // Step for decimals
        quantityInput.classList.add('pot-ingredient-quantity');
        quantityInput.addEventListener('change', (e) => updateIngredientQuantity(selIng.id, parseFloat(e.target.value)));
        quantityInput.addEventListener('input', (e) => updateIngredientQuantity(selIng.id, parseFloat(e.target.value))); // Handle live input if needed

        const unitSelect = document.createElement('select');
        unitSelect.classList.add('pot-ingredient-unit');
        const units = ['g', 'kg', 'ml', 'l', 'pcs', 'tsp', 'tbsp', 'cup', 'oz', 'lb']; // Common units
        units.forEach(u => {
            const option = document.createElement('option');
            option.value = u;
            option.textContent = u;
            if (u === selIng.unit) {
                option.selected = true;
            }
            unitSelect.appendChild(option);
        });
        unitSelect.addEventListener('change', (e) => updateIngredientUnit(selIng.id, e.target.value));

        const removeButton = document.createElement('button');
        removeButton.textContent = 'X';
        removeButton.classList.add('pot-ingredient-remove');
        removeButton.addEventListener('click', () => removeIngredient(selIng.id));

        itemDiv.appendChild(nameSpan);
        itemDiv.appendChild(quantityInput);
        itemDiv.appendChild(unitSelect);
        itemDiv.appendChild(removeButton);
        potIngredientsContainer.appendChild(itemDiv);
    });
}

// Update quantity in the state (find selected ingredient by ID)
function updateIngredientQuantity(id, quantity) {
    const ingredient = selectedIngredients.find(ing => ing.id === id);
    if (ingredient && !isNaN(quantity) && quantity > 0) {
        ingredient.quantity = quantity;
        // console.log("Updated quantity:", selectedIngredients); // Debug
    } else if (ingredient) {
         // Maybe reset to 1 if invalid input? Or show validation message.
         // For now, just log it. User can fix via input field.
         console.warn(`Invalid quantity entered for ingredient ID ${id}: ${quantity}`);
         // Ensure the input reflects the last valid state or a default
         const inputElement = potIngredientsContainer.querySelector(`.pot-ingredient-item[data-id='${id}'] .pot-ingredient-quantity`);
         if(inputElement) inputElement.value = ingredient.quantity; // Revert UI on invalid input
    }
}


// Update unit in the state (find selected ingredient by ID)
function updateIngredientUnit(id, unit) {
    const ingredient = selectedIngredients.find(ing => ing.id === id);
    if (ingredient) {
        ingredient.unit = unit;
        // console.log("Updated unit:", selectedIngredients); // Debug
    }
}

// Remove an ingredient from the cooking station
function removeIngredient(id) {
    selectedIngredients = selectedIngredients.filter(ing => ing.id !== id);
    renderSelectedIngredients();
}

// Handle clicking a method button (no change)
function handleMethodClick(name) {
    selectedMethod = name;
    // Visually indicate selection (e.g., add a 'selected' class)
    document.querySelectorAll('.method-button').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.name === name);
    });
}

// Clear the cooking station (no major change)
function clearPot() {
    selectedIngredients = [];
    selectedMethod = null;
    methodEffectInput.value = '';
    renderSelectedIngredients(); // Clears the pot UI
    document.querySelectorAll('.method-button').forEach(btn => btn.classList.remove('selected'));
    resultDisplay.classList.add('hidden'); // Hide previous result
    addResultToIngredientsButton.classList.add('hidden');
    loadingIndicator.classList.add('hidden');
     if (potPlaceholder) potPlaceholder.style.display = 'block'; // Show placeholder again
     lastCookRecipeData = null; // Clear recipe data when clearing pot
}

// UPDATED: Perform the cooking action, sending recipe/tag data
async function cook() {
    if (selectedIngredients.length === 0) {
        alert("Please add at least one ingredient to the pot.");
        return;
    }
     // Validate quantities before sending
    const invalidIngredient = selectedIngredients.find(ing => isNaN(ing.quantity) || ing.quantity <= 0);
    if (invalidIngredient) {
        alert(`Please enter a valid, positive quantity for ${invalidIngredient.name}.`);
        const inputElement = potIngredientsContainer.querySelector(`.pot-ingredient-item[data-id='${invalidIngredient.id}'] .pot-ingredient-quantity`);
        if(inputElement) inputElement.focus();
        return;
    }

    if (!selectedMethod) {
        alert("Please select a cooking method.");
        return;
    }

    // Prepare data for the backend
    const ingredientsForBackend = selectedIngredients.map(selIng => {
        // selIng.originalIngredient holds the reference to the object in availableIngredients
        const originalIng = selIng.originalIngredient; // This is the object {name, type, tag, recipe}
        return {
            name: selIng.name,
            quantity: selIng.quantity,
            unit: selIng.unit,
            // ** ADDED TYPE ** Get type from original ingredient, default to 'base' if somehow missing
            type: (originalIng && originalIng.type) ? originalIng.type : 'base',
            // Include the recipe ONLY if the original ingredient was derived (type != 'base') and has a recipe
            recipe: (originalIng && originalIng.type !== 'base' && originalIng.recipe) ? originalIng.recipe : null,
            // Include tag if present on the original ingredient
            tag: (originalIng) ? originalIng.tag : null
        };
    });

    const cookData = {
        ingredients: ingredientsForBackend,
        method: selectedMethod,
        method_effect: methodEffectInput.value.trim() || null // Send null if empty
    };

    // Store details needed to reconstruct the recipe if this item is added back
    lastCookRecipeData = {
         ingredients: selectedIngredients.map(i => ({ // Store NAME, quantity, unit of ingredients USED
             name: i.name,
             quantity: i.quantity,
             unit: i.unit
         })),
         method: selectedMethod,
         method_effect: methodEffectInput.value.trim() || null
    };


    console.log("Sending data to backend:", JSON.stringify(cookData, null, 2)); // Debug: Log outgoing data

    // Show loading indicator, hide result
    loadingIndicator.classList.remove('hidden');
    resultDisplay.classList.add('hidden');
    cookButton.disabled = true; // Prevent multiple clicks
    clearButton.disabled = true;

    try {
        const response = await fetch(`${backendUrl}/cook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(cookData),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error structure' })); // Catch if response is not JSON
            throw new Error(`HTTP error ${response.status}: ${errorData.detail || 'Failed to fetch'}`);
        }

        const result = await response.json();
        console.log("Received data from backend:", result); // Debug: Log incoming data

        if (result.success && result.dish) {
             // Pass the data required to potentially recreate this item later
            displayResult(result.dish, lastCookRecipeData);
            // Add to discovery log only if it's genuinely new *or* we haven't logged this exact combo before
            const discoveryKey = `${result.dish.name} // ${result.dish.modifier || 'Base'}`;
            if (!discoveryLog.has(discoveryKey)) {
                 discoveryLog.add(discoveryKey);
                 updateDiscoveryLogUI(result.dish);
            }
        } else {
             displayErrorResult(result.message || "Cooking failed for an unknown reason.");
             lastCookRecipeData = null; // Clear recipe data on failure
        }

    } catch (error) {
        console.error("Cooking Error:", error);
        displayErrorResult(`Error: ${error.message}. Is the backend running at ${backendUrl}?`);
        lastCookRecipeData = null; // Clear recipe data on error
    } finally {
        // Hide loading indicator, enable buttons
        loadingIndicator.classList.add('hidden');
        cookButton.disabled = false;
        clearButton.disabled = false;
    }
}

// UPDATED: Display the cooking result and setup button dataset
function displayResult(dish, recipeUsedToMakeDish) {
    // ... (Update dish name, modifier, description, quality, rationale, macros, discovery flash - code remains the same) ...
    dishName.textContent = dish.name || "Unknown Dish";
    dishModifier.textContent = dish.modifier || "";
    dishModifier.style.display = dish.modifier ? 'block' : 'none';
    dishDescription.textContent = dish.description || "No description available.";
    dishQuality.textContent = dish.quality || "Unknown";
    dishQuality.className = `quality-${(dish.quality || 'unknown').toLowerCase()}`;

    if (dish.rationale) {
        dishRationale.textContent = dish.rationale;
        dishRationaleContainer.classList.remove('hidden');
    } else {
        dishRationaleContainer.classList.add('hidden');
    }
    let macrosAvailable = false;
    if (dish.calories !== null) { dishCalories.textContent = `${dish.calories.toFixed(1)} kcal`; macrosAvailable = true; } else { dishCalories.textContent = 'N/A'; }
    if (dish.protein !== null) { dishProtein.textContent = `${dish.protein.toFixed(1)} g`; macrosAvailable = true; } else { dishProtein.textContent = 'N/A'; }
    if (dish.fat !== null) { dishFat.textContent = `${dish.fat.toFixed(1)} g`; macrosAvailable = true; } else { dishFat.textContent = 'N/A'; }
    if (dish.carbohydrates !== null) { dishCarbs.textContent = `${dish.carbohydrates.toFixed(1)} g`; macrosAvailable = true; } else { dishCarbs.textContent = 'N/A'; }
    if (macrosAvailable) { dishMacrosContainer.classList.remove('hidden'); } else { dishMacrosContainer.classList.add('hidden'); }

    if (dish.is_new_discovery) {
        dishDiscovery.textContent = "✨ New Discovery! ✨";
        dishDiscovery.classList.add('new');
        dishDiscovery.classList.remove('cached');
    } else {
        dishDiscovery.textContent = "Previously Discovered";
        dishDiscovery.classList.add('cached');
         dishDiscovery.classList.remove('new');
    }

    resultDisplay.classList.remove('hidden'); // Show result area regardless


    // --- UPDATED: Set up or CLEAR "Add to Ingredients" button ---
    const nameFromResult = dish.name || "";
    const tagMatch = nameFromResult.match(/^(Basic|Simple|Perfect|Rough|Fine|Overly Salty|Dubious|Gritty|Mysterious|Uncertain|Uncooked)\s+/i);
    const tag = tagMatch ? tagMatch[1].trim() : null;
    const baseName = tag ? nameFromResult.replace(tagMatch[0], '').trim() : nameFromResult.trim();
    const alreadyExists = availableIngredients.some(ing => ing.name.toLowerCase() === baseName.toLowerCase());

    // Conditions to show the button
    const shouldShowButton = baseName &&
                             !alreadyExists &&
                             dish.quality !== 'Poor' &&
                             dish.quality !== 'Dubious' &&
                             recipeUsedToMakeDish;

    if (shouldShowButton) {
        addResultToIngredientsButton.textContent = `Add "${baseName}"${tag ? ` (${tag})` : ''} to Ingredients`;
        addResultToIngredientsButton.dataset.baseName = baseName;
        addResultToIngredientsButton.dataset.tag = tag || "";
        try {
            addResultToIngredientsButton.dataset.recipeData = JSON.stringify(recipeUsedToMakeDish);
            addResultToIngredientsButton.classList.remove('hidden'); // Show button
            console.log("Button Setup: Showing button for", baseName);
        } catch (e) {
            console.error("Failed to stringify recipe data for button:", e, recipeUsedToMakeDish);
             // --- If stringify fails, ensure button is hidden and data is cleared ---
            addResultToIngredientsButton.classList.add('hidden');
            delete addResultToIngredientsButton.dataset.baseName;
            delete addResultToIngredientsButton.dataset.tag;
            delete addResultToIngredientsButton.dataset.recipeData;
        }
    } else {
        // --- ENSURE button is hidden AND dataset is cleared if conditions are NOT met ---
        addResultToIngredientsButton.classList.add('hidden');
        delete addResultToIngredientsButton.dataset.baseName;
        delete addResultToIngredientsButton.dataset.tag;
        delete addResultToIngredientsButton.dataset.recipeData;
        // console.log("Button Setup: Hiding button."); // Optional debug log
    }
}



// NEW: Display an error message in the result area
function displayErrorResult(message) {
    dishName.textContent = "Cooking Failed";
    dishModifier.textContent = "";
    dishModifier.style.display = 'none';
    dishDescription.textContent = message || "An unexpected error occurred.";
    dishQuality.textContent = "Error";
    dishQuality.className = 'quality-error';
    dishDiscovery.textContent = "Attempt Failed";
    dishDiscovery.className = 'discovery-flash cached'; // Style as cached/not new

    // Hide optional fields
    dishRationaleContainer.classList.add('hidden');
    dishMacrosContainer.classList.add('hidden');
    addResultToIngredientsButton.classList.add('hidden'); // Ensure button is hidden on error


    resultDisplay.classList.remove('hidden');
     // Clear last recipe data on error display as well
     lastCookRecipeData = null;
}

// Add result to available ingredients as an object with recipe/tag
function addResultToIngredients() {
    const nameToAdd = addResultToIngredientsButton.dataset.baseName;
    const tagToAdd = addResultToIngredientsButton.dataset.tag || null; // Get tag, default to null if empty string
    const recipeDataString = addResultToIngredientsButton.dataset.recipeData;

    console.log("Add Button Clicked: Name=", nameToAdd, "Tag=", tagToAdd, "Recipe String=", recipeDataString); // Debug

    if (!nameToAdd || !recipeDataString) {
        console.error("Missing data on button dataset. Cannot add ingredient.");
        alert("Error: Could not retrieve data to add the ingredient.");
        return;
    }

    // Check again if it exists (safety check - compare base names)
    const alreadyExists = availableIngredients.some(ing => ing.name.toLowerCase() === nameToAdd.toLowerCase());
    if (alreadyExists) {
         alert(`"${nameToAdd}" is already in your ingredients list.`);
         addResultToIngredientsButton.classList.add('hidden'); // Hide if somehow clicked when it exists
         return;
    }

    try {
        const recipeDataObject = JSON.parse(recipeDataString);

        // Create the new ingredient object
        const newIngredientObject = {
            name: nameToAdd,
            type: 'intermediate', // Mark as derived from cooking
            tag: tagToAdd, // Store the extracted tag (e.g., 'Basic', 'Fine', or null)
            recipe: recipeDataObject // Store the parsed recipe object
        };

        // Add to the main list
        availableIngredients.push(newIngredientObject);
        // Sort the list again by name
        availableIngredients.sort((a, b) => a.name.localeCompare(b.name));

        console.log("Added new ingredient object:", newIngredientObject); // Debug
        console.log("Updated availableIngredients:", availableIngredients); // Debug

        // Re-render the ingredient buttons with the updated list
        renderButtons(ingredientButtonsContainer, availableIngredients, 'ingredient', handleIngredientClick);

        // Hide the button after successfully adding
        addResultToIngredientsButton.classList.add('hidden');
        // Clear the data attributes from the button
        delete addResultToIngredientsButton.dataset.baseName;
        delete addResultToIngredientsButton.dataset.tag;
        delete addResultToIngredientsButton.dataset.recipeData;

        alert(`"${nameToAdd}"${tagToAdd ? ` (${tagToAdd})` : ''} added to your available ingredients!`);

    } catch (e) {
        console.error("Failed to parse recipe data from button:", e);
        alert("Error: Failed to process the recipe data for the new ingredient.");
    }
}

// Add item to the visual discovery log
function updateDiscoveryLogUI(dish) {
    const listItem = document.createElement('li');
    const namePart = document.createElement('strong');
    namePart.textContent = dish.name; // Display full name from dish
    listItem.appendChild(namePart);

    if (dish.modifier) {
        const modifierPart = document.createElement('span');
        modifierPart.textContent = ` ${dish.modifier}`; // Add space before modifier
        modifierPart.classList.add('modifier-text');
        listItem.appendChild(modifierPart);
    }

    // Append quality at the end
    const qualityPart = document.createElement('span');
    qualityPart.textContent = ` (${dish.quality})`;
    qualityPart.classList.add(`quality-${dish.quality.toLowerCase()}`); // Style quality
    listItem.appendChild(qualityPart); // Append last

    // Prepend to list so newest appears first
    inventoryList.prepend(listItem);
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Render initial buttons using the updated object structure
    renderButtons(ingredientButtonsContainer, availableIngredients, 'ingredient', handleIngredientClick);
    renderButtons(methodButtonsContainer, availableMethods, 'method', handleMethodClick); // Methods are still strings

    // Add event listeners using the updated addItem function
    addIngredientButton.addEventListener('click', () => addItem('ingredient', availableIngredients, newIngredientInput, renderButtons, ingredientButtonsContainer, 'ingredient', handleIngredientClick));
    addMethodButton.addEventListener('click', () => addItem('method', availableMethods, newMethodInput, renderButtons, methodButtonsContainer, 'method', handleMethodClick)); // No change for methods

    cookButton.addEventListener('click', cook);
    clearButton.addEventListener('click', clearPot);
    addResultToIngredientsButton.addEventListener('click', addResultToIngredients); // This listener calls the updated function

     // Allow adding items with Enter key using updated addItem
    newIngredientInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addItem('ingredient', availableIngredients, newIngredientInput, renderButtons, ingredientButtonsContainer, 'ingredient', handleIngredientClick);
        }
    });
    newMethodInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addItem('method', availableMethods, newMethodInput, renderButtons, methodButtonsContainer, 'method', handleMethodClick);
        }
    });


    // Initial pot state
    renderSelectedIngredients(); // Show placeholder initially
    // console.log("Initial availableIngredients:", availableIngredients); // Debug initial state
});