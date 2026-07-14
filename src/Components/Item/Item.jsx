import React, { useContext, useState } from 'react'
import './Item.css'
import {Link} from 'react-router-dom'
import { useWishlist } from '../../Context/WishlistContext'
import { ShopContext } from '../../Context/ShopContext'

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

const Item = (props) => {
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { cartItems, addToCart, removeFromCart, selectedSizes, setProductSize } = useContext(ShopContext);
  const wishlisted = isWishlisted(props.id);
  const qty = cartItems[props.id] || 0;
  const selectedSize = selectedSizes[props.id] || null;
  const [sizeError, setSizeError] = useState(false);

  const handleSizeSelect = (s) => { setProductSize(props.id, s); setSizeError(false); };

  const handleAdd = () => {
    if (!selectedSize) { setSizeError(true); return; }
    setSizeError(false);
    addToCart(props.id, 1);
  };

  return (
    <div className='item'>
        <div className='item-img-wrapper'>
          <Link to={`/product/${props.id}`}><img src={props.image} alt="" /></Link>
          <button
            className={`item-wishlist-btn ${wishlisted ? 'wishlisted' : ''}`}
            onClick={(e) => { e.preventDefault(); toggleWishlist(props.id); }}
            title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            {wishlisted ? '♥' : '♡'}
          </button>
        </div>
        <p>{props.name}</p>
        <div className='item-prices'>
            <div className="item-price-new">LKR {props.new_price}</div>
            <div className="item-price-old">LKR {props.old_price}</div>
        </div>

        {qty === 0 ? (
          <>
            <div className="item-sizes">
              {SIZES.map((s) => (
                <button
                  key={s}
                  className={`item-size-btn${selectedSize === s ? ' selected' : ''}${sizeError ? ' error' : ''}`}
                  onClick={() => handleSizeSelect(s)}
                >{s}</button>
              ))}
            </div>
            {sizeError && <p className="item-size-error">Select a size</p>}
            <div className="item-cart-controls">
              <button className="item-add-btn" onClick={handleAdd}>Add to Cart</button>
            </div>
          </>
        ) : (
          <div className="item-cart-controls">
            <div className="item-qty-controls">
              <button className="item-qty-btn" onClick={() => removeFromCart(props.id)}>−</button>
              <span className="item-qty-count">{qty}</span>
              <button className="item-qty-btn" onClick={() => addToCart(props.id, 1)}>+</button>
            </div>
          </div>
        )}
    </div>
  )
}

export default Item