import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import Breadcrump from '../Components/Breadcrump/Breadcrump';
import ProductDisplay from '../Components/ProductDisplay/ProductDisplay';
import { trackEvent } from '../utils/analytics';
import api from '../api/apiClient';

const Product = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setProduct(null);
    setNotFound(false);
    api(`/api/products/${productId}`)
      .then(d => {
        const p = { ...d.product, image: d.product.image_url };
        setProduct(p);
        trackEvent('PRODUCT_VIEW', {
          productId: p.id,
          productName: p.name,
          category: p.category,
        });
      })
      .catch(() => setNotFound(true));
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (notFound) return <div>Product not found.</div>;
  if (!product) return <div>Loading...</div>;

  return (
    <div>
      <Breadcrump product={product} />
      <ProductDisplay product={product}/>
    </div>
  );
};

export default Product;