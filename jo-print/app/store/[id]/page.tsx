import { notFound } from 'next/navigation'
import { getProductById } from '@/lib/data/products'
import { formatPrice } from '@/lib/pricing'
import AddToCartButton from '@/components/store/AddToCartButton'

export default function ProductPage({ params }: { params: { id: string } }) {
  const product = getProductById(params.id)
  if (!product) notFound()

  return (
    <div className="py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Product Image Placeholder */}
          <div
            className="w-full aspect-square rounded-2xl flex items-center justify-center text-8xl"
            style={{ backgroundColor: product.color + '15' }}
          >
            {product.icon}
          </div>

          {/* Product Info */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <p className="text-gray-500 mb-4 leading-relaxed">{product.description}</p>

            <div className="text-3xl font-bold text-primary mb-6">
              {formatPrice(product.price)}
              <span className="text-base text-gray-400 font-normal mr-2">{product.priceUnit}</span>
            </div>

            {/* Options */}
            {product.options && product.options.map(option => (
              <div key={option.name} className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">{option.label}</label>
                <div className="flex flex-wrap gap-2">
                  {option.values.map(value => (
                    <button
                      key={value}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-primary hover:text-primary transition-colors"
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <AddToCartButton product={product} />
          </div>
        </div>
      </div>
    </div>
  )
}
