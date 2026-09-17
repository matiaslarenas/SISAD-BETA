import { useState } from "react";

import {
  ChefHat,
  DollarSign,
  UtensilsCrossed,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import Modal from "../components/Modal";
import SearchBar from "../components/SearchBar";
import FilterSelect from "../components/FilterSelect";
import MetricCard from "../components/MetricCard";
import RecipesTable from "../components/RecipesTable";
import { useAppData } from "../context/AppDataContext";
import {
  calculateMargin,
  calculateRecipeCost,
} from "../utils/recipeCalculator";
import {
  formatCurrency,
} from "../utils/format";
import {
  hasValidationErrors,
  validateIngredientForm,
  validateRecipeForm,
} from "../utils/validation";

const categories = [
  "Todas",
  "Pizzas",
  "Empanadas",
  "Acompañamientos",
  "Bebidas",
  "Cafetería",
  "Almuerzos",
  "Bases",
];

const emptyRecipe = {
  name: "",
  category: "",
  salePrice: "",
  servings: "1",
  ingredients: [],
};

const emptyIngredient = {
  productId: "",
  quantity: "",
  unit: "gr",
};

function Recipes() {
  const {
    recipes,
    inventory,
    addRecipe,
    updateRecipe,
    removeRecipe,
  } = useAppData();

  const [search, setSearch] =
    useState("");
  const [category, setCategory] =
    useState("Todas");
  const [showRecipeModal, setShowRecipeModal] =
    useState(false);
  const [editingRecipe, setEditingRecipe] =
    useState(null);
  const [newRecipe, setNewRecipe] =
    useState(emptyRecipe);
  const [ingredient, setIngredient] =
    useState(emptyIngredient);
  const [recipeErrors, setRecipeErrors] =
    useState({});
  const [ingredientErrors, setIngredientErrors] =
    useState({});

  const filteredRecipes =
    recipes.filter((recipe) => {
      const matchesSearch =
        recipe.name
          .toLowerCase()
          .includes(
            search.toLowerCase()
          );

      const matchesCategory =
        category === "Todas"
          ? true
          : recipe.category === category;

      return (
        matchesSearch &&
        matchesCategory
      );
    });

  const costedRecipes = recipes
    .filter((recipe) => recipe.type !== "base_recipe")
    .map((recipe) => {
      const cost = calculateRecipeCost(
        recipe,
        inventory,
        recipes
      );

      return {
        cost,
        margin: calculateMargin(
          cost,
          recipe.salePrice
        ),
        servings: recipe.servings || 0,
      };
    });

  const avgCost =
    costedRecipes.length === 0
      ? 0
      : costedRecipes.reduce(
          (sum, recipe) =>
            sum + recipe.cost,
          0
        ) / costedRecipes.length;

  const totalServings =
    costedRecipes.reduce(
      (sum, recipe) =>
        sum + recipe.servings,
      0
    );

  const avgMargin =
    costedRecipes.length === 0
      ? 0
      : costedRecipes.reduce(
          (sum, recipe) =>
            sum + recipe.margin,
          0
        ) / costedRecipes.length;

  const recipeMetrics = [
    {
      title: "Recetas Activas",
      value: costedRecipes.length,
      trend: "Activas",
      icon: ChefHat,
    },
    {
      title: "Costo Promedio",
      value: formatCurrency(avgCost),
      trend: "CLP",
      icon: DollarSign,
    },
    {
      title: "Platos Vendidos",
      value: totalServings,
      trend: "Porciones",
      icon: UtensilsCrossed,
    },
    {
      title: "Margen Promedio",
      value: `${avgMargin.toFixed(1)}%`,
      trend: "Objetivo",
      icon: TrendingUp,
    },
  ];

  const closeModal = () => {
    setShowRecipeModal(false);
    setEditingRecipe(null);
    setNewRecipe(emptyRecipe);
    setIngredient(emptyIngredient);
    setRecipeErrors({});
    setIngredientErrors({});
  };

  const openNewRecipeModal = () => {
    setEditingRecipe(null);
    setNewRecipe(emptyRecipe);
    setIngredient(emptyIngredient);
    setRecipeErrors({});
    setIngredientErrors({});
    setShowRecipeModal(true);
  };

  const handleEditRecipe = (recipe) => {
    setEditingRecipe(recipe);
    setRecipeErrors({});
    setNewRecipe({
      name: recipe.name,
      category: recipe.category,
      salePrice: String(recipe.salePrice ?? ""),
      servings: String(recipe.servings ?? "1"),
      ingredients: recipe.ingredients || [],
    });
    setShowRecipeModal(true);
  };

  const handleDeleteRecipe = (recipeId) => {
    const recipe = recipes.find(
      (entry) => entry.id === recipeId
    );

    removeRecipe(recipeId);
    toast.success("Receta eliminada", {
      description: recipe?.name,
    });
  };

  const handleAddIngredient = () => {
    const nextErrors =
      validateIngredientForm(
        ingredient
      );

    setIngredientErrors(nextErrors);

    if (hasValidationErrors(nextErrors)) {
      return;
    }

    setNewRecipe({
      ...newRecipe,
      ingredients: [
        ...newRecipe.ingredients,
        {
          productId:
            ingredient.productId,
          quantity: Number(
            ingredient.quantity
          ),
          unit: ingredient.unit,
        },
      ],
    });

    setIngredient(emptyIngredient);
    setIngredientErrors({});
  };

  const handleAddRecipe = (event) => {
    event.preventDefault();

    const nextErrors =
      validateRecipeForm(newRecipe);

    setRecipeErrors(nextErrors);

    if (hasValidationErrors(nextErrors)) {
      return;
    }

    const values = {
      ...newRecipe,
      salePrice: Number(
        newRecipe.salePrice
      ),
      servings: Number(
        newRecipe.servings
      ),
    };

    if (editingRecipe) {
      updateRecipe(editingRecipe.id, values);
      toast.success("Receta actualizada", {
        description: values.name,
      });
    } else {
      addRecipe(values);
      toast.success("Receta creada", {
        description: values.name,
      });
    }

    closeModal();
  };

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            Producción
          </p>

          <h2>Recetas</h2>
        </div>

        <button
          type="button"
          className="primary-btn"
          onClick={openNewRecipeModal}
          aria-label="Crear nueva receta"
        >
          Nueva Receta
        </button>
      </header>

      <section className="metrics-grid">
        {recipeMetrics.map((metric) => (
          <MetricCard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            trend={metric.trend}
            icon={metric.icon}
          />
        ))}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>
            Costeo de Recetas
          </h3>

          <span className="pill neutral">
            {filteredRecipes.length} recetas
          </span>
        </div>

        <div className="filters-row">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Buscar receta..."
            label="Buscar receta"
            id="recipe-search"
          />

          <FilterSelect
            value={category}
            onChange={setCategory}
            options={categories}
            id="recipe-category-filter"
            ariaLabel="Filtrar recetas por categoría"
          />
        </div>

        <RecipesTable
          recipes={filteredRecipes}
          inventory={inventory}
          allRecipes={recipes}
          onEdit={handleEditRecipe}
          onDelete={handleDeleteRecipe}
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>
            Observaciones
          </h3>
        </div>

        <div className="alert-item success">
          <strong>
            Margen Saludable
          </strong>

          <span>
            El margen promedio se mantiene sobre el objetivo definido.
          </span>
        </div>

        <div className="alert-item warning">
          <strong>
            Costos Variables
          </strong>

          <span>
            Los costos se recalculan con el último costo recibido de inventario.
          </span>
        </div>

        <div className="alert-item danger">
          <strong>
            Revisar Costeo
          </strong>

          <span>
            Asegura que toda receta tenga ingredientes antes de publicarla.
          </span>
        </div>
      </section>

      <Modal
        isOpen={showRecipeModal}
        onClose={closeModal}
        title={
          editingRecipe
            ? "Editar Receta"
            : "Nueva Receta"
        }
        description="Las recetas calculan su costo automáticamente con el inventario vigente."
      >
        <form
          className="modal-form"
          onSubmit={handleAddRecipe}
          noValidate
        >
          {hasValidationErrors(
            recipeErrors
          ) ? (
            <div className="form-alert" role="alert">
              Revisa nombre, categoría, precio y composición antes de guardar.
            </div>
          ) : null}

          <div className="form-grid">
            <label className="form-field">
              <span>Nombre</span>
              <input
                type="text"
                className="search-input"
                value={newRecipe.name}
                aria-invalid={Boolean(
                  recipeErrors.name
                )}
                onChange={(event) =>
                  setNewRecipe({
                    ...newRecipe,
                    name: event.target.value,
                  })
                }
              />
              {recipeErrors.name ? (
                <p className="field-error" role="alert">
                  {recipeErrors.name}
                </p>
              ) : null}
            </label>

            <label className="form-field">
              <span>Categoría</span>
              <select
                className="search-input"
                value={newRecipe.category}
                aria-invalid={Boolean(
                  recipeErrors.category
                )}
                onChange={(event) =>
                  setNewRecipe({
                    ...newRecipe,
                    category:
                      event.target.value,
                  })
                }
              >
                <option value="">
                  Seleccionar categoría
                </option>
                {categories
                  .filter(
                    (entry) =>
                      entry !== "Todas"
                  )
                  .map((entry) => (
                    <option
                      key={entry}
                      value={entry}
                    >
                      {entry}
                    </option>
                  ))}
              </select>
              {recipeErrors.category ? (
                <p className="field-error" role="alert">
                  {recipeErrors.category}
                </p>
              ) : null}
            </label>

            <label className="form-field">
              <span>Precio Venta</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="search-input"
                value={newRecipe.salePrice}
                aria-invalid={Boolean(
                  recipeErrors.salePrice
                )}
                onChange={(event) =>
                  setNewRecipe({
                    ...newRecipe,
                    salePrice:
                      event.target.value,
                  })
                }
              />
              {recipeErrors.salePrice ? (
                <p className="field-error" role="alert">
                  {recipeErrors.salePrice}
                </p>
              ) : null}
            </label>

            <label className="form-field">
              <span>Porciones</span>
              <input
                type="number"
                min="1"
                step="1"
                className="search-input"
                value={newRecipe.servings}
                aria-invalid={Boolean(
                  recipeErrors.servings
                )}
                onChange={(event) =>
                  setNewRecipe({
                    ...newRecipe,
                    servings:
                      event.target.value,
                  })
                }
              />
              {recipeErrors.servings ? (
                <p className="field-error" role="alert">
                  {recipeErrors.servings}
                </p>
              ) : null}
            </label>
          </div>

          <div className="subsection-header">
            <h4>Ingredientes</h4>
            <span className="pill neutral">
              {
                newRecipe.ingredients.length
              }{" "}
              agregados
            </span>
          </div>

          <div className="inline-form-grid">
            <label className="form-field">
              <span>Producto</span>
              <select
                className="search-input"
                value={ingredient.productId}
                aria-invalid={Boolean(
                  ingredientErrors.productId
                )}
                onChange={(event) =>
                  setIngredient({
                    ...ingredient,
                    productId:
                      event.target.value,
                  })
                }
              >
                <option value="">
                  Seleccionar producto
                </option>
                {inventory.map((product) => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.item}
                  </option>
                ))}
              </select>
              {ingredientErrors.productId ? (
                <p className="field-error" role="alert">
                  {ingredientErrors.productId}
                </p>
              ) : null}
            </label>

            <label className="form-field">
              <span>Cantidad</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="search-input"
                value={ingredient.quantity}
                aria-invalid={Boolean(
                  ingredientErrors.quantity
                )}
                onChange={(event) =>
                  setIngredient({
                    ...ingredient,
                    quantity:
                      event.target.value,
                  })
                }
              />
              {ingredientErrors.quantity ? (
                <p className="field-error" role="alert">
                  {ingredientErrors.quantity}
                </p>
              ) : null}
            </label>

            <label className="form-field">
              <span>Unidad</span>
              <select
                className="search-input"
                value={ingredient.unit}
                onChange={(event) =>
                  setIngredient({
                    ...ingredient,
                    unit: event.target.value,
                  })
                }
              >
                <option value="gr">gr</option>
                <option value="ml">ml</option>
                <option value="un">un</option>
              </select>
            </label>

            <div className="inline-action-row">
              <button
                type="button"
                className="secondary-btn"
                onClick={handleAddIngredient}
              >
                Agregar Ingrediente
              </button>
            </div>
          </div>

          {recipeErrors.ingredients ? (
            <p className="field-error" role="alert">
              {recipeErrors.ingredients}
            </p>
          ) : null}

          <div className="stack-list">
            {newRecipe.ingredients.length > 0 ? (
              newRecipe.ingredients.map(
                (
                  entry,
                  index
                ) => {
                  const product =
                    inventory.find(
                      (item) =>
                        item.id ===
                        entry.productId
                    );

                  return (
                    <div
                      key={`${entry.productId}-${index}`}
                      className="line-item-card"
                    >
                      <div>
                        <strong>
                          {product?.item}
                        </strong>
                        <span>
                          {entry.quantity}{" "}
                          {entry.unit}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="danger-btn"
                        onClick={() =>
                          setNewRecipe({
                            ...newRecipe,
                            ingredients:
                              newRecipe.ingredients.filter(
                                (_, itemIndex) =>
                                  itemIndex !==
                                  index
                              ),
                          })
                        }
                        aria-label={`Quitar ${product?.item || "ingrediente"}`}
                      >
                        Quitar
                      </button>
                    </div>
                  );
                }
              )
            ) : (
              <div className="empty-state">
                Aún no agregas ingredientes.
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={closeModal}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="primary-btn"
            >
              Guardar Receta
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default Recipes;
