export const MOVEMENT_TYPES = {
    PURCHASE: "purchase",
    SALE: "sale",
    WASTE: "waste",
    ADJUSTMENT: "adjustment",
};

export const inventoryMovements = [
    // HARINA

    {
        id: "MOV001",
        productId: "INV001",
        type: MOVEMENT_TYPES.PURCHASE,
        quantity: 50,
        unitCost: 1000,
        movementDate: "2026-09-01",
        reference: "OC-1001",
        notes: "",
    },

    {
        id: "MOV002",
        productId: "INV001",
        type: MOVEMENT_TYPES.WASTE,
        quantity: -2,
        unitCost: null,
        movementDate: "2026-09-03",
        reference: "Merma",
        notes: "Harina húmeda",
    },

    // QUESO

    {
        id: "MOV003",
        productId: "INV002",
        type: MOVEMENT_TYPES.PURCHASE,
        quantity: 20,
        unitCost: 4000,
        movementDate: "2026-09-02",
        reference: "OC-1004",
        notes: "",
    },

    // TOMATE

    {
        id: "MOV004",
        productId: "INV003",
        type: MOVEMENT_TYPES.PURCHASE,
        quantity: 15,
        unitCost: 1200,
        movementDate: "2026-09-03",
        reference: "OC-1003",
        notes: "",
    },

    {
        id: "MOV005",
        productId: "INV003",
        type: MOVEMENT_TYPES.WASTE,
        quantity: -1,
        unitCost: null,
        movementDate: "2026-09-05",
        reference: "Merma",
        notes: "Producto deteriorado",
    },

    // COCA COLA

    {
        id: "MOV006",
        productId: "INV034",
        type: MOVEMENT_TYPES.PURCHASE,
        quantity: 96,
        unitCost: 600,
        movementDate: "2026-09-06",
        reference: "Stock inicial",
        notes: "",
    },
];