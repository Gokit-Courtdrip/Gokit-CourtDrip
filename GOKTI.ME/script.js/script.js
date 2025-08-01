// Load cart from localStorage
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Add to Cart buttons
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.add-to-cart');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const card = button.closest('.product-card');
            const name = card.querySelector('h3').innerText;
            const price = parseFloat(card.querySelector('p').innerText.replace(/[^\d.]/g, ''));
            const product = { name, price, quantity: 1 };

            addToCart(product);
        });
    });
});

// Add product to cart
function addToCart(product) {
    const existing = cart.find(item => item.name === product.name);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push(product);
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    alert(`${product.name} added to cart!`);
}
