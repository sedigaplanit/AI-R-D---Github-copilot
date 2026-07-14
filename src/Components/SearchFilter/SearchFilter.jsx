import React from 'react';
import './SearchFilter.css';

const SearchFilter = ({ searchTerm, setSearchTerm, priceRange, setPriceRange, sortOrder, setSortOrder }) => {
  return (
    <div className="search-filter">
      <input
        type="text"
        placeholder="Search products..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)}>
        <option value="">All Prices</option>
        <option value="low">Under LKR 100</option>
        <option value="medium">LKR 100 – 200</option>
        <option value="high">Above LKR 200</option>
      </select>
      <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
        <option value="">Sort By</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="name-asc">Name: A – Z</option>
      </select>
    </div>
  );
};

export default SearchFilter;
