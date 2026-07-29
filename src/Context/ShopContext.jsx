import React, { createContext, useContext, useEffect, useState } from "react";
import api from '../api/apiClient';
import { trackEvent } from '../utils/analytics';
import { AuthContext } from './AuthContext';

export const ShopContext = createContext(null);

const getDefaultCart = () => ({});

const ShopContextProvider = (props) => {
    // Cart lives entirely on the server for logged-in users; in-memory only for guests.
    const [cartItems, setCartItems] = useState(getDefaultCart);
    const [allProducts, setAllProducts] = useState([]);

    const { user } = useContext(AuthContext);

    // Fetch full product catalogue from API once on mount.
    useEffect(() => {
        api('/api/products')
            .then(d => setAllProducts(d.products.map(p => ({ ...p, image: p.image_url }))))
            .catch(() => {});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Restore selected sizes from localStorage — the server does not track size
    // selections, so this remains a local UI preference.
    const [selectedSizes, setSelectedSizes] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('selectedSizes')) || {};
        } catch {
            return {};
        }
    });

    // On mount (or when user is already logged in from a page refresh), hydrate
    // the cart from the server so the navbar count and product pages are correct.
    useEffect(() => {
        if (user) {
            loadCartFromAPI();
        } else {
            // Guest — reset to empty in-memory cart
            setCartItems(getDefaultCart());
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const clearProductSize = (itemId) => {
        setSelectedSizes((prev) => {
            const updated = { ...prev };
            delete updated[itemId];
            localStorage.setItem('selectedSizes', JSON.stringify(updated));
            return updated;
        });
    };

    const setProductSize = (itemId, size) => {
        setSelectedSizes((prev) => {
            const updated = { ...prev, [itemId]: size };
            localStorage.setItem('selectedSizes', JSON.stringify(updated));
            return updated;
        });
    };

    // Helper: persist the given cart object to the server (fire-and-forget).
    const syncCartToServer = (cart) => {
        if (!user) return;
        api('/api/cart', { method: 'PUT', body: { cartItems: cart } }).catch(() => {});
    };

    const addToCart = (itemId, qty = 1) => {
        trackEvent('CART_ADD', { productId: itemId, meta: { qty } });
        const updated = { ...cartItems, [itemId]: (cartItems[itemId] || 0) + qty };
        setCartItems(updated);
        syncCartToServer(updated);
    };

    const removeFromCart = (itemId) => {
        trackEvent('CART_REMOVE', { productId: itemId, meta: { qty: 1 } });
        const newQty = Math.max(0, (cartItems[itemId] || 1) - 1);
        const updated = { ...cartItems, [itemId]: newQty };
        setCartItems(updated);
        if (newQty === 0) clearProductSize(itemId);
        syncCartToServer(updated);
    };

    const updateCartItemCount = (itemId, count) => {
        const updated = { ...cartItems, [itemId]: count };
        setCartItems(updated);
        if (count === 0) clearProductSize(itemId);
        syncCartToServer(updated);
    };

    const getTotalCartAmount = () => {
        let totalAmount = 0;
        for (const item in cartItems) {
            if (cartItems[item] > 0) {
                const itemInfo = allProducts.find((product) => product.id === Number(item));
                if (itemInfo) totalAmount += itemInfo.new_price * cartItems[item];
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
        setCartItems(getDefaultCart());
    };

    // Load the logged-in user's cart from the API and set it as the active cart
    const loadCartFromAPI = async () => {
        try {
            const data = await api('/api/cart');
            const cart = { ...getDefaultCart(), ...data.cartItems };
            setCartItems(cart);
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
        all_product: allProducts,
        cartItems,
        addToCart,
        removeFromCart,
        updateCartItemCount,
        clearCart,
        loadCartFromAPI,
        saveCartToAPI,
        clearCartOnAPI,
        selectedSizes,
        setProductSize,
    };

    return (
        <ShopContext.Provider value={contextValue}>
            {props.children}
        </ShopContext.Provider>
    );
};

export default ShopContextProvider;
