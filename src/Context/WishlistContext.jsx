import React, { createContext, useContext, useState } from 'react';
import { trackEvent } from '../utils/analytics';
import api from '../api/apiClient';
import { AuthContext } from './AuthContext';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wishlist')) || []; }
    catch { return []; }
  });

  const { user } = useContext(AuthContext);

  const toggleWishlist = (productId) => {
    const removing = wishlist.includes(productId);
    trackEvent(removing ? 'WISHLIST_REMOVE' : 'WISHLIST_ADD', { productId });
    const next = removing
      ? wishlist.filter((id) => id !== productId)
      : [...wishlist, productId];
    setWishlist(next);
    localStorage.setItem('wishlist', JSON.stringify(next));
    // Sync to backend so loadWishlistFromAPI stays consistent
    if (user) {
      if (removing) {
        api(`/api/wishlist/${productId}`, { method: 'DELETE' }).catch(() => {});
      } else {
        api(`/api/wishlist/${productId}`, { method: 'POST' }).catch(() => {});
      }
    }
  };

  const isWishlisted = (productId) => wishlist.includes(productId);

  const clearWishlistItems = (productIds) => {
    const next = wishlist.filter((id) => !productIds.includes(id));
    setWishlist(next);
    localStorage.setItem('wishlist', JSON.stringify(next));
    // Sync removals to backend so wishlist stays consistent after checkout
    if (user) {
      productIds.forEach((id) => {
        api(`/api/wishlist/${id}`, { method: 'DELETE' }).catch(() => {});
      });
    }
  };

  // Fetch wishlist from the API and sync local state.
  // Called on /wishlist route mount to reflect server-side changes.
  const loadWishlistFromAPI = async () => {
    try {
      const data = await api('/api/wishlist');
      const ids = data.wishlist.map((item) => item.product_id);
      setWishlist(ids);
      localStorage.setItem('wishlist', JSON.stringify(ids));
    } catch {
      // Not logged in or network error — leave wishlist as-is
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isWishlisted, clearWishlistItems, loadWishlistFromAPI }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
