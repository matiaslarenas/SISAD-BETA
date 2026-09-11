import {
    calculateRecipeCost,
    calculateMargin,
    calculateProfit,
    calculateBaseRecipeUnitCost,
    formatCurrency,
} from "../utils/recipeCalculator";

function RecipesTable({
    recipes,
    inventory,
    allRecipes = recipes,
}) {
    return (
        <div className="table-wrap">
            <table className="recipes-table">
                <thead>
                    <tr>
                        <th>Receta</th>
                        <th>Tipo</th>
                        <th>Categoría</th>
                        <th>Costo</th>
                        <th>Venta</th>
                        <th>Utilidad</th>
                        <th>Margen</th>
                    </tr>
                </thead>

                <tbody>
                    {recipes.map((recipe) => {
                        const isBaseRecipe = recipe.type === "base_recipe";

                        // Soporta tanto 'price' como 'salePrice'
                        const salePrice = recipe.price ?? recipe.salePrice ?? 0;

                        const cost = isBaseRecipe
                            ? calculateBaseRecipeUnitCost(
                                recipe,
                                inventory,
                                allRecipes
                            )
                            : calculateRecipeCost(
                                recipe,
                                inventory,
                                allRecipes
                            );

                        const profit = isBaseRecipe
                            ? 0
                            : calculateProfit(cost, salePrice);

                        const margin = isBaseRecipe
                            ? 0
                            : calculateMargin(cost, salePrice);

                        return (
                            <tr key={recipe.id}>
                                <td>
                                    <div className="item-name">
                                        <span className="dot"></span>
                                        {recipe.name}
                                    </div>
                                </td>

                                <td>
                                    {isBaseRecipe ? (
                                        <span className="pill neutral">
                                            Base
                                            {recipe.status === "pending_measurement"
                                                ? " · Sin medir"
                                                : ""}
                                        </span>
                                    ) : (
                                        <span className="pill success">
                                            Venta
                                        </span>
                                    )}
                                </td>

                                <td>{recipe.category}</td>

                                <td>
                                    {isBaseRecipe
                                        ? `${formatCurrency(cost)} / ${recipe.yieldUnit || "un"}`
                                        : formatCurrency(cost)}
                                </td>

                                <td>
                                    {isBaseRecipe
                                        ? "—"
                                        : formatCurrency(salePrice)}
                                </td>

                                <td>
                                    {isBaseRecipe
                                        ? "—"
                                        : formatCurrency(profit)}
                                </td>

                                <td>
                                    {isBaseRecipe
                                        ? "—"
                                        : `${margin.toFixed(1)}%`}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default RecipesTable;