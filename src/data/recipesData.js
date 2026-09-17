export const recipesData = [
    {
        "id": "BASE_PIZZA_DOUGH",
        "name": "Masa Pizza Base (Familiar)",
        "category": "Bases",
        "type": "base_recipe",
        "status": "active",
        "yieldQuantity": 4,
        "yieldUnit": "un",
        "ingredients": [
            { "productId": "INV001", "quantity": 1000, "unit": "gr" }, // Harina de Trigo
            { "productId": "INV095", "quantity": 600, "unit": "ml" },  // Agua Purificada
            { "productId": "INV025", "quantity": 18, "unit": "gr" },   // Levadura Seca
            { "productId": "INV024", "quantity": 10, "unit": "gr" },   // Sal Fina
            { "productId": "INV010", "quantity": 3, "unit": "gr" },    // Azúcar Granulada
            { "productId": "INV004", "quantity": 15, "unit": "ml" }    // Aceite Maravilla / Oliva
        ]
    },
    {
        "id": "BASE_PIZZA_SAUCE",
        "name": "Salsa Tomate Pizza Base",
        "category": "Bases",
        "type": "base_recipe",
        "status": "active",
        "yieldQuantity": 2000,
        "yieldUnit": "ml",
        "ingredients": [
            { "productId": "INV003", "quantity": 1500, "unit": "gr" }, // Tomate Maduro
            { "productId": "INV032", "quantity": 200, "unit": "gr" },  // Salsa / Puré de Tomate Concentrado
            { "productId": "INV075", "quantity": 15, "unit": "gr" },   // Ajo Pelado / Diente
            { "productId": "INV037", "quantity": 5, "unit": "gr" }     // Orégano
        ]
    },
    {
        "id": "BASE_EMPANADA_DOUGH",
        "name": "Masa Empanadas Base",
        "category": "Bases",
        "type": "base_recipe",
        "status": "active",
        "yieldQuantity": 20,
        "yieldUnit": "un",
        "ingredients": [
            { "productId": "INV001", "quantity": 1000, "unit": "gr" }, // Harina de Trigo
            { "productId": "INV023", "quantity": 65, "unit": "gr" },   // Mantequilla sin Sal
            { "productId": "INV024", "quantity": 15, "unit": "gr" },   // Sal Fina
            { "productId": "INV095", "quantity": 400, "unit": "ml" }   // Agua Purificada
        ]
    },
    {
        "id": "BASE_BECHAMEL",
        "name": "Salsa Bechamel Base",
        "category": "Bases",
        "type": "base_recipe",
        "status": "active",
        "yieldQuantity": 1000,
        "yieldUnit": "ml",
        "ingredients": [
            { "productId": "INV023", "quantity": 60, "unit": "gr" },  // Mantequilla sin Sal
            { "productId": "INV001", "quantity": 60, "unit": "gr" },  // Harina de Trigo
            { "productId": "INV021", "quantity": 1000, "unit": "ml" }, // Leche Entera
            { "productId": "INV024", "quantity": 5, "unit": "gr" }    // Sal Fina
        ]
    },
    {
        "id": "BASE_FETUCCINI",
        "name": "Fetuccini Casero Base",
        "category": "Bases",
        "type": "base_recipe",
        "status": "active",
        "yieldQuantity": 10,
        "yieldUnit": "un",
        "ingredients": [
            { "productId": "INV001", "quantity": 1000, "unit": "gr" }, // Harina de Trigo
            { "productId": "INV069", "quantity": 10, "unit": "un" }    // Huevo
        ]
    },
    {
        "id": "BASE_PASTA_SAUCE",
        "name": "Salsa Tomate Pasta Base",
        "category": "Bases",
        "type": "base_recipe",
        "status": "pending_measurement",
        "yieldQuantity": 0,
        "yieldUnit": "ml",
        "ingredients": []
    },
    {
        "id": "BASE_BOLOGNESE",
        "name": "Salsa Boloñesa Base",
        "category": "Bases",
        "type": "base_recipe",
        "status": "pending_measurement",
        "yieldQuantity": 0,
        "yieldUnit": "ml",
        "ingredients": []
    },
    {
        "id": "BASE_PESTO",
        "name": "Pesto Albahaca Base",
        "category": "Bases",
        "type": "base_recipe",
        "status": "pending_measurement",
        "yieldQuantity": 0,
        "yieldUnit": "ml",
        "ingredients": []
    },
    {
        "id": "REC_PIZZA_MARGARITA",
        "name": "Pizza Margarita",
        "category": "Pizzas",
        "type": "recipe",
        "status": "active",
        "salePrice": 11000,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "baseRecipeId": "BASE_PIZZA_DOUGH", "quantity": 1, "unit": "un" },
            { "baseRecipeId": "BASE_PIZZA_SAUCE", "quantity": 150, "unit": "ml" },
            { "productId": "INV002", "quantity": 200, "unit": "gr" }, // Queso Mozzarella
            { "productId": "INV003", "quantity": 50, "unit": "gr" },  // Tomate Maduro
            { "productId": "INV091", "quantity": 5, "unit": "gr" }   // Albahaca Fresca
        ]
    },
    {
        "id": "REC_PIZZA_NAPOLITANA",
        "name": "Pizza Napolitana",
        "category": "Pizzas",
        "type": "recipe",
        "status": "active",
        "salePrice": 12000,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "baseRecipeId": "BASE_PIZZA_DOUGH", "quantity": 1, "unit": "un" },
            { "baseRecipeId": "BASE_PIZZA_SAUCE", "quantity": 150, "unit": "ml" },
            { "productId": "INV002", "quantity": 200, "unit": "gr" }, // Queso Mozzarella
            { "productId": "INV063", "quantity": 150, "unit": "gr" }, // Jamón Pierna
            { "productId": "INV003", "quantity": 50, "unit": "gr" },  // Tomate Maduro
            { "productId": "INV037", "quantity": 2, "unit": "gr" }   // Orégano
        ]
    },
    {
        "id": "REC_PIZZA_VEGETARIANA",
        "name": "Pizza Vegetariana",
        "category": "Pizzas",
        "type": "recipe",
        "status": "active",
        "salePrice": 13000,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "baseRecipeId": "BASE_PIZZA_DOUGH", "quantity": 1, "unit": "un" },
            { "baseRecipeId": "BASE_PIZZA_SAUCE", "quantity": 150, "unit": "ml" },
            { "productId": "INV002", "quantity": 200, "unit": "gr" }, // Queso Mozzarella
            { "productId": "INV066", "quantity": 100, "unit": "gr" }, // Champiñones Frescos
            { "productId": "INV006", "quantity": 50, "unit": "gr" },  // Pimentón Rojo
            { "productId": "INV014", "quantity": 40, "unit": "gr" },  // Aceitunas Negras
            { "productId": "INV067", "quantity": 50, "unit": "gr" },  // Choclo Desgranado
            { "productId": "INV008", "quantity": 30, "unit": "gr" }   // Cebolla
        ]
    },
    {
        "id": "REC_PIZZA_CON_TODO",
        "name": "Pizza Con Todo",
        "category": "Pizzas",
        "type": "recipe",
        "status": "active",
        "salePrice": 14000,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "baseRecipeId": "BASE_PIZZA_DOUGH", "quantity": 1, "unit": "un" },
            { "baseRecipeId": "BASE_PIZZA_SAUCE", "quantity": 150, "unit": "ml" },
            { "productId": "INV002", "quantity": 200, "unit": "gr" }, // Queso Mozzarella
            { "productId": "INV015", "quantity": 80, "unit": "gr" },  // Salame
            { "productId": "INV064", "quantity": 60, "unit": "gr" },  // Tocino Ahumado
            { "productId": "INV066", "quantity": 60, "unit": "gr" },  // Champiñones
            { "productId": "INV014", "quantity": 40, "unit": "gr" }   // Aceitunas Negras
        ]
    },
    {
        "id": "REC_EMP_QUESO",
        "name": "Empanada de Queso",
        "category": "Empanadas",
        "type": "recipe",
        "status": "active",
        "salePrice": 3000,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "baseRecipeId": "BASE_EMPANADA_DOUGH", "quantity": 1, "unit": "un" },
            { "productId": "INV002", "quantity": 80, "unit": "gr" }  // Queso Mozzarella
        ]
    },
    {
        "id": "REC_EMP_QUESO_CAMARON",
        "name": "Empanada Queso-Camarón",
        "category": "Empanadas",
        "type": "recipe",
        "status": "active",
        "salePrice": 3800,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "baseRecipeId": "BASE_EMPANADA_DOUGH", "quantity": 1, "unit": "un" },
            { "productId": "INV002", "quantity": 60, "unit": "gr" },  // Queso Mozzarella
            { "productId": "INV019", "quantity": 50, "unit": "gr" }   // Camarones Ecuador
        ]
    },
    {
        "id": "REC_EMP_QUESO_CHAMPINON",
        "name": "Empanada Queso-Champiñón",
        "category": "Empanadas",
        "type": "recipe",
        "status": "active",
        "salePrice": 3300,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "baseRecipeId": "BASE_EMPANADA_DOUGH", "quantity": 1, "unit": "un" },
            { "productId": "INV002", "quantity": 60, "unit": "gr" },  // Queso Mozzarella
            { "productId": "INV066", "quantity": 40, "unit": "gr" }   // Champiñones Frescos
        ]
    },
    {
        "id": "REC_EMP_NAPOLITANA",
        "name": "Empanada Napolitana",
        "category": "Empanadas",
        "type": "recipe",
        "status": "active",
        "salePrice": 3500,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "baseRecipeId": "BASE_EMPANADA_DOUGH", "quantity": 1, "unit": "un" },
            { "productId": "INV002", "quantity": 50, "unit": "gr" },  // Queso Mozzarella
            { "productId": "INV063", "quantity": 30, "unit": "gr" },  // Jamón Pierna
            { "productId": "INV003", "quantity": 25, "unit": "gr" },  // Tomate
            { "productId": "INV037", "quantity": 1, "unit": "gr" }   // Orégano
        ]
    },
    {
        "id": "REC_PAPAS_INDIVIDUAL",
        "name": "Papas Fritas Individual",
        "category": "Acompañamientos",
        "type": "recipe",
        "status": "active",
        "salePrice": 2000,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "productId": "INV033", "quantity": 240, "unit": "gr" }, // Papa Prefrita
            { "productId": "INV005", "quantity": 20, "unit": "ml" }   // Aceite para Freír
        ]
    },
    {
        "id": "REC_PAPAS_2_PERSONAS",
        "name": "Papas Fritas Para 2",
        "category": "Acompañamientos",
        "type": "recipe",
        "status": "active",
        "salePrice": 2600,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "productId": "INV033", "quantity": 420, "unit": "gr" }, // Papa Prefrita
            { "productId": "INV005", "quantity": 35, "unit": "ml" }   // Aceite para Freír
        ]
    },
    {
        "id": "REC_PAPAS_4_PERSONAS",
        "name": "Papas Fritas Para 4",
        "category": "Acompañamientos",
        "type": "recipe",
        "status": "active",
        "salePrice": 3200,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "productId": "INV033", "quantity": 720, "unit": "gr" }, // Papa Prefrita
            { "productId": "INV005", "quantity": 60, "unit": "ml" }   // Aceite para Freír
        ]
    },
    {
        "id": "REC_PAPAS_CHEDDAR",
        "name": "Papas Fritas Cheddar",
        "category": "Acompañamientos",
        "type": "recipe",
        "status": "active",
        "salePrice": 2800,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "productId": "INV033", "quantity": 420, "unit": "gr" }, // Papa Prefrita
            { "productId": "INV096", "quantity": 80, "unit": "ml" },  // Queso Cheddar Fundido
            { "productId": "INV005", "quantity": 35, "unit": "ml" }   // Aceite para Freír
        ]
    },
    {
        "id": "REC_PALITOS_MOZZARELLA",
        "name": "Palitos Mozzarella (6 un)",
        "category": "Acompañamientos",
        "type": "recipe",
        "status": "active",
        "salePrice": 6000,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "productId": "INV097", "quantity": 6, "unit": "un" },   // Bastones Mozzarella
            { "productId": "INV005", "quantity": 30, "unit": "ml" }   // Aceite para Freír
        ]
    },
    {
        "id": "REC_ARITOS_CEBOLLA",
        "name": "Aritos de Cebolla (12 un)",
        "category": "Acompañamientos",
        "type": "recipe",
        "status": "active",
        "salePrice": 2700,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "productId": "INV008", "quantity": 180, "unit": "gr" }, // Cebolla
            { "productId": "INV098", "quantity": 50, "unit": "gr" },  // Panko / Pan Rallado
            { "productId": "INV005", "quantity": 30, "unit": "ml" }   // Aceite para Freír
        ]
    },
    {
        "id": "REC_CAF_ESPRESSO_SIMPLE",
        "name": "Espresso Simple",
        "category": "Cafetería",
        "type": "recipe",
        "status": "active",
        "salePrice": 2000,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "productId": "INV088", "quantity": 9, "unit": "gr" }    // Café en Grano Expreso
        ]
    },
    {
        "id": "REC_CAF_ESPRESSO_DOBLE",
        "name": "Espresso Doble",
        "category": "Cafetería",
        "type": "recipe",
        "status": "active",
        "salePrice": 2200,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "productId": "INV088", "quantity": 18, "unit": "gr" }   // Café en Grano Expreso
        ]
    },
    {
        "id": "REC_CAF_AMERICANO",
        "name": "Café Americano",
        "category": "Cafetería",
        "type": "recipe",
        "status": "active",
        "salePrice": 2500,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "productId": "INV088", "quantity": 9, "unit": "gr" },   // Café en Grano Expreso
            { "productId": "INV095", "quantity": 150, "unit": "ml" }  // Agua Purificada
        ]
    },
    {
        "id": "REC_CAF_CAPUCCINO",
        "name": "Capuccino",
        "category": "Cafetería",
        "type": "recipe",
        "status": "active",
        "salePrice": 3000,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "productId": "INV088", "quantity": 9, "unit": "gr" },   // Café en Grano Expreso
            { "productId": "INV021", "quantity": 150, "unit": "ml" }  // Leche Entera
        ]
    },
    {
        "id": "REC_CAF_MOKACCINO",
        "name": "Mokaccino",
        "category": "Cafetería",
        "type": "recipe",
        "status": "active",
        "salePrice": 3500,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "productId": "INV088", "quantity": 9, "unit": "gr" },   // Café en Grano Expreso
            { "productId": "INV021", "quantity": 120, "unit": "ml" }, // Leche Entera
            { "productId": "INV090", "quantity": 20, "unit": "gr" }   // Chocolate en Polvo / Cacao
        ]
    },
    {
        "id": "REC_CAF_CAFE_HELADO",
        "name": "Café Helado",
        "category": "Cafetería",
        "type": "recipe",
        "status": "active",
        "salePrice": 4000,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "productId": "INV088", "quantity": 9, "unit": "gr" },   // Café en Grano Expreso
            { "productId": "INV021", "quantity": 150, "unit": "ml" }, // Leche Entera
            { "productId": "INV022", "quantity": 30, "unit": "gr" }   // Crema de Leche
        ]
    },
    {
        "id": "REC_JUGO_NATURAL",
        "name": "Jugo Natural (480cc)",
        "category": "Bebidas",
        "type": "recipe",
        "status": "active",
        "salePrice": 2500,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "productId": "INV028", "quantity": 150, "unit": "gr" }, // Frutilla Congelada/Natural
            { "productId": "INV095", "quantity": 250, "unit": "ml" }, // Agua Purificada
            { "productId": "INV010", "quantity": 30, "unit": "gr" }   // Azúcar Granulada
        ]
    },
    {
        "id": "REC_BATIDO_LECHE",
        "name": "Batido con Leche (480cc)",
        "category": "Bebidas",
        "type": "recipe",
        "status": "active",
        "salePrice": 3200,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "productId": "INV028", "quantity": 150, "unit": "gr" }, // Frutilla Congelada/Natural
            { "productId": "INV021", "quantity": 250, "unit": "ml" }, // Leche Entera
            { "productId": "INV010", "quantity": 30, "unit": "gr" }   // Azúcar Granulada
        ]
    },
    {
        "id": "REC_LIMONADA",
        "name": "Limonada Tradicional (480cc)",
        "category": "Bebidas",
        "type": "recipe",
        "status": "active",
        "salePrice": 3800,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "productId": "INV087", "quantity": 80, "unit": "ml" },  // Limón Sutil
            { "productId": "INV095", "quantity": 300, "unit": "ml" }, // Agua Purificada
            { "productId": "INV010", "quantity": 40, "unit": "gr" }   // Azúcar Granulada
        ]
    },
    {
        "id": "REC_ALM_POLLO_MONGOLIANO",
        "name": "Almuerzo Pollo Mongoliano",
        "category": "Almuerzos",
        "type": "recipe",
        "status": "active",
        "salePrice": 7000,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "productId": "INV017", "quantity": 200, "unit": "gr" }, // Pechuga de Pollo Filete
            { "productId": "INV094", "quantity": 80, "unit": "gr" },  // Cebollín
            { "productId": "INV027", "quantity": 30, "unit": "ml" },  // Salsa Soya
            { "productId": "INV009", "quantity": 150, "unit": "gr" }  // Arroz Grado 1
        ]
    },
    {
        "id": "REC_ALM_POLLO_PLANCHA",
        "name": "Almuerzo Pollo a la Plancha",
        "category": "Almuerzos",
        "type": "recipe",
        "status": "active",
        "salePrice": 7000,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "productId": "INV017", "quantity": 220, "unit": "gr" }, // Pechuga de Pollo Filete
            { "productId": "INV009", "quantity": 180, "unit": "gr" }, // Arroz Grado 1
            { "productId": "INV004", "quantity": 15, "unit": "ml" }   // Aceite
        ]
    },
    {
        "id": "REC_ALM_FIDEOS_BOLOÑESA",
        "name": "Almuerzo Fideos Boloñesa",
        "category": "Almuerzos",
        "type": "recipe",
        "status": "active",
        "salePrice": 7000,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "baseRecipeId": "BASE_FETUCCINI", "quantity": 1, "unit": "un" },
            { "productId": "INV016", "quantity": 120, "unit": "gr" }, // Carne Molida
            { "productId": "INV032", "quantity": 100, "unit": "gr" }  // Puré/Salsa Tomate
        ]
    },
    {
        "id": "REC_ALM_FIDEOS_PESTO",
        "name": "Almuerzo Fideos Pesto",
        "category": "Almuerzos",
        "type": "recipe",
        "status": "active",
        "salePrice": 7000,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": [
            { "baseRecipeId": "BASE_FETUCCINI", "quantity": 1, "unit": "un" },
            { "productId": "INV091", "quantity": 40, "unit": "gr" },  // Albahaca Fresca
            { "productId": "INV074", "quantity": 20, "unit": "gr" },  // Queso Parmesano
            { "productId": "INV004", "quantity": 20, "unit": "ml" }   // Aceite
        ]
    },
    {
        "id": "REC_ALM_LOMO_CERDO",
        "name": "Almuerzo Lomo de Cerdo",
        "category": "Almuerzos",
        "type": "recipe",
        "status": "pending_measurement",
        "salePrice": 7000,
        "yieldQuantity": 1,
        "yieldUnit": "un",
        "ingredients": []
    }
];

// Exportación defensiva para compatibilidad de pruebas
export const recipes = recipesData;