import React, { useContext, useState, useEffect } from "react";
import "./ProductDisplay.css";
import start_icon from "../Assets/star_icon.png";
import star_dull_icon from "../Assets/star_dull_icon.png";
import { ShopContext } from "../../Context/ShopContext";
import { useToast } from "../../Context/ToastContext";
import { AuthContext } from "../../Context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../../api/apiClient";

const ProductDisplay = (props) => {
  const { product } = props;
  const { addToCart, cartItems, removeFromCart, selectedSizes, setProductSize } = useContext(ShopContext);
  const { showToast } = useToast();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const cartQty = cartItems[product.id] || 0;
  const [added, setAdded] = useState(false);
  const selectedSize = selectedSizes[product.id] || null;
  const [localQty, setLocalQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // displayed quantity: actual cart count when in cart, else local selector
  const displayQty = cartQty > 0 ? cartQty : localQty;

  const fetchReviews = () => {
    api(`/api/products/${product.id}/reviews`)
      .then(d => {
        setReviews(d.reviews);
        setAvgRating(d.average_rating);
        setTotalReviews(d.total_reviews);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchReviews();
  }, [product.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQtyIncrease = () => {
    if (cartQty > 0) addToCart(product.id, 1);
    else setLocalQty((q) => q + 1);
  };

  const handleQtyDecrease = () => {
    if (cartQty > 0) removeFromCart(product.id);
    else setLocalQty((q) => Math.max(1, q - 1));
  };

  const handleAddToCart = () => {
    if (!selectedSize) {
      setSizeError(true);
      showToast('Please select a size first!', 'error');
      return;
    }
    setSizeError(false);
    addToCart(product.id, localQty);
    showToast(`${localQty}× "${product.name.slice(0, 25)}..." added to cart!`);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleBuyNow = () => {
    if (!selectedSize) {
      setSizeError(true);
      showToast('Please select a size first!', 'error');
      return;
    }
    setSizeError(false);
    if (cartQty === 0) addToCart(product.id, localQty);
    navigate('/cart', { state: { openCheckout: true } });
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) { showToast('Please log in to leave a review.', 'error'); return; }
    setSubmitting(true);
    try {
      await api('/api/reviews', { method: 'POST', body: { productId: product.id, rating: reviewRating, comment: reviewComment } });
      showToast('Review submitted!');
      setReviewComment('');
      setReviewRating(5);
      fetchReviews();
    } catch {
      showToast('Failed to submit review.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating) => {
    const full = Math.round(rating);
    return [1,2,3,4,5].map(i => (
      <img key={i} src={i <= full ? start_icon : star_dull_icon} alt="Star" />
    ));
  };

  return (
    <div className="productdisplay">
      <div className="productdisplay-main-img">
        <img src={product.image} alt="Product" />
      </div>
      <div className="productdisplay-left">
        <div className="productdisplay-img-list">
          <img src={product.image} alt="Product" />
          <img src={product.image} alt="Product" />
          <img src={product.image} alt="Product" />
        </div>
      </div>

      <div className="productdisplay-right">
        <h1>{product.name}</h1>

        <div className="productdisplay-right-star">
          {renderStars(avgRating)}
          <p>({totalReviews} Review{totalReviews !== 1 ? 's' : ''})</p>
        </div>

        <div className="productdisplay-right-prices">
          <div className="productdisplay-right-price-old">
            LKR {product.old_price}
          </div>
          <div className="productdisplay-right-price-new">
            LKR {product.new_price}
          </div>
        </div>

        <div className="productdisplay-right-description">
          <p>{product.description}</p>
        </div>

        <div className="productdisplay-right-size">
          <h1>Select Size {sizeError && <span className="size-required">— required</span>}</h1>
          <div className="productdisplay-right-sizes">
            {['S', 'M', 'L', 'XL', 'XXL'].map((size) => (
              <div
                key={size}
                className={`size-btn${selectedSize === size ? ' size-selected' : ''}${sizeError && !selectedSize ? ' size-error' : ''}`}
                onClick={() => { setProductSize(product.id, size); setSizeError(false); }}
              >
                {size}
              </div>
            ))}          </div>
        </div>

        <div className="productdisplay-right-quantity">
          <h1>Quantity</h1>
          <div className="quantity-controls">
            <button className="qty-btn" onClick={handleQtyDecrease}>−</button>
            <span className="qty-value">{displayQty}</span>
            <button className="qty-btn" onClick={handleQtyIncrease}>+</button>
          </div>
        </div>

        {cartQty > 0 ? (
          <button
            className="add-to-cart-btn added"
            onClick={() => navigate('/cart')}
          >
            ✓ In Cart — View Cart
          </button>
        ) : (
          <button
            className={`add-to-cart-btn${added ? ' added' : ''}`}
            onClick={handleAddToCart}
          >
            {added ? '✓ Added to Cart' : 'Add to Cart'}
          </button>
        )}
        <button className="buy-now-btn" onClick={handleBuyNow}>
          Buy Now
        </button>

        <p className="productdisplay-right-category">
          <span>Category: {product.category}</span>
        </p>

        {/* Reviews Section */}
        <div className="productdisplay-reviews">
          <h2>Customer Reviews</h2>

          {reviews.length === 0 ? (
            <p className="reviews-empty">No reviews yet. Be the first!</p>
          ) : (
            <div className="reviews-list">
              {reviews.map((r) => (
                <div key={r.id} className="review-item">
                  <div className="review-header">
                    <span className="review-author">{r.reviewer_name}</span>
                    <span className="review-stars">{renderStars(r.rating)}</span>
                    <span className="review-date">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.comment && <p className="review-comment">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}

          {user && (
            <form className="review-form" onSubmit={handleSubmitReview}>
              <h3>Leave a Review</h3>
              <div className="review-form-rating">
                <label>Rating: </label>
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`rating-star-btn${reviewRating >= n ? ' active' : ''}`}
                    onClick={() => setReviewRating(n)}
                  >★</button>
                ))}
              </div>
              <textarea
                className="review-form-comment"
                placeholder="Write your review (optional)"
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                rows={3}
              />
              <button type="submit" className="review-submit-btn" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDisplay;


const ProductDisplay = (props) => {
  const { product } = props;
  const { addToCart, cartItems, removeFromCart, selectedSizes, setProductSize } = useContext(ShopContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const cartQty = cartItems[product.id] || 0;
  const [added, setAdded] = useState(false);
  const selectedSize = selectedSizes[product.id] || null;
  const [localQty, setLocalQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);

  // displayed quantity: actual cart count when in cart, else local selector
  const displayQty = cartQty > 0 ? cartQty : localQty;

  const handleQtyIncrease = () => {
    if (cartQty > 0) addToCart(product.id, 1);
    else setLocalQty((q) => q + 1);
  };

  const handleQtyDecrease = () => {
    if (cartQty > 0) removeFromCart(product.id);
    else setLocalQty((q) => Math.max(1, q - 1));
  };

  const handleAddToCart = () => {
    if (!selectedSize) {
      setSizeError(true);
      showToast('Please select a size first!', 'error');
      return;
    }
    setSizeError(false);
    addToCart(product.id, localQty);
    showToast(`${localQty}× "${product.name.slice(0, 25)}..." added to cart!`);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleBuyNow = () => {
    if (!selectedSize) {
      setSizeError(true);
      showToast('Please select a size first!', 'error');
      return;
    }
    setSizeError(false);
    if (cartQty === 0) addToCart(product.id, localQty);
    navigate('/cart', { state: { openCheckout: true } });
  };

  return (
    <div className="productdisplay">
      <div className="productdisplay-main-img">
        <img src={product.image} alt="Product" />
      </div>
      <div className="productdisplay-left">
        <div className="productdisplay-img-list">
          <img src={product.image} alt="Product" />
          <img src={product.image} alt="Product" />
          <img src={product.image} alt="Product" />
        </div>
      </div>

      <div className="productdisplay-right">
        <h1>{product.name}</h1>

        <div className="productdisplay-right-star">
          <img src={start_icon} alt="Star" />
          <img src={start_icon} alt="Star" />
          <img src={start_icon} alt="Star" />
          <img src={start_icon} alt="Star" />
          <img src={star_dull_icon} alt="Star" />
          <p>(15 Reviews)</p>
        </div>

        <div className="productdisplay-right-prices">
          <div className="productdisplay-right-price-old">
            LKR {product.old_price}
          </div>
          <div className="productdisplay-right-price-new">
            LKR {product.new_price}
          </div>
        </div>

        <div className="productdisplay-right-description">
          <p>{product.description}</p>
        </div>

        <div className="productdisplay-right-size">
          <h1>Select Size {sizeError && <span className="size-required">— required</span>}</h1>
          <div className="productdisplay-right-sizes">
            {['S', 'M', 'L', 'XL', 'XXL'].map((size) => (
              <div
                key={size}
                className={`size-btn${selectedSize === size ? ' size-selected' : ''}${sizeError && !selectedSize ? ' size-error' : ''}`}
                onClick={() => { setProductSize(product.id, size); setSizeError(false); }}
              >
                {size}
              </div>
            ))}          </div>
        </div>

        <div className="productdisplay-right-quantity">
          <h1>Quantity</h1>
          <div className="quantity-controls">
            <button className="qty-btn" onClick={handleQtyDecrease}>−</button>
            <span className="qty-value">{displayQty}</span>
            <button className="qty-btn" onClick={handleQtyIncrease}>+</button>
          </div>
        </div>

        {cartQty > 0 ? (
          <button
            className="add-to-cart-btn added"
            onClick={() => navigate('/cart')}
          >
            ✓ In Cart — View Cart
          </button>
        ) : (
          <button
            className={`add-to-cart-btn${added ? ' added' : ''}`}
            onClick={handleAddToCart}
          >
            {added ? '✓ Added to Cart' : 'Add to Cart'}
          </button>
        )}
        <button className="buy-now-btn" onClick={handleBuyNow}>
          Buy Now
        </button>

        <p className="productdisplay-right-category">
          <span>Category: {product.category}</span>
        </p>
      </div>
    </div>
  );
};

export default ProductDisplay;
