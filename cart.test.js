/**
* @jest-environment jsdom 
*/

const fs = require('fs');
const path = require('path');

// Load the HTML file into JSDOM
const html = fs.readFileSync(path.resolve(__dirname, './cart.html'), 'utf8');

// Mock localStorage
const localStorageMock = (function () {
    let store = {};
    return {
        getItem: function (key) {
            return store[key] || null;
        },
        setItem: function (key, value) {
            store[key] = value.toString();
        },
        removeItem: function (key) {
            delete store[key];
        },
        clear: function () {
            store = {};
        },
    };
})();
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock confirm
Object.defineProperty(window, 'confirm', {
    value: jest.fn(() => true), // Always return true for tests
});

// Mock showToast so it doesn't throw an error in the test environment
Object.defineProperty(window, 'showToast', {
    value: jest.fn(),
});

describe('Shopping Cart Logic', () => {
    let cartLogic;

    beforeEach(() => {
        // Reset DOM and localStorage before each test
        document.body.innerHTML = html;
        localStorage.clear();
        jest.clearAllMocks();

        // Define products on the window object as the script expects
        window.products = [
            { id: 1, name: "Real Madrid Home 23/24", price: 75, tags: ['football'] },
        ];
        window.nba_products = [
            { id: 101, name: "Celtics Icon Edition 23/24", price: 85, tags: ['nba'] },
        ];

        // Load a fresh instance of cartLogic before each test.
        // This is the baseline for tests that don't have special suite-level setup.
        jest.isolateModules(() => {
            cartLogic = require('./cart.js');
        });
    });

    test('should render an empty cart message if localStorage is empty', () => {
        cartLogic.renderCart();
        const emptyCartMessage = document.querySelector('.empty-cart p');
        expect(emptyCartMessage).not.toBeNull();
        expect(emptyCartMessage.textContent).toBe('Your cart is empty.');
    });

    test('should render items that are in the cart', () => {
        const cartItems = [
            { id: 123, productId: 1, quantity: 2, price: 75 },
            { id: 456, productId: 101, quantity: 1, price: 85 },
        ];
        localStorage.setItem('cart', JSON.stringify(cartItems));

        cartLogic.renderCart();

        const renderedItems = document.querySelectorAll('.cart-item');
        expect(renderedItems.length).toBe(2);

        // Check first item details
        expect(renderedItems[0].querySelector('.cart-item-name').textContent).toBe('Real Madrid Home 23/24');
        expect(renderedItems[0].querySelector('.cart-qty').textContent).toBe('2');
        expect(renderedItems[0].querySelector('.cart-item-subtotal').textContent).toBe('AED 150.00');

        // Check total calculation
        const subtotal = 75 * 2 + 85 * 1;
        const shipping = 25; // Standard shipping
        const total = subtotal + shipping;
        expect(document.getElementById('summary-subtotal').textContent).toBe(`AED ${subtotal.toFixed(2)}`);
        expect(document.getElementById('cart-total').innerHTML).toBe(`Total: AED ${total.toFixed(2)}`);
    });

    test('should clear the cart when clearCart is called', () => {
        const cartItems = [{ id: 123, productId: 1, quantity: 1, price: 75 }];
        localStorage.setItem('cart', JSON.stringify(cartItems));

        cartLogic.clearCart();

        // The clearCart function uses localStorage.removeItem, which makes the key 'cart' unavailable.
        // Therefore, trying to getItem('cart') will correctly return null.
        expect(localStorage.getItem('cart')).toBeNull();
    });

    describe('Item Quantity Adjustments', () => {
        const cartItemId = 123;
        let cartItemElement;

        beforeEach(() => {
            // Reset mocks for this suite
            jest.clearAllMocks();

            // Load a fresh instance of cartLogic for this test suite
            jest.isolateModules(() => {
                cartLogic = require('./cart.js');
            });

            const cartItems = [{ id: cartItemId, productId: 1, quantity: 2, price: 75 }];
            localStorage.setItem('cart', JSON.stringify(cartItems));

            // We need to mock renderCart here as well, since handleCartActions calls it.
            cartLogic.renderCart = jest.fn();

            // Create a mock cart item element in the DOM for the event handler to find
            document.body.innerHTML += `
                <div class="cart-item" data-cart-item-id="${cartItemId}">
                    <button data-action="increase">+</button>
                    <button data-action="decrease">-</button>
                </div>
            `;
            cartItemElement = document.querySelector('.cart-item');
        });

        test('should increase an items quantity', () => {
            const increaseButton = cartItemElement.querySelector('[data-action="increase"]');
            const mockEvent = { target: increaseButton };
            cartLogic.handleCartActions(mockEvent);

            const updatedCart = JSON.parse(localStorage.getItem('cart'));
            expect(updatedCart[0].quantity).toBe(3);
            expect(window.showToast).toHaveBeenCalledWith('Quantity updated');
        });

        test('should decrease an items quantity', () => {
            const decreaseButton = cartItemElement.querySelector('[data-action="decrease"]');
            const mockEvent = { target: decreaseButton };
            cartLogic.handleCartActions(mockEvent);

            const updatedCart = JSON.parse(localStorage.getItem('cart'));
            expect(updatedCart[0].quantity).toBe(1);
            expect(window.showToast).toHaveBeenCalledWith('Quantity updated');
        });

        test('should not decrease quantity below 1', () => {
            // Set initial quantity to 1
            const cart = JSON.parse(localStorage.getItem('cart'));
            cart[0].quantity = 1;
            localStorage.setItem('cart', JSON.stringify(cart));

            const decreaseButton = cartItemElement.querySelector('[data-action="decrease"]');
            const mockEvent = { target: decreaseButton };
            cartLogic.handleCartActions(mockEvent);

            const updatedCart = JSON.parse(localStorage.getItem('cart'));
            expect(updatedCart[0].quantity).toBe(1); // Quantity should remain 1
            expect(window.showToast).not.toHaveBeenCalled(); // No toast should be shown
        });
    });

    describe('Discount Code Functionality', () => {
        beforeEach(() => {
            // Reset mocks for this suite to ensure a clean state
            jest.clearAllMocks();

            // Load a fresh instance of cartLogic for this test suite
            jest.isolateModules(() => {
                cartLogic = require('./cart.js');
            });

            // Set up a cart with one item for discount tests
            const cartItems = [{ id: 123, productId: 1, quantity: 2, price: 75 }]; // Subtotal = 150
            localStorage.setItem('cart', JSON.stringify(cartItems));

            // Clear any existing used codes
            localStorage.removeItem('usedCodes');
            localStorage.removeItem('appliedDiscount');

            // For discount logic tests, we can mock renderCart to avoid DOM complexity.
            // This isolates the logic we are actually testing.
            cartLogic.renderCart = jest.fn();
        });

        // Manually dispatch DOMContentLoaded ONCE before each test in this suite.
        // This ensures event listeners from the fresh cart.js module are attached.
        document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));

        test('should apply a valid percentage discount code', () => {
            document.getElementById('discount-code-input').value = 'SALE10';
            // Simulate a user click
            document.getElementById('apply-discount-btn').click();

            const appliedDiscount = JSON.parse(localStorage.getItem('appliedDiscount'));
            expect(appliedDiscount.code).toBe('SALE10');
            expect(window.showToast).toHaveBeenCalledWith('Discount "SALE10" applied!');
        });

        test('should apply a valid fixed discount code', () => {
            document.getElementById('discount-code-input').value = 'GOKIT50';
            document.getElementById('apply-discount-btn').click();

            const appliedDiscount = JSON.parse(localStorage.getItem('appliedDiscount'));
            expect(appliedDiscount.code).toBe('GOKIT50');
            expect(window.showToast).toHaveBeenCalledWith('Discount "GOKIT50" applied!');
        });

        test('should not apply an invalid discount code', () => {
            document.getElementById('discount-code-input').value = 'INVALIDCODE';
            document.getElementById('apply-discount-btn').click();

            expect(localStorage.getItem('appliedDiscount')).toBeNull();
            expect(window.showToast).toHaveBeenCalledWith('Invalid or expired discount code.');
        });

        test('should not apply a discount code that has reached its usage limit', () => {
            // Simulate using the code to its maximum limit
            localStorage.setItem('usedCodes', JSON.stringify({ 'SALE10': 3 }));

            document.getElementById('discount-code-input').value = 'SALE10';
            document.getElementById('apply-discount-btn').click();

            expect(localStorage.getItem('appliedDiscount')).toBeNull();
            expect(window.showToast).toHaveBeenCalledWith('This discount code has reached its usage limit.');
        });

        test('should remove an applied discount code', () => {
            // First apply a discount
            localStorage.setItem('appliedDiscount', JSON.stringify({
                code: 'SALE10',
                type: 'percent',
                value: 10
            }));

            // We need to call renderCart once to make the remove button visible
            // But we can use our mock for this.
            cartLogic.renderCart();

            // Simulate a click on the remove button
            document.getElementById('remove-discount-btn').click();

            expect(localStorage.getItem('appliedDiscount')).toBeNull();
            expect(window.showToast).toHaveBeenCalledWith('Discount removed.');
        });
    });
});
