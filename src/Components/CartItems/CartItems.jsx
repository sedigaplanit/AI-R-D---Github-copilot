import React, { useContext, useState, useEffect } from 'react';
import './CartItem.css';
import { ShopContext } from '../../Context/ShopContext';
import { AuthContext } from '../../Context/AuthContext';
import { useWishlist } from '../../Context/WishlistContext';
import remove_icon from '../Assets/cart_cross_icon.png';
import CheckoutModal from './CheckoutModal';
import { useLocation, useNavigate } from 'react-router-dom';

const CartItems = () => {
    const { getTotalCartAmount, getTotalCartItems, all_product, cartItems, removeFromCart, updateCartItemCount, clearCart, clearCartOnAPI } = useContext(ShopContext);
    const { user } = useContext(AuthContext);
    const { clearWishlistItems } = useWishlist();
    const navigate = useNavigate();
    const [showCheckout, setShowCheckout] = useState(false);
    const location = useLocation();
    const total = getTotalCartAmount();
    const cartCount = getTotalCartItems();

    useEffect(() => {
        if (location.state?.openCheckout) {
            setShowCheckout(true);
        }
    }, [location.state]);

    const orderItems = all_product
        .filter((p) => cartItems[p.id] > 0)
        .map((p) => ({ id: p.id, name: p.name, image: p.image, price: p.new_price, quantity: cartItems[p.id] }));

    const handleAddQuantity = (id) => {
        updateCartItemCount(id, cartItems[id] + 1);
    };
    
    const handleSubtractQuantity = (id) => {
        if (cartItems[id] > 1) {
            updateCartItemCount(id, cartItems[id] - 1);
        } else {
            removeFromCart(id);
        }
    };

    return (
        <div className="cartitems">
            <div className="cartitems-format-main">
                <p>Products</p>
                <p>Title</p>
                <p>Price</p>
                <p>Quantity</p>
                <p>Total</p>
                <p>Remove</p>
            </div>
            <hr />
            {all_product.length === 0 ? (
                <p>No products available</p>
            ) : (
                all_product.map((e) => {
                    if (cartItems[e.id] > 0) {
                        return (
                            <div key={e.id}>
                                <div className="cartitems-format cartitems-format-main">
                                    <img src={e.image} alt="" className="carticon-product-icon" />
                                    <p>{e.name}</p>
                    <p>LKR {e.new_price}</p>
                                        <div className="cartitems-quantity-wrapper">
                                        <button onClick={() => handleSubtractQuantity(e.id)}>-</button>
                                        <span className="cartitems-quantity">{cartItems[e.id]}</span>
                                        <button onClick={() => handleAddQuantity(e.id)}>+</button>
                                    </div>
                                    <p>LKR {e.new_price * cartItems[e.id]}</p>
                                    <img
                                        src={remove_icon}
                                        onClick={() => removeFromCart(e.id)}
                                        alt="Remove"
                                        className="carticon-remove-icon"
                                    />
                                </div>
                                <hr />
                            </div>
                        );
                    }
                    return null;
                })
            )}
            <div className="cartitems-down">
                <div className="cartitems-total">
                    <h1>Cart Totals</h1>
                    <div>
                        <div className="cartitems-total-item">
                            <p>Sub Total: </p>
                            <p>LKR {getTotalCartAmount()}</p>
                        </div>
                        <hr />
                        <div className="cartitems-total-item">
                            <p>Shipping Free</p>
                            <p>Free</p>
                        </div>
                        <hr />
                        <div className="cartitems-total-item">
                            <h3>Total: </h3>
                            <h3>LKR {getTotalCartAmount()}</h3>
                        </div>
                    </div>
                    {!user ? (
                        <div className="cart-guest-prompt">
                            <p>Sign in to proceed with checkout</p>
                            <button className="cart-login-btn" onClick={() => navigate('/login', { state: { defaultTab: 'signup' } })}>Sign Up / Login</button>
                        </div>
                    ) : cartCount === 0 ? (
                        <button style={{ opacity: 0.5, cursor: 'not-allowed' }} disabled>Proceed to Checkout</button>
                    ) : (
                        <button onClick={() => setShowCheckout(true)}>Proceed to Checkout</button>
                    )}
                </div>
            </div>
            {showCheckout && (
                <CheckoutModal
                    total={total}
                    items={orderItems}
                    onClose={() => setShowCheckout(false)}
                    onSuccess={async () => {
                        clearWishlistItems(orderItems.map(i => i.id));
                        clearCart();
                        await clearCartOnAPI();
                    }}
                />
            )}
        </div>
    );
};

export default CartItems;
