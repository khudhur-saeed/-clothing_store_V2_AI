import Carousel from './Carousel';

export default function ProductCarousel({ products = [] }) {
  if (!products || products.length === 0) {
    return <div className="text-sm text-faint">No products available</div>;
  }

  // Transform products into carousel items
  const items = products.map(product => ({
    id: product.id || product.product_id,
    title: product.name || product.title,
    description: product.category || '',
    price: product.base_price || product.price || 0,
    image: product.image_url || product.images?.[0] || null,
  }));

  return (
    <Carousel
      items={items}
      baseWidth={250}
      autoplay={false}
      pauseOnHover={true}
      loop={false}
      round={false}
    />
  );
}
