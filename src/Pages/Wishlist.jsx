import React, { useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../Context/WishlistContext';
import { AuthContext } from '../Context/AuthContext';
import Item from '../Components/Item/Item';
import './Css/Wishlist.css';

const Wishlist = () => {
  const { wishlistItems, loadWishlistFromAPI } = useWishlist();
  const { user } = useContext(AuthContext);

  // Re-fetch wishlist from backend every time this page mounts.
  useEffect(() => {
    if (user) {
      loadWishlistFromAPI();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (wishlistItems.length === 0) {
    return (
      <div className="wishlist-empty">
        <div className="wishlist-empty-icon">♡</div>
        <h2>Your wishlist is empty</h2>
        <p>Save items you love by clicking the heart on any product.</p>
        <Link to="/"><button className="wishlist-shop-btn">Start Shopping</button></Link>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <h1 className="wishlist-title">My Wishlist</h1>
      <p className="wishlist-subtitle">{wishlistItems.length} item{wishlistItems.length !== 1 ? 's' : ''} saved</p>
      <div className="wishlist-grid">
        {wishlistItems.map((p) => (
          <div key={p.id} className="wishlist-item-wrapper">
            <Item id={p.id} name={p.name} image={p.image} new_price={p.new_price} old_price={p.old_price} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Wishlist;
