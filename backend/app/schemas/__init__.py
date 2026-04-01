# User schemas
from app.schemas.user import UserBase, UserCreate, UserUpdate, UserOut, UserLogin

# Product schemas
from app.schemas.product import ProductBase, ProductCreate, ProductUpdate, ProductOut

# Product Variant schemas
from app.schemas.product_variant import (
    ProductVariantBase,
    ProductVariantCreate,
    ProductVariantUpdate,
    ProductVariantOut,
)

# Order schemas
from app.schemas.order import (
    OrderBase,
    OrderCreate,
    OrderUpdate,
    OrderOut,
    OrderItemBase,
    OrderItemCreate,
    OrderItemOut,
)

# Cart schemas
from app.schemas.cart import CartItemBase, CartItemCreate, CartItemUpdate, CartItemOut

# Review schemas
from app.schemas.review import ReviewBase, ReviewCreate, ReviewUpdate, ReviewOut

# Coupon schemas
from app.schemas.coupon import CouponBase, CouponCreate, CouponUpdate, CouponOut

# Address schemas
from app.schemas.address import AddressBase, AddressCreate, AddressUpdate, AddressOut

# Favorite schemas
from app.schemas.favorite import FavoriteBase, FavoriteCreate, FavoriteOut

# Shipping schemas
from app.schemas.shipping import ShippingBase, ShippingCreate, ShippingUpdate, ShippingOut

# Invoice schemas
from app.schemas.invoice import InvoiceBase, InvoiceCreate, InvoiceUpdate, InvoiceOut

# Outfit schemas
from app.schemas.outfit import (
    OutfitBase,
    OutfitCreate,
    OutfitUpdate,
    OutfitOut,
    OutfitProductBase,
    OutfitProductCreate,
    OutfitProductOut,
)

# Conversation schemas
from app.schemas.conversation import (
    ConversationBase,
    ConversationCreate,
    ConversationOut,
    MessageBase,
    MessageCreate,
    MessageOut,
)

# Category schemas
from app.schemas.category import CategoryBase, CategoryCreate, CategoryUpdate, CategoryOut, CategoryWithChildren

__all__ = [
    # User
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserOut",
    "UserLogin",
    # Product
    "ProductBase",
    "ProductCreate",
    "ProductUpdate",
    "ProductOut",
    # ProductVariant
    "ProductVariantBase",
    "ProductVariantCreate",
    "ProductVariantUpdate",
    "ProductVariantOut",
    # Order
    "OrderBase",
    "OrderCreate",
    "OrderUpdate",
    "OrderOut",
    "OrderItemBase",
    "OrderItemCreate",
    "OrderItemOut",
    # Cart
    "CartItemBase",
    "CartItemCreate",
    "CartItemUpdate",
    "CartItemOut",
    # Review
    "ReviewBase",
    "ReviewCreate",
    "ReviewUpdate",
    "ReviewOut",
    # Coupon
    "CouponBase",
    "CouponCreate",
    "CouponUpdate",
    "CouponOut",
    # Address
    "AddressBase",
    "AddressCreate",
    "AddressUpdate",
    "AddressOut",
    # Favorite
    "FavoriteBase",
    "FavoriteCreate",
    "FavoriteOut",
    # Shipping
    "ShippingBase",
    "ShippingCreate",
    "ShippingUpdate",
    "ShippingOut",
    # Invoice
    "InvoiceBase",
    "InvoiceCreate",
    "InvoiceUpdate",
    "InvoiceOut",
    # Outfit
    "OutfitBase",
    "OutfitCreate",
    "OutfitUpdate",
    "OutfitOut",
    "OutfitProductBase",
    "OutfitProductCreate",
    "OutfitProductOut",
    # Conversation
    "ConversationBase",
    "ConversationCreate",
    "ConversationOut",
    "MessageBase",
    "MessageCreate",
    "MessageOut",
    # Category
    "CategoryBase",
    "CategoryCreate",
    "CategoryUpdate",
    "CategoryOut",
    "CategoryWithChildren",
]
