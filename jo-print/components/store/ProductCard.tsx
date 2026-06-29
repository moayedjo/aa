import Link from 'next/link'
import type { Product } from '@/lib/types'
import { formatPrice } from '@/lib/pricing'
import Badge from '@/components/ui/Badge'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/store/${product.id}`}>
      <div className="bg-white rounded-[12px] border border-border hover:shadow-md transition-all group p-4">
        <div
          className="w-full h-36 rounded-lg flex items-center justify-center text-6xl mb-3 group-hover:scale-105 transition-transform"
          style={{ backgroundColor: product.color + '15' }}
        >
          {product.icon}
        </div>
        {product.popular && (
          <Badge variant="info" className="mb-2">الأكثر طلباً</Badge>
        )}
        <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-primary font-bold">من {formatPrice(product.price)}</span>
            <span className="text-gray-400 text-xs mr-1">{product.priceUnit}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
