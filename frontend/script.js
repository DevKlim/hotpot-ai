// backend/frontend/script.js

document.addEventListener('DOMContentLoaded', () => {
    const backendUrl = 'https://hotpot-ai-backend.onrender.com';

    // --- DOM Elements ---
    const ingredientButtonsContainer = document.getElementById('ingredient-buttons');
    const methodButtonsContainer = document.getElementById('method-buttons');
    const potIngredientsContainer = document.getElementById('pot-ingredients');
    const cookButton = document.getElementById('cook-button');
    const clearButton = document.getElementById('clear-button');
    const loadingIndicator = document.getElementById('loading-indicator');
    const resultDisplay = document.getElementById('result-display');
    const dishNameElement = document.getElementById('dish-name');
    const dishModifierElement = document.getElementById('dish-modifier'); // Already exists
    const dishDescriptionElement = document.getElementById('dish-description');
    const dishQualityElement = document.getElementById('dish-quality');
    const dishDiscoveryElement = document.getElementById('dish-discovery');
    const inventoryList = document.getElementById('inventory-list');
    const newIngredientInput = document.getElementById('new-ingredient-input');
    const addIngredientButton = document.getElementById('add-ingredient-button');
    const newMethodInput = document.getElementById('new-method-input');
    const addMethodButton = document.getElementById('add-method-button');
    const methodEffectInput = document.getElementById('method-effect-input');
    const addResultToIngredientsButton = document.getElementById('add-result-to-ingredients-button');

    // --- Game State ---
    let availableIngredients = ['Flour', 'Water', 'Egg', 'Butter', 'Sugar', 'Salt', 'Milk', 'Oil', 'Tomato', 'Garlic', 'Onion'];
    let availableMethods = ['Mix', 'Whisk', 'Knead', 'Boil', 'Simmer', 'Fry', 'Saute', 'Bake', 'Cream', 'Chop'];
    let selectedIngredients = []; // Stores ingredient strings (base names)
    let selectedMethod = null;
    let currentDishResult = null; // Stores the full {name, modifier, description, quality} object
    let playerInventory = []; // Stores discovered Dish objects {name, modifier, description, quality}

    // --- Initialization ---
    function initialize() {
        renderIngredientButtons();
        renderMethodButtons();
        renderInventory();
        cookButton.disabled = true;
        clearButton.addEventListener('click', clearSelection);
        cookButton.addEventListener('click', handleCook);
        addIngredientButton.addEventListener('click', handleAddIngredient);
        addMethodButton.addEventListener('click', handleAddMethod);
        addResultToIngredientsButton.addEventListener('click', handleAddResultToIngredients); // Keep listener

         newIngredientInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') handleAddIngredient();
        });
        newMethodInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') handleAddMethod();
        });
    }

    // --- Rendering Functions ---
    function renderIngredientButtons() {
        ingredientButtonsContainer.innerHTML = '';
        availableIngredients.sort((a, b) => a.localeCompare(b));
        availableIngredients.forEach(ingredient => {
            const button = document.createElement('button');
            // Display the base ingredient name
            button.textContent = ingredient.length > 20 ? ingredient.substring(0, 18) + '...' : ingredient;
            button.title = ingredient; // Show full base name on hover
            button.classList.add('ingredient-button');
            button.dataset.ingredient = ingredient; // Store base name in data attribute
            button.addEventListener('click', () => toggleIngredient(ingredient, button));
            ingredientButtonsContainer.appendChild(button);
        });
    }

    function renderMethodButtons() {
        methodButtonsContainer.innerHTML = '';
        availableMethods.sort((a, b) => a.localeCompare(b));
        availableMethods.forEach(method => {
            const button = document.createElement('button');
            button.textContent = method;
            button.classList.add('method-button');
            button.dataset.method = method;
            button.addEventListener('click', () => selectMethod(method, button));
            methodButtonsContainer.appendChild(button);
        });
    }

    function renderPotIngredients() {
        potIngredientsContainer.innerHTML = '';
        selectedIngredients.forEach(ingredient => { // selectedIngredients contains base names
            const span = document.createElement('span');
            span.textContent = ingredient.length > 15 ? ingredient.substring(0, 13) + '...' : ingredient;
            span.title = ingredient;
            span.classList.add('pot-ingredient');
            potIngredientsContainer.appendChild(span);
        });
        checkCookButtonState();
    }

    function renderInventory() {
        inventoryList.innerHTML = '';
        // Sort inventory perhaps by name then modifier
        playerInventory.sort((a, b) => {
            const nameCompare = a.name.localeCompare(b.name);
            if (nameCompare !== 0) return nameCompare;
            // If names are the same, sort by modifier (treat null/empty modifiers consistently)
            const modA = a.modifier || "";
            const modB = b.modifier || "";
            return modA.localeCompare(modB);
        });

        playerInventory.forEach(dish => {
            const li = document.createElement('li');
            // Use spans for better styling control
            const nameSpan = `<strong>${dish.name}</strong>`;
            const qualitySpan = `<em>(${dish.quality})</em>`;
            // Display modifier on a new line or clearly separated if it exists
            const modifierSpan = dish.modifier ? `<span class="modifier">${dish.modifier}</span>` : '';
            const descriptionSpan = `<span class="desc">${dish.description}</span>`;

            li.innerHTML = `
                ${nameSpan} ${qualitySpan}
                ${modifierSpan}
                ${descriptionSpan}
            `;
            inventoryList.appendChild(li);
        });
    }


    // --- Event Handlers & Logic ---

    function handleAddIngredient() {
        const newIngredient = newIngredientInput.value.trim();
        if (newIngredient && !availableIngredients.some(ing => ing.toLowerCase() === newIngredient.toLowerCase())) {
            availableIngredients.push(newIngredient);
            renderIngredientButtons();
            newIngredientInput.value = '';
        } else if (!newIngredient) {
             alert("Please enter an ingredient name.");
        } else {
             alert("Ingredient already exists!");
        }
    }

    function handleAddMethod() {
        const newMethod = newMethodInput.value.trim();
         if (newMethod && !availableMethods.some(m => m.toLowerCase() === newMethod.toLowerCase())) {
            availableMethods.push(newMethod);
            renderMethodButtons();
            newMethodInput.value = '';
        } else if (!newMethod) {
             alert("Please enter a method name.");
        } else {
             alert("Method already exists!");
        }
    }


    function toggleIngredient(ingredient, button) {
        // Use the base ingredient name from dataset
        const baseIngredientName = button.dataset.ingredient;
        const index = selectedIngredients.indexOf(baseIngredientName);

        if (index > -1) {
            selectedIngredients.splice(index, 1);
            button.classList.remove('selected');
        } else {
            if (selectedIngredients.length < 5) {
                selectedIngredients.push(baseIngredientName); // Add base name
                button.classList.add('selected');
            } else {
                alert("Maximum 5 ingredients allowed!");
            }
        }
        renderPotIngredients();
    }

    function selectMethod(method, button) {
        const previousSelected = methodButtonsContainer.querySelector('.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }
        selectedMethod = method;
        button.classList.add('selected');
        checkCookButtonState();
    }

    function checkCookButtonState() {
        cookButton.disabled = !(selectedIngredients.length > 0 && selectedMethod);
    }

    function clearSelection() {
        selectedIngredients = [];
        selectedMethod = null;
        currentDishResult = null;
        methodEffectInput.value = '';

        ingredientButtonsContainer.querySelectorAll('.selected').forEach(btn => btn.classList.remove('selected'));
        methodButtonsContainer.querySelectorAll('.selected').forEach(btn => btn.classList.remove('selected'));

        renderPotIngredients();
        resultDisplay.classList.add('hidden');
        addResultToIngredientsButton.classList.add('hidden');
        checkCookButtonState();
    }

    async function handleCook() {
        if (cookButton.disabled) return;

        loadingIndicator.classList.remove('hidden');
        resultDisplay.classList.add('hidden');
        addResultToIngredientsButton.classList.add('hidden');
        cookButton.disabled = true;
        clearButton.disabled = true;

        const methodEffect = methodEffectInput.value.trim() || null;

        const payload = {
            ingredients: selectedIngredients, // Send the array of base names
            method: selectedMethod,
            method_effect: methodEffect
        };

        try {
            const response = await fetch(`${backendUrl}/cook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            loadingIndicator.classList.add('hidden');
            clearButton.disabled = false;

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.dish) {
                displayResult(data.dish); // Display the full dish object {name, modifier, ...}
                handleAddToInventoryLog(data.dish); // Log the full dish object
            } else {
                displayError(data.message || "Cooking failed.");
            }

        } catch (error) {
            console.error('Cooking Error:', error);
            loadingIndicator.classList.add('hidden');
            clearButton.disabled = false;
            displayError(`Failed to cook: ${error.message}`);
            checkCookButtonState(); // Re-enable cook button if possible on error
        }
    }

    function displayResult(dish) {
        currentDishResult = dish; // Store the full result object

        dishNameElement.textContent = dish.name; // Display base name
        dishModifierElement.textContent = dish.modifier || ''; // Display modifier separately
        dishDescriptionElement.textContent = dish.description;
        dishQualityElement.textContent = dish.quality;

        // Check inventory log using name AND modifier
        const isAlreadyKnown = playerInventory.some(invDish =>
            invDish.name === dish.name && invDish.modifier === dish.modifier
        );

        // Use the is_new_discovery flag from backend primarily
        if (dish.is_new_discovery) {
             dishDiscoveryElement.textContent = "✨ New Discovery! ✨";
             dishDiscoveryElement.classList.remove('hidden');
        } else if (isAlreadyKnown) {
             dishDiscoveryElement.textContent = "Already Discovered";
             dishDiscoveryElement.classList.remove('hidden');
        } else { // From cache but not in player log (shouldn't happen often with current logic)
             dishDiscoveryElement.textContent = "Known Recipe";
             dishDiscoveryElement.classList.remove('hidden');
        }


        resultDisplay.classList.remove('hidden');
        // Always show the "Add to Ingredients" button if a result was generated successfully
        addResultToIngredientsButton.classList.remove('hidden');
    }

    function displayError(message) {
        currentDishResult = null;
        dishNameElement.textContent = "Oops!";
        dishModifierElement.textContent = '';
        dishDescriptionElement.textContent = message;
        dishQualityElement.textContent = "Error";
        dishDiscoveryElement.classList.add('hidden');
        resultDisplay.classList.remove('hidden');
        addResultToIngredientsButton.classList.add('hidden');
    }

    function handleAddToInventoryLog(dishToAdd) {
         if (!dishToAdd) return;

        const existingDishIndex = playerInventory.findIndex(d =>
            d.name === dishToAdd.name && d.modifier === dishToAdd.modifier
        );

        if (existingDishIndex === -1) {
             playerInventory.push({
                name: dishToAdd.name,
                modifier: dishToAdd.modifier, // Store modifier
                description: dishToAdd.description,
                quality: dishToAdd.quality
             });
             console.log("Logged discovery:", dishToAdd.name, dishToAdd.modifier);
             renderInventory();
        } else {
            console.log("Discovery already logged:", dishToAdd.name, dishToAdd.modifier);
        }
    }

    // *** UPDATED FUNCTION ***
    // Function for the "Add to Ingredients" button
    function handleAddResultToIngredients() {
        if (!currentDishResult || !currentDishResult.name) return; // Need at least a base name

        // Get the BASE name from the current result
        const baseIngredientName = currentDishResult.name;

        // Add only the BASE name to the available ingredients list if not already present
        if (!availableIngredients.some(ing => ing.toLowerCase() === baseIngredientName.toLowerCase())) {
            availableIngredients.push(baseIngredientName);
            renderIngredientButtons(); // Update the panel
            console.log("Added base ingredient to panel:", baseIngredientName);
            alert(`"${baseIngredientName}" added to ingredients!`);
        } else {
             alert(`Base ingredient "${baseIngredientName}" is already in the ingredients list.`);
        }

        // Clear the pot and result area after adding (or attempting to add)
        clearSelection();
    }


    // --- Start the game ---
    initialize();
});