import React, { useContext, useState, useEffect } from "react";
import "./Navbar.css";
import logo from "../Assets/logo.png";
import cart_icon from "../Assets/cart_icon.png";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShopContext } from "../../Context/ShopContext";
import { AuthContext } from "../../Context/AuthContext";
import { useWishlist } from "../../Context/WishlistContext";

const Navbar = () => {
  const [menu, setMenu] = useState("shop");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [shopHighlight, setShopHighlight] = useState(false);
  const { getTotalCartItems, saveCartToAPI, clearCart } = useContext(ShopContext);
  const { user, logout } = useContext(AuthContext);
  const { wishlist } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.highlightShop) {
      setMenu('shop');
      setShopHighlight(true);
      const t = setTimeout(() => setShopHighlight(false), 2500);
      return () => clearTimeout(t);
    }
  }, [location.state]);

  const handleLogout = async () => {
    await saveCartToAPI();
    clearCart();
    logout();
    navigate("/");
  };

  return (
    <div className="navbar">
      {/* Logo is now a clickable link to the homepage */}
      <Link to="/" className="nav-logo">
        <img src={logo} alt="OneStyle Logo" />
        <p>OneStyle</p>
      </Link>

      {/* Mobile menu toggle */}
      <div className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
        <div></div>
        <div></div>
        <div></div>
      </div>

      {/* All navigation links wrapped in a parent element */}
      <div className={`nav-links-wrapper`}>
        <ul className={`nav-menu ${isMenuOpen ? "open" : ""}`}>
          <li onClick={() => setMenu("shop")} className={shopHighlight ? 'nav-item-highlight' : ''}>
            <Link style={{ textDecoration: "none" }} to="/">
              Shop
            </Link>
            {menu === "shop" ? <hr /> : <></>}
          </li>
          <li onClick={() => setMenu("men")}>
            <Link style={{ textDecoration: "none" }} to="/mens">
              Men
            </Link>
            {menu === "men" ? <hr /> : <></>}
          </li>
          <li onClick={() => setMenu("women")}>
            <Link style={{ textDecoration: "none" }} to="/womens">
              Women
            </Link>
            {menu === "women" ? <hr /> : <></>}
          </li>
          <li onClick={() => setMenu("kids")}>
            <Link style={{ textDecoration: "none" }} to="/kids">
              Kids
            </Link>
            {menu === "kids" ? <hr /> : <></>}
          </li>
        </ul>
      </div>

      <div className="nav-login-cart">
        {user ? (
          <>
            <Link to="/profile" style={{ textDecoration: 'none' }}>
              <button>Profile</button>
            </Link>
            <Link to="/orders" style={{ textDecoration: 'none' }}>
              <button>My Orders</button>
            </Link>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <Link to="/login">
            <button>Sign In</button>
          </Link>
        )}
        <Link to="/wishlist" className="nav-wishlist-link">
          <span className="nav-wishlist-icon">♡</span>
          {wishlist.length > 0 && <span className="nav-wishlist-count">{wishlist.length}</span>}
        </Link>
        <Link to="/cart">
          <img src={cart_icon} alt="Cart Icon" />
        </Link>
        <div className="nav-cart-count">{getTotalCartItems()}</div>
      </div>
    </div>
  );
};

export default Navbar;
