function renderCart() {
    cartItems.innerHTML = '';
    if (cart.length === 0) {
        cartItems.classList.add('empty');
        cartItems.textContent = 'Your cart is empty.';
        cartSummary.classList.add('d-none');
        return;
    }

    cartItems.classList.remove('empty');
    cartSummary.classList.remove('d-none');

    let total = 0;
    cart.forEach((item, index) => {
        total += item.price * item.quantity;

        const card = document.createElement('div');
        card.className = 'cart-card';

        card.innerHTML = `
            <h5>${item.name}</h5>
            <p>Price: AED ${item.price.toFixed(2)}</p>
            <p>Quantity: ${item.quantity}</p>
            <button class="btn-remove" aria-label="Remove ${item.name} from cart" data-index="${index}">Remove</button>
        `;
        cartItems.appendChild(card);
    });

    totalPriceEl.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="24" height="24" style="vertical-align: middle; margin-right: 8px; fill:#f0a500;">
            <path d="M7 2v2H3v4h4v2H3v4h4v2H3v4h4v2h6v-2h4v-4h-4v-2h4v-4h-4V4h-6zm2 10H9v-4h2v4z"/>
        </svg>
        AED ${total.toFixed(2)}
    `;
}

// Remove individual item
cartItems.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove')) {
        const index = parseInt(e.target.getAttribute('data-index'));
        cart.splice(index, 1);
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCart();
    }
});

// Clear entire cart
clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear your cart?')) {
        cart = [];
        localStorage.removeItem('cart');
        renderCart();
    }
});

// Checkout button (customize as needed)
checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    alert('Proceeding to checkout (functionality to be implemented).');
    // e.g., redirect to a checkout page
    // window.location.href = 'checkout.html';
});

// Initial render on page load
document.addEventListener('DOMContentLoaded', renderCart);
