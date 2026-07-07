import React, { createContext, useState } from "react";
import all_product from '../Components/Assets/all_product'

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

    const addToCart = (itemId) => {
        setCartItems((prev) => {
            const updated = { ...prev, [itemId]: prev[itemId] + 1 };
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

    const contextValue = {
        getTotalCartItems,
        getTotalCartAmount,
        all_product,
        cartItems,
        addToCart,
        removeFromCart,
        updateCartItemCount,
        clearCart,
    };

    return (
        <ShopContext.Provider value={contextValue}>
            {props.children}
        </ShopContext.Provider>
    );
};

export default ShopContextProvider;
