/**
 * Normaliza cualquier variante de unidad a un token canónico estandarizado (gr, kg, lt, ml, un).
 */
function normalizeUnitToken(unit) {
    if (unit == null) return "";
    const raw = String(unit).trim().toLowerCase();
    if (!raw) return "";

    // Mapeo exhaustivo de variaciones de unidades
    if (["g", "gr", "gramo", "gramos"].includes(raw)) return "gr";
    if (["kg", "kilo", "kilos", "kilogramo", "kilogramos"].includes(raw)) return "kg";
    if (["l", "lt", "litro", "litros"].includes(raw)) return "lt";
    if (["ml", "cc", "mililitro", "mililitros"].includes(raw)) return "ml";
    if (["u", "un", "unidad", "unidades", "und"].includes(raw)) return "un";

    return raw;
}

/**
 * Convierte cantidades entre unidades de receta y unidades de bodega/inventario.
 * Soporta masa (gr/kg), volumen (ml/lt) y conversión por peso promedio unitario (avgUnitWeightGr).
 */
export function normalizeQuantity(quantity, recipeUnit, inventoryUnit, avgUnitWeightGr = 0) {
    const value = Number(quantity);
    if (!Number.isFinite(value) || value <= 0) return 0;

    const rUnit = normalizeUnitToken(recipeUnit);
    const iUnit = normalizeUnitToken(inventoryUnit);

    // 1. MASA: Gramos a Kilos (Si iUnit es "kg" o viene vacío/indefinido por defecto)
    if (rUnit === "gr" && (iUnit === "kg" || !iUnit)) {
        return value / 1000;
    }

    // 2. VOLUMEN: Mililitros a Litros (Si iUnit es "lt" o viene vacío/indefinido por defecto)
    if (rUnit === "ml" && (iUnit === "lt" || !iUnit)) {
        return value / 1000;
    }

    // 3. Conversiones Inversas
    if (rUnit === "kg" && iUnit === "gr") return value * 1000;
    if (rUnit === "lt" && iUnit === "ml") return value * 1000;

    // 4. Conversión por peso promedio cuando el inventario es por unidades ("un")
    const weightGr = Number(avgUnitWeightGr) || 0;
    if (iUnit === "un" && weightGr > 0) {
        if (rUnit === "gr") return value / weightGr;
        if (rUnit === "kg") return (value * 1000) / weightGr;
    }

    // Si las unidades ya coinciden o no hay regla especificada
    return value;
}

/**
 * Aplanar recursivamente los ingredientes de una receta, resolviendo sub-recetas base
 * e imponiendo guardas contra referencias circulares y preparaciones no medidas.
 */
export function flattenRecipeIngredients(
    recipe,
    allRecipes = [],
    multiplier = 1,
    visitedRecipeIds = new Set()
) {
    if (!recipe?.ingredients?.length || visitedRecipeIds.has(recipe.id)) {
        return [];
    }

    const nextVisited = new Set(visitedRecipeIds).add(recipe.id);
    const flattened = [];

    for (const ingredient of recipe.ingredients) {
        const targetProductId = ingredient.productId || ingredient.inventoryId;

        if (ingredient.baseRecipeId) {
            const baseRecipe = allRecipes.find((r) => r.id === ingredient.baseRecipeId);

            if (!baseRecipe?.yieldQuantity || baseRecipe.yieldQuantity <= 0) {
                continue;
            }

            const nestedMultiplier = (ingredient.quantity / baseRecipe.yieldQuantity) * multiplier;

            flattened.push(
                ...flattenRecipeIngredients(
                    baseRecipe,
                    allRecipes,
                    nestedMultiplier,
                    nextVisited
                )
            );
        } else if (targetProductId) {
            flattened.push({
                productId: targetProductId,
                quantity: ingredient.quantity * multiplier,
                unit: ingredient.unit,
            });
        }
    }

    return flattened;
}

/**
 * Calcula la cantidad máxima de porciones producibles según el stock actual en bodega.
 */
export function calculateRecipeMaxPortions(
    recipe,
    inventory = [],
    allRecipes = []
) {
    const flattened = flattenRecipeIngredients(recipe, allRecipes);
    if (flattened.length === 0) return 0;

    const aggregated = new Map();

    for (const ingredient of flattened) {
        const existing = aggregated.get(ingredient.productId);
        if (existing) {
            existing.quantity += ingredient.quantity;
        } else {
            aggregated.set(ingredient.productId, {
                quantity: ingredient.quantity,
                unit: ingredient.unit,
            });
        }
    }

    let maxPortions = Infinity;

    for (const [productId, { quantity, unit }] of aggregated) {
        const product = inventory.find((item) => item.id === productId);

        if (!product || product.onHand <= 0) return 0;

        const targetUnit = product.purchaseUnit || product.unit || "";
        const normalizedQty = normalizeQuantity(
            quantity,
            unit,
            targetUnit,
            product.avgUnitWeightGr
        );

        if (normalizedQty > 0) {
            const portionsForIngredient = Math.floor(product.onHand / normalizedQty);
            if (portionsForIngredient < maxPortions) {
                maxPortions = portionsForIngredient;
            }
        }
    }

    return maxPortions === Infinity ? 0 : Math.max(0, maxPortions);
}

/**
 * Calcula el costo teórico total de una receta o lote base.
 */
export function calculateRecipeCost(recipe, inventory = [], allRecipes = []) {
    const flattened = flattenRecipeIngredients(recipe, allRecipes);

    return flattened.reduce((totalCost, ingredient) => {
        const product = inventory.find((item) => item.id === ingredient.productId);
        if (!product) return totalCost;

        const targetUnit = product.purchaseUnit || product.unit || "";
        const normalizedQty = normalizeQuantity(
            ingredient.quantity,
            ingredient.unit,
            targetUnit,
            product.avgUnitWeightGr
        );

        const unitCost = Number(product.costPerUnit) || 0;
        return totalCost + (unitCost * normalizedQty);
    }, 0);
}

/**
 * Calcula el costo por unidad de rendimiento producida de una receta base.
 */
export function calculateBaseRecipeUnitCost(baseRecipe, inventory = [], allRecipes = []) {
    if (!baseRecipe?.yieldQuantity || baseRecipe.yieldQuantity <= 0) return 0;

    const batchCost = calculateRecipeCost(baseRecipe, inventory, allRecipes);
    return batchCost / baseRecipe.yieldQuantity;
}

/**
 * Calcula el porcentaje de margen comercial sobre el precio de venta.
 */
export function calculateMargin(recipeCost, salePrice) {
    const price = Number(salePrice);
    const cost = Number(recipeCost);
    if (!price || price <= 0) return 0;
    return ((price - cost) / price) * 100;
}

/**
 * Calcula la utilidad bruta nominal.
 */
export function calculateProfit(recipeCost, salePrice) {
    const price = Number(salePrice) || 0;
    const cost = Number(recipeCost) || 0;
    return price - cost;
}

/**
 * Formato de moneda para pesos chilenos (CLP).
 */
export function formatCurrency(value) {
    const amount = Number(value);
    return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        minimumFractionDigits: 0,
    }).format(Number.isFinite(amount) ? amount : 0);
}