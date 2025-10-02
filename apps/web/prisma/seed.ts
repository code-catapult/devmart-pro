import { PrismaClient, Role, ProductStatus, OrderStatus } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create categories
  console.log('📁 Creating categories...')
  const electronics = await prisma.category.create({
    data: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and gadgets',
      imageUrl: '/images/categories/electronics.jpg',
    },
  })

  const clothing = await prisma.category.create({
    data: {
      name: 'Clothing',
      slug: 'clothing',
      description: 'Fashion and apparel',
      imageUrl: '/images/categories/clothing.jpg',
    },
  })

  const books = await prisma.category.create({
    data: {
      name: 'Books',
      slug: 'books',
      description: 'Books and educational materials',
      imageUrl: '/images/categories/books.jpg',
    },
  })

  const homeGarden = await prisma.category.create({
    data: {
      name: 'Home & Garden',
      slug: 'home-garden',
      description: 'Home improvement and gardening supplies',
      imageUrl: '/images/categories/home-garden.jpg',
    },
  })

  // Create subcategories
  const smartphones = await prisma.category.create({
    data: {
      name: 'Smartphones',
      slug: 'smartphones',
      description: 'Mobile phones and accessories',
      parentId: electronics.id,
    },
  })

  const laptops = await prisma.category.create({
    data: {
      name: 'Laptops',
      slug: 'laptops',
      description: 'Laptops and computing devices',
      parentId: electronics.id,
    },
  })

  // Create admin user with hashed password
  console.log('👤 Creating users...')
  const adminPassword = await hash('Admin123!', 12) // Demo password
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@devmart.com',
      name: 'Admin User',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      emailVerified: new Date(),
    },
  })

  // Create sample customers with hashed passwords
  const customer1Password = await hash('Customer123!', 12) // Demo password
  const customer1 = await prisma.user.create({
    data: {
      email: 'john@example.com',
      name: 'John Doe',
      passwordHash: customer1Password,
      role: Role.USER,
      emailVerified: new Date(),
    },
  })

  const customer2Password = await hash('Customer123!', 12) // Demo password
  const customer2 = await prisma.user.create({
    data: {
      email: 'jane@example.com',
      name: 'Jane Smith',
      passwordHash: customer2Password,
      role: Role.USER,
      emailVerified: new Date(),
    },
  })

  // Create products
  console.log('📱 Creating products...')
  const products = await prisma.$transaction([
    // Electronics
    prisma.product.create({
      data: {
        name: 'iPhone 15 Pro',
        slug: 'iphone-15-pro',
        description: 'Latest iPhone with Pro features',
        price: 99900, // $999.00 in cents
        comparePrice: 109900, // $1099.00 in cents
        inventory: 50,
        images: [
          '/images/products/iphone-15-pro-1.jpg',
          '/images/products/iphone-15-pro-2.jpg',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: smartphones.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'MacBook Pro 14"',
        slug: 'macbook-pro-14',
        description: 'Professional laptop for developers',
        price: 199900, // $1999.00 in cents
        inventory: 25,
        images: ['/images/products/macbook-pro-14-1.jpg'],
        status: ProductStatus.ACTIVE,
        categoryId: laptops.id,
      },
    }),
    // Clothing
    prisma.product.create({
      data: {
        name: 'Classic Cotton T-Shirt',
        slug: 'classic-cotton-tshirt',
        description: 'Comfortable cotton t-shirt in various colors',
        price: 2499, // $24.99 in cents
        comparePrice: 3499, // $34.99 in cents
        inventory: 100,
        images: [
          '/images/products/tshirt-1.jpg',
          '/images/products/tshirt-2.jpg',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: clothing.id,
      },
    }),
    // Books
    prisma.product.create({
      data: {
        name: 'JavaScript: The Good Parts',
        slug: 'javascript-the-good-parts',
        description: 'Essential JavaScript programming book',
        price: 1999, // $19.99 in cents
        inventory: 75,
        images: ['/images/products/js-book-1.jpg'],
        status: ProductStatus.ACTIVE,
        categoryId: books.id,
      },
    }),
    // Home & Garden
    prisma.product.create({
      data: {
        name: 'Indoor Plant Collection',
        slug: 'indoor-plant-collection',
        description: 'Set of 5 easy-care indoor plants',
        price: 4999, // $49.99 in cents
        inventory: 30,
        images: [
          '/images/products/plants-1.jpg',
          '/images/products/plants-2.jpg',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: homeGarden.id,
      },
    }),
    // Discontinued product for testing
    prisma.product.create({
      data: {
        name: 'Vintage Phone Case',
        slug: 'vintage-phone-case',
        description: 'Discontinued phone case design',
        price: 1499, // $14.99 in cents
        inventory: 0,
        images: ['/images/products/vintage-case-1.jpg'],
        status: ProductStatus.DISCONTINUED,
        categoryId: smartphones.id,
      },
    }),
  ])

  // Create sample cart items
  console.log('🛒 Creating cart items...')
  await prisma.cartItem.createMany({
    data: [
      {
        userId: customer1.id,
        productId: products[0].id, // iPhone
        quantity: 1,
      },
      {
        userId: customer1.id,
        productId: products[2].id, // T-shirt
        quantity: 2,
      },
      {
        userId: customer2.id,
        productId: products[1].id, // MacBook
        quantity: 1,
      },
    ],
  })

  // Create sample orders
  console.log('📦 Creating orders...')
  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'DM-2024-001',
      userId: customer1.id,
      status: OrderStatus.DELIVERED,
      subtotal: 4998, // $49.98
      tax: 400, // $4.00
      shipping: 999, // $9.99
      total: 6397, // $63.97
      shippingAddress: {
        name: 'John Doe',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        postalCode: '12345',
        country: 'US',
      },
      orderItems: {
        create: [
          {
            productId: products[2].id, // T-shirt
            quantity: 2,
            price: 2499, // Historical price
          },
        ],
      },
    },
  })

  // Create sample reviews
  console.log('⭐ Creating reviews...')
  await prisma.review.createMany({
    data: [
      {
        userId: customer1.id,
        productId: products[0].id, // iPhone
        rating: 5,
        comment: 'Excellent phone with great camera quality!',
      },
      {
        userId: customer2.id,
        productId: products[1].id, // MacBook
        rating: 4,
        comment: 'Great laptop for development work.',
      },
      {
        userId: customer1.id,
        productId: products[2].id, // T-shirt
        rating: 5,
        comment: 'Very comfortable and good quality cotton.',
      },
      {
        userId: customer2.id,
        productId: products[3].id, // Book
        rating: 5,
        comment: 'Must-read for any JavaScript developer!',
      },
    ],
  })

  console.log('✅ Database seed completed successfully!')
  console.log(`Created:
  - ${await prisma.category.count()} categories
  - ${await prisma.user.count()} users
  - ${await prisma.product.count()} products
  - ${await prisma.cartItem.count()} cart items
  - ${await prisma.order.count()} orders
  - ${await prisma.review.count()} reviews`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:')
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
