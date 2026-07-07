import React, { useContext, useState } from "react";
import "./ProductDisplay.css";
import start_icon from "../Assets/star_icon.png";
import star_dull_icon from "../Assets/star_dull_icon.png";
import { ShopContext } from "../../Context/ShopContext";
import { useToast } from "../../Context/ToastContext";

const ProductDisplay = (props) => {
  const { product } = props;
  const { addToCart } = useContext(ShopContext);
  const { showToast } = useToast();
  const [added, setAdded] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(false);

  const handleAddToCart = () => {
    if (!selectedSize) {
      setSizeError(true);
      showToast('Please select a size first!', 'error');
      return;
    }
    setSizeError(false);
    addToCart(product.id, quantity);
    showToast(`${quantity}× "${product.name.slice(0, 25)}..." added to cart!`);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
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
                onClick={() => { setSelectedSize(size); setSizeError(false); }}
              >
                {size}
              </div>
            ))}
          </div>
        </div>

        <div className="productdisplay-right-quantity">
          <h1>Quantity</h1>
          <div className="quantity-controls">
            <button className="qty-btn" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
            <span className="qty-value">{quantity}</span>
            <button className="qty-btn" onClick={() => setQuantity((q) => q + 1)}>+</button>
          </div>
        </div>

        <button
          className={`add-to-cart-btn${added ? ' added' : ''}`}
          onClick={handleAddToCart}
        >
          {added ? '✓ Added to Cart' : 'Add to Cart'}
        </button>

        <p className="productdisplay-right-category">
          <span>Category: {product.category}</span>
        </p>
      </div>
    </div>
  );
};

export default ProductDisplay;
