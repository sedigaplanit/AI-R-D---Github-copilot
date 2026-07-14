import React from 'react'
import './Item.css'
import {Link} from 'react-router-dom'
import { useWishlist } from '../../Context/WishlistContext'

const Item = (props) => {
  const { toggleWishlist, isWishlisted } = useWishlist();
  const wishlisted = isWishlisted(props.id);

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
    </div>
  )
}

export default Item