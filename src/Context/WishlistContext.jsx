import React, { createContext, useContext, useEffect, useState } from 'react';
import { trackEvent } from '../utils/analytics';
import api from '../api/apiClient';
import { AuthContext } from './AuthContext';
import resolveImage from '../Components/Assets/resolveImage';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  // Wishlist lives entirely on the server for logged-in users; in-memory only for guests.
  const [wishlist, setWishlist] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);

  const { user } = useContext(AuthContext);

  // Re-hydrate wishlist whenever auth state changes (login, logout, page refresh).
  useEffect(() => {
    if (user) {
      loadWishlistFromAPI();
    } else {
      setWishlist([]);
      setWishlistItems([]);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleWishlist = (productId) => {
    const removing = wishlist.includes(productId);
    trackEvent(removing ? 'WISHLIST_REMOVE' : 'WISHLIST_ADD', { productId });

    // Optimistic update of ID list
    setWishlist(prev =>
      removing ? prev.filter((id) => id !== productId) : [...prev, productId]
    );

    if (removing) {
      // Optimistic removal from items list
      setWishlistItems(prev => prev.filter(item => item.id !== productId));
      if (user) {
        api(`/api/wishlist/${productId}`, { method: 'DELETE' }).catch(() => {});
      }
    } else {
      if (user) {
        // Re-fetch after add to get full item data (name, image, price) for the Wishlist page
        api(`/api/wishlist/${productId}`, { method: 'POST' })
          .then(() => loadWishlistFromAPI())
          .catch(() => {});
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
        image: resolveImage(item.image_url),
      })));
    } catch {
      // Not logged in or network error — leave wishlist as-is
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlist, wishlistItems, toggleWishlist, isWishlisted, clearWishlistItems, loadWishlistFromAPI }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
