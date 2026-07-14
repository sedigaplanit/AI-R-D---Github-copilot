import React, { useState, useContext, useEffect } from 'react';
import './Css/ShopCategory.css';
import { ShopContext } from '../Context/ShopContext';
import Item from '../Components/Item/Item';
import SearchFilter from '../Components/SearchFilter/SearchFilter';

const ShopCategory = (props) => {
  const { all_product } = useContext(ShopContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);

  useEffect(() => {
    let result = all_product.filter((product) => {
      const inCategory = product.category === props.category;
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPrice =
        priceRange === '' ||
        (priceRange === 'low'    && product.new_price < 100) ||
        (priceRange === 'medium' && product.new_price >= 100 && product.new_price <= 200) ||
        (priceRange === 'high'   && product.new_price > 200);
      return inCategory && matchesSearch && matchesPrice;
    });

    if (sortOrder === 'price-asc')  result = [...result].sort((a, b) => a.new_price - b.new_price);
    if (sortOrder === 'price-desc') result = [...result].sort((a, b) => b.new_price - a.new_price);
    if (sortOrder === 'name-asc')   result = [...result].sort((a, b) => a.name.localeCompare(b.name));

    setFilteredProducts(result);
  }, [searchTerm, priceRange, sortOrder, all_product, props.category]);

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
