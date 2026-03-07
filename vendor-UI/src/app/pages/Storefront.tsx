import { Search, ShoppingCart, User, Star } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Link } from "react-router";

export const products = [
  {
    id: 1,
    name: "Wireless Headphones",
    description: "Premium noise-cancelling wireless headphones",
    price: 24.73,
    rating: 4.5,
    reviews: 328,
    image: "https://images.unsplash.com/photo-1578517581165-61ec5ab27a19?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aXJlbGVzcyUyMGhlYWRwaG9uZXMlMjBwcm9kdWN0fGVufDF8fHx8MTc3MjkwODY5OXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 2,
    name: "Stainless Water Bottle",
    description: "Insulated 32oz water bottle keeps drinks cold",
    price: 32.99,
    rating: 4.8,
    reviews: 512,
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFpbmxlc3MlMjBzdGVlbCUyMHdhdGVyJTIwYm90dGxlfGVufDF8fHx8MTc3MjkwOTI1OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 3,
    name: "Mechanical Keyboard",
    description: "RGB backlit mechanical gaming keyboard",
    price: 89.50,
    rating: 4.6,
    reviews: 241,
    image: "https://images.unsplash.com/photo-1626958390898-162d3577f293?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWNoYW5pY2FsJTIwa2V5Ym9hcmR8ZW58MXx8fHwxNzcyOTAzMzkyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 4,
    name: "Canvas Tote Bag",
    description: "Eco-friendly canvas tote with leather handles",
    price: 28.00,
    rating: 4.4,
    reviews: 156,
    image: "https://images.unsplash.com/photo-1548863227-3af567fc3b27?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYW52YXMlMjB0b3RlJTIwYmFnfGVufDF8fHx8MTc3MjgxNDI5M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 5,
    name: "Modern Desk Lamp",
    description: "LED desk lamp with adjustable brightness",
    price: 45.25,
    rating: 4.7,
    reviews: 389,
    image: "https://images.unsplash.com/photo-1766411503488-f90eef1124bb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBkZXNrJTIwbGFtcHxlbnwxfHx8fDE3NzI5MDkyNTl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 6,
    name: "Classic White Sneakers",
    description: "Comfortable everyday sneakers for any occasion",
    price: 64.99,
    rating: 4.5,
    reviews: 673,
    image: "https://images.unsplash.com/photo-1631482665588-d3a6f88e65f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aGl0ZSUyMHNuZWFrZXJzJTIwcHJvZHVjdHxlbnwxfHx8fDE3NzI5MDkyNjB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 7,
    name: "Daily Moisturizer",
    description: "Hydrating face cream with SPF 30 protection",
    price: 36.50,
    rating: 4.9,
    reviews: 824,
    image: "https://images.unsplash.com/photo-1629732047847-50219e9c5aef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxza2luY2FyZSUyMG1vaXN0dXJpemVyfGVufDF8fHx8MTc3MjkwOTI2MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 8,
    name: "Leather Notebook",
    description: "Handcrafted leather-bound journal",
    price: 42.00,
    rating: 4.6,
    reviews: 297,
    image: "https://images.unsplash.com/photo-1677064061401-f77f966ff8a1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsZWF0aGVyJTIwbm90ZWJvb2t8ZW58MXx8fHwxNzcyOTA5MjYwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 9,
    name: "Minimalist Phone Case",
    description: "Slim protective case for modern smartphones",
    price: 18.99,
    rating: 4.3,
    reviews: 445,
    image: "https://images.unsplash.com/photo-1547658718-f4311ad64746?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaG9uZSUyMGNhc2UlMjBtaW5pbWFsfGVufDF8fHx8MTc3Mjg4NzYyN3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 10,
    name: "Comfort Hoodie",
    description: "Ultra-soft fleece pullover hoodie",
    price: 54.95,
    rating: 4.7,
    reviews: 531,
    image: "https://images.unsplash.com/photo-1706067107607-b604fb5605bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGFjayUyMGhvb2RpZSUyMGZhc2hpb258ZW58MXx8fHwxNzcyOTA5MjYxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
];

export function Storefront() {
  const handleBuyNow = (product: typeof products[0]) => {
    console.log("Buy Now clicked for:", product.name);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link to="/" className="text-2xl font-semibold text-gray-900">ShopHub</Link>
              
              {/* Category Links */}
              <nav className="hidden md:flex items-center gap-6">
                <a href="#" className="text-sm text-gray-700 hover:text-gray-900">Electronics</a>
                <a href="#" className="text-sm text-gray-700 hover:text-gray-900">Fashion</a>
                <a href="#" className="text-sm text-gray-700 hover:text-gray-900">Home & Living</a>
                <a href="#" className="text-sm text-gray-700 hover:text-gray-900">Beauty</a>
              </nav>
            </div>

            {/* Search and Icons */}
            <div className="flex items-center gap-6">
              {/* Search Bar */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              {/* Icons */}
              <div className="flex items-center gap-4">
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <User className="w-5 h-5 text-gray-700" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                  <ShoppingCart className="w-5 h-5 text-gray-700" />
                  <span className="absolute top-0 right-0 w-4 h-4 bg-gray-900 text-white text-xs rounded-full flex items-center justify-center">
                    0
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-center">
            <h2 className="text-4xl font-semibold text-gray-900 mb-4">
              Discover Quality Products
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Browse our curated collection of everyday essentials and premium goods
            </p>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <h3 className="text-2xl font-semibold text-gray-900 mb-8">Featured Products</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
              {/* Product Image */}
              <div className="aspect-square bg-gray-100">
                <ImageWithFallback
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h4 className="font-medium text-gray-900 mb-1">{product.name}</h4>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                
                {/* Rating */}
                <div className="flex items-center gap-1 mb-3">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium text-gray-900">{product.rating}</span>
                  <span className="text-sm text-gray-500">({product.reviews})</span>
                </div>

                {/* Price */}
                <div className="text-xl font-semibold text-gray-900 mb-4">
                  ${product.price.toFixed(2)}
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                  <Link
                    to={`/checkout?productId=${product.id}`}
                    className="flex-1 bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium text-center"
                  >
                    Buy Now
                  </Link>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 mt-16">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <p className="text-center text-sm text-gray-600">
            © 2026 ShopHub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}