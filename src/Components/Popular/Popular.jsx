import React, { useState, useEffect } from 'react'
import './Popular.css'
import api from '../../api/apiClient'
import Item from '../Item/Item'


const Popular = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api('/api/products/popular')
      .then(d => setProducts(d.products.map(p => ({ ...p, image: p.image_url }))))
      .catch(() => {});
  }, []);

  return (
    <div className='popular'>
        <h1>POPULAR IN WOMEN</h1>
        <hr />
        <div className="popular-item">
            {products.map((item) => (
                <Item key={item.id} id={item.id} name={item.name} image={item.image} new_price={item.new_price} old_price={item.old_price} />
            ))}
        </div>
    </div>
  )
}

export default Popular