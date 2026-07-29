import React, { useState, useEffect, useRef } from 'react';
import './Css/ShopCategory.css';
import Item from '../Components/Item/Item';
import SearchFilter from '../Components/SearchFilter/SearchFilter';
import api from '../api/apiClient';
import resolveImage from '../Components/Assets/resolveImage';

const ShopCategory = (props) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams({ category: props.category });
      if (searchTerm) params.set('search', searchTerm);
      if (priceRange) params.set('priceRange', priceRange);
      if (sortOrder) params.set('sort', sortOrder);
      api(`/api/products?${params.toString()}`)
        .then(d => setFilteredProducts(d.products.map(p => ({ ...p, image: resolveImage(p.image_url) }))))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchTerm, priceRange, sortOrder, props.category]);

  return (
    <div className='shop-category'>
      <img className='shopcategory-banner' src={props.banner} alt="" />
      <div className="shopcategory-indexSort">
        <p>
          <span>Showing {filteredProducts.length}</span> product{filteredProducts.length !== 1 ? 's' : ''}
        </p>
      </div>

      <SearchFilter
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        priceRange={priceRange}
        setPriceRange={setPriceRange}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
      />

      <div className="shopcategory-products">
        {filteredProducts.length === 0 ? (
          <p className="shopcategory-no-results">No products match your filters.</p>
        ) : (
          filteredProducts.map((item) => (
            <Item key={item.id} id={item.id} name={item.name} image={item.image} new_price={item.new_price} old_price={item.old_price} />
          ))
        )}
      </div>
    </div>
  );
};

export default ShopCategory;
