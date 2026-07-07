const ORDERS_KEY = 'order_history';

export const getOrders = () => {
  const data = localStorage.getItem(ORDERS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveOrder = (order) => {
  const orders = getOrders();
  orders.unshift(order); // newest first
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
};
