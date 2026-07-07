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

  const handleAddToCart = () => {
    addToCart(product.id);
    showToast(`"${product.name.slice(0, 30)}..." added to cart!`);
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
          <h1>Select Size</h1>
          <div className="productdisplay-right-sizes">
            <div>S</div>
            <div>M</div>
            <div>L</div>
            <div>XL</div>
            <div>XXL</div>
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
