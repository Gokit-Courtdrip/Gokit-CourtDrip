// Combine all product data into one master list
const allProducts = (window.products || []).concat(window.nba_products || []);

// Ensure products are loaded
if (typeof allProducts === 'undefined' || allProducts.length === 0) {
    console.error("CRITICAL: Product data is not loaded. Make sure 'products.js' is included and the nba_products array is defined.");
}

/**
 * This function checks the cart for items created by older code that are missing a unique ID.
 * It assigns a unique ID to them and saves the updated cart back to localStorage.
 * This makes the cart "self-healing" and ensures all items can be removed correctly.
 */
function migrateCartData() {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    let cartWasModified = false;
    cart.forEach(item => {
        if (typeof item.id === 'undefined') {
            item.id = Date.now() + Math.random(); // Assign a unique ID
            cartWasModified = true;
        }
    });
    if (cartWasModified) {
        localStorage.setItem('cart', JSON.stringify(cart));
    }
}

// --- Shipping Configuration ---
const shippingOptions = [{
    id: 'standard',
    name: 'Standard',
    price: 25.00,
    eta: '1 - 4 WEEKS'
}];
let selectedShipping = shippingOptions[0]; // Default to standard shipping

function updateCartNav() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);
    const cartBadge = document.getElementById('cartBadge');

    if (cartBadge) {
        if (totalItems > 0) {
            cartBadge.textContent = totalItems;
            cartBadge.classList.add('show');
        } else {
            cartBadge.classList.remove('show');
        }
    }
}

function findProduct(productId) {
    return allProducts.find(p => p.id === productId);
}

function renderCart() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartItemsDiv = document.getElementById('cart-items');
    const summarySubtotalDiv = document.getElementById('summary-subtotal');
    const discountRow = document.getElementById('discount-row');
    const summaryDiscountDiv = document.getElementById('summary-discount');
    const cartSummaryDiv = document.getElementById('cart-summary');
    const itemCountDiv = document.getElementById('item-count');
    const clearCartBtn = document.getElementById('clear-cart-btn');
    const freeShippingMessageEl = document.getElementById('free-shipping-message');

    cartItemsDiv.innerHTML = '';

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = `
        <div class="empty-cart">
            <i class="fas fa-shopping-cart"></i>
            <p>Your cart is empty.</p>
            <a href="index.html" class="action-btn secondary" style="margin-top: 24px; text-decoration: none;">
                <i class="fas fa-arrow-left"></i>
                Start Shopping
            </a>
        </div>
    `;
        cartSummaryDiv.style.display = 'none';
        itemCountDiv.innerHTML = '';
        clearCartBtn.style.display = 'none';
        freeShippingMessageEl.style.display = 'none';
        document.getElementById('recommendations-section').style.display = 'none'; // Hide recommendations if cart is empty
        return;
    }

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    clearCartBtn.style.display = 'flex';
    itemCountDiv.innerHTML = `<div class="item-count">${totalItems} item${totalItems > 1 ? 's' : ''} in cart</div>`;

    const fragment = document.createDocumentFragment();
    let subtotal = 0;

    cart.forEach(item => {
        const baseProduct = findProduct(item.productId);

        const itemPrice = parseFloat(item.price) || 0;
        const itemQuantity = parseInt(item.quantity) || 1;
        const itemSubtotal = itemPrice * itemQuantity;
        subtotal += itemSubtotal;

        const template = document.getElementById('cart-item-template');
        const clone = template.content.cloneNode(true);
        const div = clone.querySelector('.cart-item');
        div.dataset.cartItemId = item.id;

        const imageContainer = clone.querySelector('.cart-img');
        let imageHTML = item.image || (baseProduct ? baseProduct.image : '');
        if (imageHTML && !imageHTML.includes('<img')) {
            if (imageHTML.includes('.png') || imageHTML.includes('.jpg')) {
                imageHTML = `<img src="${imageHTML}" alt="${baseProduct ? baseProduct.name : 'Jersey'}" style="width:100%; height:100%; object-fit:contain;">`;
            }
        }
        imageContainer.innerHTML = imageHTML;

        clone.querySelector('.cart-item-name').textContent = baseProduct ? baseProduct.name : (item.name || 'Unknown Jersey');
        clone.querySelector('.cart-item-price').textContent = `AED ${itemPrice.toFixed(2)}`;
        clone.querySelector('.cart-qty').textContent = itemQuantity;
        clone.querySelector('.cart-item-subtotal').textContent = `AED ${itemSubtotal.toFixed(2)}`;

        const customizationList = clone.querySelector('.cart-item-customization');
        let customizationDetails = '';
        // Universal style
        if (item.playerName || item.playerNumber) {
            customizationDetails += `<li>Name/Number: ${item.playerName || ''} #${item.playerNumber || ''}</li>`;
        }
        // NBA style
        if (item.customizationStyle) {
            customizationDetails += `<li>Style: ${item.customizationStyle.charAt(0).toUpperCase() + item.customizationStyle.slice(1)}</li>`;
        }
        // Football style
        if (item.patches && item.patches.length > 0) {
            customizationDetails += `<li>Patches: ${item.patches.join(', ')}</li>`;
        }
        if (customizationDetails) {
            customizationList.innerHTML = customizationDetails;
        } else {
            customizationList.remove();
        }

        fragment.appendChild(clone);
    });

    cartItemsDiv.appendChild(fragment);

    // --- Discount and Total Calculation ---
    const appliedDiscount = JSON.parse(localStorage.getItem('appliedDiscount'));
    let discountAmount = 0;
    const discountInput = document.getElementById('discount-code-input');
    const applyBtn = document.getElementById('apply-discount-btn');
    const removeBtn = document.getElementById('remove-discount-btn');

    if (appliedDiscount) {
        if (appliedDiscount.type === 'percent') {
            discountAmount = (subtotal * appliedDiscount.value) / 100;
        } else if (appliedDiscount.type === 'fixed') {
            discountAmount = appliedDiscount.value;
        }
        discountAmount = Math.min(discountAmount, subtotal); // Cannot discount more than the subtotal

        summaryDiscountDiv.textContent = `- AED ${discountAmount.toFixed(2)}`;
        discountRow.style.display = 'flex';
        discountInput.value = appliedDiscount.code;
        discountInput.disabled = true;
        applyBtn.style.display = 'none';
        removeBtn.style.display = 'inline-block';
    } else {
        discountRow.style.display = 'none';
        discountInput.value = '';
        discountInput.disabled = false;
        applyBtn.style.display = 'inline-block';
        removeBtn.style.display = 'none';
    }

    const isEligibleForFreeStandardShipping = subtotal >= 250;
    let finalShippingCost = selectedShipping.price;
    if (isEligibleForFreeStandardShipping && selectedShipping.id === 'standard') {
        finalShippingCost = 0;
    }

    if (isEligibleForFreeStandardShipping) {
        freeShippingMessageEl.innerHTML = `<i class="fas fa-truck"></i> You qualify for FREE standard shipping!`;
        freeShippingMessageEl.style.display = 'block';
    } else {
        freeShippingMessageEl.style.display = 'none';
    }

    const total = subtotal - discountAmount + finalShippingCost;
    summarySubtotalDiv.textContent = `AED ${subtotal.toFixed(2)}`;

    const shippingRow = document.getElementById('shipping-row');
    const summaryShippingDiv = document.getElementById('summary-shipping');
    summaryShippingDiv.textContent = finalShippingCost === 0 ? 'Free' : `AED ${finalShippingCost.toFixed(2)}`;
    shippingRow.style.display = 'flex';

    document.getElementById('cart-total').innerHTML = `Total: AED ${total.toFixed(2)}`;
    cartSummaryDiv.style.display = 'block';

    renderRecommendations(); // Call recommendations
}

function handleCartActions(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const cartItemEl = target.closest('.cart-item');
    if (!cartItemEl) return;
    const cartItemId = parseFloat(cartItemEl.dataset.cartItemId);
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const itemIndex = cart.findIndex(item => item.id === cartItemId);
    if (itemIndex === -1) return;
    const action = target.dataset.action;
    if (action === 'increase') {
        cart[itemIndex].quantity++;
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCart();
        showToast('Quantity updated');
    } else if (action === 'decrease') {
        if (cart[itemIndex].quantity > 1) {
            cart[itemIndex].quantity--;
            localStorage.setItem('cart', JSON.stringify(cart));
            renderCart();
            showToast('Quantity updated');
        }
    } else if (action === 'remove') {
        cartItemEl.classList.add('removing');
        setTimeout(() => {
            cart.splice(itemIndex, 1);
            localStorage.setItem('cart', JSON.stringify(cart));
            showToast('Item removed from cart');
            renderCart();
        }, 400);
    }
}

function applyDiscountCode() {
    const input = document.getElementById('discount-code-input');
    const code = input.value.trim().toUpperCase();

    // 1. Hardcoded "public" codes available to everyone
    const publicCodes = {
        'SALE10': { type: 'percent', value: 10 },
        'GOKIT50': { type: 'fixed', value: 50 }
    };

    // 2. User-specific codes from sign-up (e.g., NEWBIE10)
    const userDiscountCodes = JSON.parse(localStorage.getItem('discountCodes')) || [];

    // 3. Check usage limits
    const usedCodes = JSON.parse(localStorage.getItem('usedCodes')) || {};
    const codeUses = usedCodes[code] || 0;

    if (codeUses >= 3) {
        showToast('This discount code has reached its usage limit.');
        return;
    }

    let discountDetails = null;

    // Check public codes first
    if (publicCodes[code]) {
        discountDetails = { code, ...publicCodes[code] };
    }
    // Then check user-specific codes obtained from sign-up
    else if (userDiscountCodes.includes(code)) {
        // Assume all sign-up codes are 10% off, as per the NEWBIE10 example
        discountDetails = { code, type: 'percent', value: 10 };
    }

    if (discountDetails) {
        localStorage.setItem('appliedDiscount', JSON.stringify(discountDetails));
        showToast(`Discount "${code}" applied!`);
        renderCart();
    } else {
        showToast('Invalid or expired discount code.');
    }
}

/*
// --- FUTURE: Example of how to validate codes with a backend (like Firebase) ---
// This would replace the current applyDiscountCode function.
// You would need to set up a backend endpoint (e.g., a Firebase Cloud Function)
// that checks the code against your database.

async function applyDiscountCodeWithBackend() {
    const input = document.getElementById('discount-code-input');
    const code = input.value.trim().toUpperCase();
    const applyBtn = document.getElementById('apply-discount-btn');
    const originalBtnText = applyBtn.textContent;
    applyBtn.textContent = 'Checking...';
    applyBtn.disabled = true;

    try {
        // This URL would point to your backend function (e.g., a Firebase Cloud Function)
        const response = await fetch(`https://your-backend-api.com/validate-discount?code=${code}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Invalid discount code.');
        }

        localStorage.setItem('appliedDiscount', JSON.stringify(data.discount));
        showToast(`Discount "${code}" applied!`);
        renderCart();
    } catch (error) {
        showToast(error.message);
    } finally {
        applyBtn.textContent = originalBtnText;
        applyBtn.disabled = false;
    }
}
*/

function removeDiscountCode() {
    localStorage.removeItem('appliedDiscount');
    showToast('Discount removed.');
    renderCart();
}

function clearCart() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length > 0 && confirm("Are you sure you want to remove all items from your cart?")) {
        localStorage.removeItem('cart');
        localStorage.removeItem('appliedDiscount');
        showToast('Cart has been cleared.');
        renderCart();
    }
}

function renderRecommendations() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const recommendationsSection = document.getElementById('recommendations-section');
    const recommendedProductsDiv = document.getElementById('recommended-products');
    recommendedProductsDiv.innerHTML = '';
    const cartProductIds = new Set(cart.map(item => item.productId));
    const cartTags = new Set(); // Using tags for better recommendations
    cart.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product && product.tags) {
            product.tags.forEach(tag => cartTags.add(tag));
        }
    });
    let recommendations = [];
    if (cartTags.size > 0) {
        recommendations = allProducts.filter(p =>
            !cartProductIds.has(p.id) &&
            p.tags && p.tags.some(tag => cartTags.has(tag))
        );
    }
    if (recommendations.length < 4) {
        const otherProducts = allProducts.filter(p => !cartProductIds.has(p.id));
        for (const p of otherProducts) {
            if (recommendations.length >= 4) break;
            if (!recommendations.some(rec => rec.id === p.id)) {
                recommendations.push(p);
            }
        }
    }
    const finalRecommendations = recommendations.sort(() => 0.5 - Math.random()).slice(0, 4);
    if (finalRecommendations.length > 0) {
        const fragment = document.createDocumentFragment();
        finalRecommendations.forEach(product => {
            let imageHTML = product.image || '';
            if (imageHTML && !imageHTML.includes('<img')) {
                if (imageHTML.includes('.png') || imageHTML.includes('.jpg')) {
                    imageHTML = `<img src="${imageHTML}" alt="${product.name}" style="width:100%; height:100%; object-fit:contain;">`;
                }
            }

            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                    <div class="product-card-img">${imageHTML}</div>
                    <div class="product-card-name">${product.name}</div>
                    <div class="product-card-price">AED ${parseFloat(product.price).toFixed(2)}</div>
                    <button class="product-card-btn" data-action="add-recommendation" data-product-id="${product.id}">Add to Cart</button>
                `;
            fragment.appendChild(card);
        });
        recommendedProductsDiv.appendChild(fragment);
        recommendationsSection.style.display = 'block';
    } else {
        recommendationsSection.style.display = 'none';
    }
}

function handleRecommendationAdd(event) {
    const target = event.target.closest('[data-action="add-recommendation"]');
    if (!target) return;
    const productId = parseInt(target.dataset.productId);
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const newCartItem = { id: Date.now(), productId: product.id, quantity: 1, price: product.price, playerName: '', playerNumber: '', patches: [] };
    cart.push(newCartItem);
    localStorage.setItem('cart', JSON.stringify(cart));
    showToast(`${product.name} added to cart!`);
    renderCart();
}

function renderShippingOptions() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const isEligibleForFreeStandardShipping = subtotal >= 250;

    const container = document.getElementById('shipping-options-container');
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    shippingOptions.forEach(option => {
        const label = document.createElement('label');
        let priceDisplay = `AED ${option.price.toFixed(2)}`;
        if (option.id === 'standard' && isEligibleForFreeStandardShipping) {
            priceDisplay = 'Free';
        }
        label.className = 'shipping-option';
        if (option.id === selectedShipping.id) {
            label.classList.add('selected');
        }
        label.innerHTML = `
                <input type="radio" name="shipping" value="${option.id}" ${option.id === selectedShipping.id ? 'checked' : ''}>
                <span class="checkmark"></span>
                <div class="shipping-option-details">
                    <div>
                        <div class="shipping-option-name">${option.name} Shipping</div>
                        <div class="shipping-option-eta">Est. ${option.eta}</div>
                    </div>
                    <div class="shipping-option-price">${priceDisplay}</div>
                </div>
            `;
        fragment.appendChild(label);
    });
    container.appendChild(fragment);
}

function handleShippingChange(event) {
    const selectedId = event.target.value;
    selectedShipping = shippingOptions.find(opt => opt.id === selectedId) || shippingOptions[0];
    document.querySelectorAll('.shipping-option').forEach(label => {
        label.classList.remove('selected');
    });
    event.target.closest('.shipping-option').classList.add('selected');
    renderCart();
}

// --- Modal Logic ---
const checkoutModal = document.getElementById('checkout-modal');
const checkoutBtn = document.getElementById('checkout-btn');
const closeModalBtn = document.getElementById('modal-close-btn');
const checkoutForm = document.getElementById('checkout-form');
const checkoutFormView = document.getElementById('checkout-form-view');
const checkoutSuccessView = document.getElementById('checkout-success-view');
const continueShoppingBtn = document.getElementById('continue-shopping-btn');

function openModal() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        showToast('Your cart is empty!');
        return;
    }
    renderShippingOptions();
    checkoutFormView.style.display = 'block';
    checkoutSuccessView.style.display = 'none';
    checkoutForm.reset(); // Reset first to clear previous state

    // Pre-fill form with saved details
    const savedDetails = JSON.parse(localStorage.getItem('checkoutDetails'));
    if (savedDetails) {
        document.getElementById('fullName').value = savedDetails.fullName || '';
        document.getElementById('email').value = savedDetails.email || '';
        document.getElementById('phone').value = savedDetails.phone || '';
        document.getElementById('address').value = savedDetails.address || '';
        document.getElementById('city').value = savedDetails.city || '';
        document.getElementById('postalCode').value = savedDetails.postalCode || '';
        document.getElementById('save-info-checkbox').checked = true;
    }

    checkoutModal.classList.add('show');
    document.body.classList.add('modal-open');
}

function closeModal() {
    checkoutModal.classList.remove('show');
    document.body.classList.remove('modal-open');
    if (checkoutSuccessView.style.display === 'block') {
        renderCart();
    }
}

function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.target;

    // --- Validation ---
    // Clear previous invalid states on new submission attempt
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

    if (!form.checkValidity()) {
        showToast('Please fill out all required fields.');
        // Add 'is-invalid' class to invalid fields for visual feedback
        form.querySelectorAll(':invalid').forEach(field => {
            field.classList.add('is-invalid');
        });
        return; // Stop the submission
    }

    // Save or remove user details based on checkbox
    const saveInfoCheckbox = document.getElementById('save-info-checkbox');
    if (saveInfoCheckbox.checked) {
        const userDetails = {
            fullName: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            postalCode: document.getElementById('postalCode').value,
        };
        localStorage.setItem('checkoutDetails', JSON.stringify(userDetails));
    } else {
        localStorage.removeItem('checkoutDetails');
    }

    const submitBtn = checkoutForm.querySelector('.form-submit-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="loading"></span> Placing Order...';
    submitBtn.disabled = true;

    setTimeout(async () => {
        const appliedDiscount = JSON.parse(localStorage.getItem('appliedDiscount'));
        if (appliedDiscount) {
            const usedCodes = JSON.parse(localStorage.getItem('usedCodes')) || {};
            const code = appliedDiscount.code;
            usedCodes[code] = (usedCodes[code] || 0) + 1;
            localStorage.setItem('usedCodes', JSON.stringify(usedCodes));
        }

        // --- Prepare and Save Order Data ---
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let discountAmount = 0;
        if (appliedDiscount) {
            discountAmount = (appliedDiscount.type === 'percent') ? (subtotal * appliedDiscount.value) / 100 : appliedDiscount.value;
            discountAmount = Math.min(discountAmount, subtotal);
        }
        const isEligibleForFreeStandardShipping = subtotal >= 250;
        let finalShippingCost = selectedShipping.price;
        if (isEligibleForFreeStandardShipping && selectedShipping.id === 'standard') {
            finalShippingCost = 0;
        }
        const total = subtotal - discountAmount + finalShippingCost;

        const orderData = {
            customer: {
                name: document.getElementById('fullName').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                address: document.getElementById('address').value,
                city: document.getElementById('city').value,
                postalCode: document.getElementById('postalCode').value,
            },
            items: cart,
            subtotal: subtotal,
            discount: {
                code: appliedDiscount ? appliedDiscount.code : 'None',
                amount: discountAmount
            },
            shipping: {
                method: selectedShipping.name,
                cost: finalShippingCost
            },
            total: total,
            timestamp: firebase.firestore.FieldValue.serverTimestamp() // Use Firebase's server time
        };

        console.log("Placing order with data:", orderData);
        // Here you would typically send this data to your backend or a service like Firebase
        if (db) {
            try {
                await db.collection('orders').add(orderData);
                console.log("Order successfully saved to Firebase.");
            } catch (error) {
                console.error("Error writing order to Firebase: ", error);
                showToast("Error: Could not save your order. Please try again.", "fas fa-exclamation-triangle", true);
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Place Order';
                return; // Stop execution if order saving fails
            }
        }



        localStorage.setItem('cart', '[]');
        localStorage.removeItem('appliedDiscount');
        checkoutFormView.style.display = 'none';
        checkoutSuccessView.style.display = 'block';
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }, 1500);
}

// Toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initialize cart on page load
document.addEventListener('DOMContentLoaded', function () {
    migrateCartData(); // Fix any old cart items without IDs
    renderCart();
    updateCartNav();
    document.getElementById('cart-items').addEventListener('click', handleCartActions);
    document.getElementById('apply-discount-btn').addEventListener('click', applyDiscountCode);
    document.getElementById('remove-discount-btn').addEventListener('click', removeDiscountCode);
    document.getElementById('clear-cart-btn').addEventListener('click', clearCart);
    document.getElementById('shipping-options-container').addEventListener('change', handleShippingChange);
    document.getElementById('recommended-products').addEventListener('click', handleRecommendationAdd);

    // Modal event listeners
    checkoutBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    continueShoppingBtn.addEventListener('click', closeModal);
    checkoutModal.addEventListener('click', (event) => {
        if (event.target === checkoutModal) closeModal();
    });
    checkoutForm.addEventListener('submit', handleFormSubmit);

    // Add listener to remove invalid state on input
    checkoutForm.addEventListener('input', (event) => {
        if (event.target.classList.contains('is-invalid')) {
            event.target.classList.remove('is-invalid');
        }
    });
});

// Handle page visibility changes for cart updates
document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
        renderCart();
    }
});

// Listen for storage changes to sync cart across tabs
window.addEventListener('storage', (event) => {
    // When cart data changes in another tab, re-render to keep it in sync.
    if (event.key === 'cart' || event.key === 'appliedDiscount' || event.key === 'usedCodes') {
        console.log(`Storage key '${event.key}' updated in another tab. Syncing...`);
        renderCart();
        updateCartNav();
    }
});

// Navbar Toggler for mobile
const navbarToggler = document.getElementById('navbar-toggler');
const navLinks = document.querySelector('.nav-links');
navbarToggler.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

// Make functions available for testing if running in a test environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        migrateCartData,
        updateCartNav,
        findProduct,
        renderCart,
        handleCartActions,
        applyDiscountCode,
        removeDiscountCode,
        clearCart,
        renderRecommendations,
        handleRecommendationAdd,
        renderShippingOptions,
        handleShippingChange,
        openModal,
        closeModal,
        handleFormSubmit,
        showToast,
        shippingOptions,
        selectedShipping
    };
}