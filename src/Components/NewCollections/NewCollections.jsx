import React, { useState, useEffect } from 'react'
import './NewCollection.css'
import api from '../../api/apiClient'
import resolveImage from '../Assets/resolveImage'
import Item from '../Item/Item'

const NewCollections = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api('/api/products/new-collections')
      .then(d => setProducts(d.products.map(p => ({ ...p, image: resolveImage(p.image_url) }))))
      .catch(() => {});
  }, []);

  return (
    <div className='new-collections'>
        <h1>New Collections</h1>
        <hr />
        <div className="collections">
            {products.map((item) => (
                <Item key={item.id} id={item.id} name={item.name} image={item.image} new_price={item.new_price} old_price={item.old_price} />
            ))}
        </div>
    </div>
  )
}

export default NewCollections