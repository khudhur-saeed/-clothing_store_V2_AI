import Carousel from './Carousel';

export default function ProductCarousel({ products = [] }) {
  if (!products || products.length === 0) {
    return <div className="text-sm text-faint">No products available</div>;
  }

  // Transform products into carousel items
  const items = products.map(product => {
    // Extract the first image regardless of data shape:
    // could be a string URL, { url: '...' } object, or an array of either
    const rawImage =
      product.image_url ||
      product.images?.[0] ||
      null;

    let imageUrl = null;
    if (typeof rawImage === 'string') {
      imageUrl = rawImage;
    } else if (rawImage && typeof rawImage === 'object') {
      imageUrl = rawImage.url || rawImage.src || null;
    }

    return {
      id: product.id || product.product_id,
      title: product.name || product.title,
      description: product.category || '',
      price: Number(product.base_price || product.price || 0),
      image: imageUrl,
    };
  });

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
