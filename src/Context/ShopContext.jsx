import React, { createContext, useState } from "react";
import all_product from '../Components/Assets/all_product';
import api from '../api/apiClient';

export const ShopContext = createContext(null);

const getDefaultCart = () => {
    let cart = {};
    for (let index = 0; index < all_product.length+1; index++) {
        cart[index] = 0;
    }
    return cart;
}

const ShopContextProvider = (props) => {
    const [cartItems, setCartItems] = useState(() => {
        const saved = localStorage.getItem('cartItems');
        return saved ? JSON.parse(saved) : getDefaultCart();
    });

    const addToCart = (itemId, qty = 1) => {
        setCartItems((prev) => {
            const updated = { ...prev, [itemId]: prev[itemId] + qty };
            localStorage.setItem('cartItems', JSON.stringify(updated));
            return updated;
        });
    };

    const removeFromCart = (itemId) => {
        setCartItems((prev) => {
            const updated = { ...prev, [itemId]: Math.max(0, prev[itemId] - 1) };
            localStorage.setItem('cartItems', JSON.stringify(updated));
            return updated;
        });
    };

    const updateCartItemCount = (itemId, count) => {
        setCartItems((prev) => {
            const updated = { ...prev, [itemId]: count };
            localStorage.setItem('cartItems', JSON.stringify(updated));
            return updated;
        });
    };

    const getTotalCartAmount = () => {
        let totalAmount = 0;
        for (const item in cartItems) {
            if (cartItems[item] > 0) {
                let itemInfo = all_product.find((product) => product.id === Number(item));
                totalAmount += itemInfo.new_price * cartItems[item];
            }
        }
        return totalAmount;
    };

    const getTotalCartItems = () => {
        let totalItem = 0;
        for (const item in cartItems) {
            if (cartItems[item] > 0) {
                totalItem += cartItems[item];
            }
        }
        return totalItem;
    };

    const clearCart = () => {
        const empty = getDefaultCart();
        setCartItems(empty);
        localStorage.removeItem('cartItems');
    };

    // Load the logged-in user's cart from the API and set it as the active cart
    const loadCartFromAPI = async () => {
        try {
            const data = await api('/api/cart');
            const cart = { ...getDefaultCart(), ...data.cartItems };
            setCartItems(cart);
            localStorage.setItem('cartItems', JSON.stringify(cart));
        } catch {
            // Not logged in or network error — leave cart as-is
        }
    };

    // Push the current local cart to the API (used on logout / checkout)
    const saveCartToAPI = async () => {
        try {
            await api('/api/cart', { method: 'PUT', body: { cartItems } });
        } catch {
            // ignore
        }
    };

    // Clear the server-side cart (used after checkout)
    const clearCartOnAPI = async () => {
        try {
            await api('/api/cart', { method: 'DELETE' });
        } catch {
            // ignore
        }
    };

    const contextValue = {
        getTotalCartItems,
        getTotalCartAmount,
        all_product,
        cartItems,
        addToCart,
        removeFromCart,
        updateCartItemCount,
        clearCart,
        loadCartFromAPI,
        saveCartToAPI,
        clearCartOnAPI,
    };

    return (
        <ShopContext.Provider value={contextValue}>
            {props.children}
        </ShopContext.Provider>
    );
};

export default ShopContextProvider;
