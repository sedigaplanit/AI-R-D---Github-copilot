import React, { createContext, useContext, useState } from 'react';
import { trackEvent } from '../utils/analytics';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wishlist')) || []; }
    catch { return []; }
  });

  const toggleWishlist = (productId) => {
    setWishlist((prev) => {
      const removing = prev.includes(productId);
      trackEvent(removing ? 'WISHLIST_REMOVE' : 'WISHLIST_ADD', { productId });
      const next = removing
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      localStorage.setItem('wishlist', JSON.stringify(next));
      return next;
    });
  };

  const isWishlisted = (productId) => wishlist.includes(productId);

  const clearWishlistItems = (productIds) => {
    setWishlist((prev) => {
      const next = prev.filter((id) => !productIds.includes(id));
      localStorage.setItem('wishlist', JSON.stringify(next));
      return next;
    });
  };

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isWishlisted, clearWishlistItems }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
