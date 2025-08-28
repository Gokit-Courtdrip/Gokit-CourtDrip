// cart.js - Shared Shopping Cart Logic

// --- State Management ---
let cart = JSON.parse(localStorage.getItem('cart')) || [];

/**
 * Finds a product from the master product list.
 * IMPORTANT: Any page using this script must define a global `allProducts` array.
 * @param {number} productId The ID of the product to find.
 * @returns {object|null} The product object or null if not found.
 */
function findProduct(productId) {
    if (typeof allProducts === 'undefined' || !Array.isArray(allProducts)) {
        console.error("The global 'allProducts' array is not defined. Cart cannot display item details.");
        return null;
    }
    return allProducts.find(p => p.id === productId);
}

// --- Core Cart Functions ---

/**
 * Renders the current state of the cart to the UI.
 * This function is now robust and handles structured data from all product types.
 */
function updateCartDisplay() {
    const cartCountEl = document.getElementById('cart-count'); // For a simple badge
    const cartItemsEl = document.getElementById('cart-items'); // For the list in the overlay
    const cartTotalEl = document.getElementById('cart-total'); // For the total in the overlay

    // Don't run if the cart elements aren't on the current page
    if (!cartItemsEl || !cartTotalEl) {
        console.warn("Cart UI elements not found on this page. Cart logic will not render.");
        return;
    }

    const totalItems = cart.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);
    if (cartCountEl) {
        cartCountEl.textContent = totalItems;
    }

    if (cart.length === 0) {
        cartItemsEl.innerHTML = '<div id="cart-empty">Your cart is empty</div>';
        cartTotalEl.textContent = 'Total: AED 0.00';
    } else {
        cartItemsEl.innerHTML = cart.map(item => {
            const baseProduct = findProduct(item.productId);
            const itemName = baseProduct ? baseProduct.name : (item.name || 'Unknown Jersey');
            const itemPrice = parseFloat(item.price) || 0;
            const itemQuantity = parseInt(item.quantity) || 1;

            // Build customization details string
            let customizationHTML = '';
            if (item.playerName || item.playerNumber) {
                customizationHTML += `<div>Name/Number: ${item.playerName || ''} #${item.playerNumber || ''}</div>`;
            }
            if (item.customizationStyle) {
                customizationHTML += `<div>Style: ${item.customizationStyle.charAt(0).toUpperCase() + item.customizationStyle.slice(1)}</div>`;
            }
            if (item.patches && item.patches.length > 0) {
                customizationHTML += `<div>Patches: ${item.patches.join(', ')}</div>`;
            }

            return `
            <div class="cart-item" data-cart-id="${item.id}">
                <div class="cart-item-info">
                    <div class="cart-item-name">${itemName}</div>
                    <div class="cart-item-customization">${customizationHTML || 'Standard Jersey'}</div>
                    <div class="cart-item-price">AED ${itemPrice.toFixed(2)}</div>
                </div>
                <div class="cart-item-qty">${itemQuantity}</div>
                <button class="cart-item-remove" data-action="remove-from-cart">×</button>
            </div>
            `;
        }).join('');
    }

    const total = cart.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)), 0);
    cartTotalEl.textContent = `Total: AED ${total.toFixed(2)}`;
}

/**
 * Adds a fully formed item object to the cart.
 * The calling page is responsible for creating the item object.
 * @param {object} newItem The complete item object to add.
 */
function addToCart(newItem) {
    // This simplified version adds a new unique item every time.
    // A more advanced version could check for existing items with identical customizations.
    cart.push(newItem);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();

    // Show cart briefly for user feedback
    const cartOverlay = document.getElementById('cart-overlay');
    if (cartOverlay) {
        cartOverlay.classList.add('active');
        setTimeout(() => cartOverlay.classList.remove('active'), 2000);
    }
}

/**
 * Removes an item from the cart by its unique ID.
 * @param {number} cartId The unique ID of the cart item to remove.
 */
function removeFromCart(cartId) {
    const itemIndex = cart.findIndex(item => item.id === cartId);
    if (itemIndex > -1) {
        cart.splice(itemIndex, 1);
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
}

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', function () {
    updateCartDisplay();

    // Use event delegation for remove buttons for better performance and maintainability
    const cartItemsEl = document.getElementById('cart-items');
    if (cartItemsEl) {
        cartItemsEl.addEventListener('click', (e) => {
            if (e.target.matches('.cart-item-remove')) {
                const cartItemDiv = e.target.closest('.cart-item');
                const cartId = parseInt(cartItemDiv.dataset.cartId);
                removeFromCart(cartId);
            }
        });
    }
});