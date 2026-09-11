export function calculateStock(
    productId,
    movements
) {
    return movements
        .filter(
            (movement) =>
                movement.productId === productId
        )
        .reduce(
            (total, movement) =>
                total + movement.quantity,
            0
        );
}

export function calculateInventoryValue(
    productId,
    movements,
    costPerUnit
) {
    const stock = calculateStock(
        productId,
        movements
    );

    return stock * costPerUnit;
}

export function getStockStatus(
    stock,
    minStock
) {
    if (stock <= 0) {
        return {
            text: "Agotado",
            className: "danger",
        };
    }

    if (stock <= minStock) {
        return {
            text: "Crítico",
            className: "warning",
        };
    }

    return {
        text: "Disponible",
        className: "success",
    };
}

export function getProductMovements(
    productId,
    movements
) {
    return movements.filter(
        (movement) =>
            movement.productId === productId
    );
}

export function applyMovementsToInventory(
    inventory,
    movements
) {
    return inventory.map((item) => {
        const hasMovements =
            movements.some(
                (movement) =>
                    movement.productId === item.id
            );

        if (!hasMovements) {
            return item;
        }

        return {
            ...item,
            onHand: calculateStock(
                item.id,
                movements
            ),
        };
    });
}
