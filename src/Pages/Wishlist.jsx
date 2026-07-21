import React, { useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../Context/WishlistContext';
import { ShopContext } from '../Context/ShopContext';
import { AuthContext } from '../Context/AuthContext';
import Item from '../Components/Item/Item';
import './Css/Wishlist.css';

const Wishlist = () => {
  const { wishlist, loadWishlistFromAPI } = useWishlist();
  const { all_product } = useContext(ShopContext);
  const { user } = useContext(AuthContext);

  // Re-fetch wishlist from backend every time this page mounts.
  // Ensures wishlist seeded via POST /api/wishlist (e.g. test beforeEach)
  // is visible without requiring a full page reload.
  useEffect(() => {
    if (user) {
      loadWishlistFromAPI();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const wishlistProducts = all_product.filter((p) => wishlist.includes(p.id));

  if (wishlistProducts.length === 0) {
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
      <p className="wishlist-subtitle">{wishlistProducts.length} item{wishlistProducts.length !== 1 ? 's' : ''} saved</p>
      <div className="wishlist-grid">
        {wishlistProducts.map((p) => (
          <div key={p.id} className="wishlist-item-wrapper">
            <Item id={p.id} name={p.name} image={p.image} new_price={p.new_price} old_price={p.old_price} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Wishlist;
