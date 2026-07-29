import React, { createContext, useContext, useEffect, useState } from 'react';
import { trackEvent } from '../utils/analytics';
import api from '../api/apiClient';
import { AuthContext } from './AuthContext';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  // Wishlist lives entirely on the server for logged-in users; in-memory only for guests.
  const [wishlist, setWishlist] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);

  const { user } = useContext(AuthContext);

  // On mount, if the user is already logged in (e.g. page refresh), hydrate the
  // wishlist from the server so the navbar count and heart icons are correct.
  useEffect(() => {
    if (user) {
      loadWishlistFromAPI();
    } else {
      setWishlist([]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleWishlist = (productId) => {
    const removing = wishlist.includes(productId);
    trackEvent(removing ? 'WISHLIST_REMOVE' : 'WISHLIST_ADD', { productId });
    const next = removing
      ? wishlist.filter((id) => id !== productId)
      : [...wishlist, productId];
    setWishlist(next);
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
    setWishlist(prev => prev.filter(id => !productIds.includes(id)));
    setWishlistItems(prev => prev.filter(item => !productIds.includes(item.id)));
    if (user) {
      api('/api/wishlist', { method: 'DELETE' }).catch(() => {});
    }
  };

  // Fetch wishlist from the API and sync React state.
  const loadWishlistFromAPI = async () => {
    try {
      const data = await api('/api/wishlist');
      setWishlist(data.wishlist.map((item) => item.product_id));
      setWishlistItems(data.wishlist.map(item => ({
        ...item,
        id: item.product_id,
        image: item.image_url,
      })));
    } catch {
      // Not logged in or network error — leave wishlist as-is
    }
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlist, wishlistItems, toggleWishlist, isWishlisted, clearWishlistItems, loadWishlistFromAPI }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
