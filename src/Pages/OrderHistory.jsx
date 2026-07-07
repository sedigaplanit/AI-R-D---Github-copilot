import React from 'react';
import { getOrders } from '../utils/orderStorage';
import { Link } from 'react-router-dom';
import './Css/OrderHistory.css';

const OrderHistory = () => {
  const orders = getOrders();

  if (orders.length === 0) {
    return (
      <div className="orderhistory-empty">
        <div className="orderhistory-empty-icon">📦</div>
        <h2>No orders yet</h2>
        <p>You haven't placed any orders. Start shopping!</p>
        <Link to="/"><button className="orderhistory-shop-btn">Shop Now</button></Link>
      </div>
    );
  }

  return (
    <div className="orderhistory">
      <h1 className="orderhistory-title">Order History</h1>
      <p className="orderhistory-subtitle">{orders.length} order{orders.length !== 1 ? 's' : ''} placed</p>

      <div className="orderhistory-list">
        {orders.map((order) => (
          <div key={order.id} className="orderhistory-card">
            <div className="orderhistory-card-header">
              <div>
                <span className="orderhistory-order-id">{order.id}</span>
                <span className="orderhistory-date">
                  {new Date(order.date).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </span>
              </div>
              <div className="orderhistory-right">
                <span className="orderhistory-status">Delivered</span>
                <span className="orderhistory-total">LKR {order.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="orderhistory-items">
              {order.items.map((item) => (
                <div key={item.id} className="orderhistory-item">
                  <img src={item.image} alt={item.name} className="orderhistory-item-img" />
                  <div className="orderhistory-item-info">
                    <p className="orderhistory-item-name">{item.name}</p>
                    <p className="orderhistory-item-meta">
                      Qty: {item.quantity} &nbsp;·&nbsp; LKR {item.price} each
                    </p>
                  </div>
                  <p className="orderhistory-item-subtotal">LKR {(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="orderhistory-card-footer">
              <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
              <span>Total paid: <strong>LKR {order.total.toFixed(2)}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderHistory;
