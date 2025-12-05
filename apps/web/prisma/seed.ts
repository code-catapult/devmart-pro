import {
  PrismaClient,
  Role,
  ProductStatus,
  OrderStatus,
} from '@repo/shared/types'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Clean up existing data (in correct order for foreign key constraints)
  console.log('🧹 Cleaning up existing data...')
  await prisma.review.deleteMany({})
  await prisma.cartItem.deleteMany({})
  await prisma.orderItem.deleteMany({})
  await prisma.orderNote.deleteMany({})
  await prisma.orderStatusChange.deleteMany({})
  await prisma.order.deleteMany({})
  await prisma.activityLog.deleteMany({})
  await prisma.supportNote.deleteMany({})
  await prisma.account.deleteMany({})
  await prisma.user.deleteMany({})
  await prisma.product.deleteMany({})
  await prisma.category.deleteMany({})
  await prisma.webhookEvent.deleteMany({})

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

  const accessories = await prisma.category.create({
    data: {
      name: 'Accessories',
      slug: 'accessories',
      description: 'Laptops and computing devices',
      parentId: electronics.id,
    },
  })

  const tablets = await prisma.category.create({
    data: {
      name: 'Tablets',
      slug: 'tablets',
      description: 'Digital tablets and e-readers',
      parentId: electronics.id,
    },
  })

  const textbooks = await prisma.category.create({
    data: {
      name: 'Textbooks',
      slug: 'textbooks',
      description: 'Educational textbooks and resources',
      parentId: books.id,
    },
  })

  const shirts = await prisma.category.create({
    data: {
      name: 'Shirts',
      slug: 'shirts',
      description: 'Casual and formal shirts',
      parentId: clothing.id,
    },
  })

  const watches = await prisma.category.create({
    data: {
      name: 'Watches',
      slug: 'watches',
      description: 'Wristwatches and smartwatches',
      parentId: electronics.id,
    },
  })

  const audio = await prisma.category.create({
    data: {
      name: 'Audio',
      slug: 'audio',
      description: 'Headphones, speakers, and audio equipment',
      parentId: electronics.id,
    },
  })

  // Create admin user with hashed password
  console.log('👤 Creating users...')
  const adminPassword = await hash('Admin123!', 12) // Demo password
  await prisma.user.create({
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
        sku: 'ELEC-SMART-001',
        description: 'Latest iPhone with Pro features',
        price: 99900, // $999.00 in cents
        comparePrice: 109900, // $1099.00 in cents
        inventory: 50,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: smartphones.id,
      },
    }),
    // 📱 Additional Smartphones & Electronics
    prisma.product.create({
      data: {
        name: 'Samsung Galaxy S24 Ultra',
        slug: 'samsung-galaxy-s24-ultra',
        sku: 'ELEC-SMART-002',
        description:
          'Flagship Android smartphone with stunning display and camera',
        price: 119900,
        comparePrice: 129900,
        inventory: 7,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: smartphones.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'Google Pixel 8 Pro',
        slug: 'google-pixel-8-pro',
        sku: 'ELEC-SMART-003',
        description:
          'AI-powered Android phone with exceptional photography capabilities',
        price: 99900,
        comparePrice: 109900,
        inventory: 0,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: smartphones.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'OnePlus 12',
        slug: 'oneplus-12',
        sku: 'ELEC-SMART-004',
        description: 'High-performance flagship killer with fast charging',
        price: 84900,
        comparePrice: 89900,
        inventory: 45,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: smartphones.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'Sony Xperia 1 V',
        slug: 'sony-xperia-1-v',
        sku: 'ELEC-SMART-005',
        description:
          'Professional-grade smartphone for creators and filmmakers',
        price: 109900,
        comparePrice: 114900,
        inventory: 25,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: smartphones.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'iPhone SE (3rd Gen)',
        slug: 'iphone-se-3rd-gen',
        sku: 'ELEC-SMART-006',
        description: 'Compact iPhone with A15 Bionic chip and Touch ID',
        price: 44900,
        comparePrice: 49900,
        inventory: 55,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: smartphones.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'Samsung Galaxy Z Flip 5',
        slug: 'samsung-galaxy-z-flip-5',
        sku: 'ELEC-SMART-007',
        description: 'Stylish foldable phone with premium design and features',
        price: 99900,
        comparePrice: 109900,
        inventory: 30,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: smartphones.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'Asus ROG Phone 8',
        slug: 'asus-rog-phone-8',
        sku: 'ELEC-SMART-008',
        description:
          'Gaming smartphone with top-tier performance and cooling system',
        price: 94900,
        comparePrice: 99900,
        inventory: 20,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: smartphones.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'iPad Air (2024)',
        slug: 'ipad-air-2024',
        sku: 'ELEC-TAB-001',
        description: 'Lightweight tablet with M2 chip and Apple Pencil support',
        price: 69900,
        comparePrice: 74900,
        inventory: 60,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: tablets.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'Apple Watch Series 10',
        slug: 'apple-watch-series-10',
        sku: 'ELEC-WATCH-001',
        description:
          'Advanced smartwatch with health, fitness, and connectivity features',
        price: 49900,
        comparePrice: 54900,
        inventory: 50,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: watches.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'Sony WH-1000XM5 Headphones',
        slug: 'sony-wh-1000xm5',
        sku: 'ELEC-AUDIO-001',
        description: 'Industry-leading noise-canceling wireless headphones',
        price: 39900,
        comparePrice: 44900,
        inventory: 75,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: audio.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'Bose QuietComfort Earbuds II',
        slug: 'bose-quietcomfort-earbuds-ii',
        sku: 'ELEC-AUDIO-002',
        description:
          'True wireless earbuds with world-class noise cancellation',
        price: 29900,
        comparePrice: 34900,
        inventory: 80,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: audio.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'Amazon Echo Show 10',
        slug: 'amazon-echo-show-10',
        sku: 'ELEC-TAB-002',
        description: 'Smart display with Alexa and motion-tracking screen',
        price: 24900,
        comparePrice: 27900,
        inventory: 90,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: tablets.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'GoPro Hero 12 Black',
        slug: 'gopro-hero-12-black',
        sku: 'ELEC-CAM-001',
        description:
          'High-performance action camera with 5.3K video and stabilization',
        price: 49900,
        comparePrice: 54900,
        inventory: 40,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: electronics.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'Nintendo Switch OLED',
        slug: 'nintendo-switch-oled',
        sku: 'ELEC-GAME-001',
        description: 'Portable gaming console with vibrant OLED display',
        price: 34900,
        comparePrice: 39900,
        inventory: 35,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: electronics.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'Logitech MX Master 3S Mouse',
        slug: 'logitech-mx-master-3s',
        sku: 'ELEC-COMP-001',
        description:
          'Ergonomic wireless mouse designed for productivity and precision',
        price: 11900,
        comparePrice: 13900,
        inventory: 85,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: electronics.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'MacBook Pro 14"',
        slug: 'macbook-pro-14',
        sku: 'ELEC-LAP-001',
        description: 'Professional laptop for developers',
        price: 199900, // $1999.00 in cents
        inventory: 25,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: laptops.id,
      },
    }),
    // Clothing
    prisma.product.create({
      data: {
        name: 'Classic Cotton T-Shirt',
        slug: 'classic-cotton-tshirt',
        sku: 'CLOTH-SHIRT-001',
        description: 'Comfortable cotton t-shirt in various colors',
        price: 2499, // $24.99 in cents
        comparePrice: 3499, // $34.99 in cents
        inventory: 100,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: shirts.id,
      },
    }),
    // Clothing
    prisma.product.create({
      data: {
        name: 'Iron Man T-Shirt',
        slug: 'ironman-tshirt',
        sku: 'CLOTH-SHIRT-002',
        description: 'Iron man themed comfortable cotton t-shirt',
        price: 2899, // $28.99 in cents
        comparePrice: 4499, // $44.99 in cents
        inventory: 100,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: shirts.id,
      },
    }),
    // Clothing
    prisma.product.create({
      data: {
        name: 'Batman T-Shirt',
        slug: 'batman-tshirt',
        sku: 'CLOTH-SHIRT-003',
        description: 'Batman themed comfortable cotton t-shirt',
        price: 2699, // $26.99 in cents
        comparePrice: 3299, // $32.99 in cents
        inventory: 20,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: shirts.id,
      },
    }),
    // Clothing
    prisma.product.create({
      data: {
        name: 'Cocomelon T-Shirt',
        slug: 'cocomelon-tshirt',
        sku: 'CLOTH-SHIRT-004',
        description: 'Cocomelon themed comfortable cotton t-shirt',
        price: 1499, // $24.99 in cents
        comparePrice: 2499, // $24.99 in cents
        inventory: 18,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: shirts.id,
      },
    }),
    // Books
    prisma.product.create({
      data: {
        name: 'JavaScript: The Good Parts',
        slug: 'javascript-the-good-parts',
        sku: 'BOOK-TEXTB-001',
        description: 'Essential JavaScript programming book',
        price: 1999, // $19.99 in cents
        inventory: 75,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: textbooks.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'The Pragmatic Programmer',
        slug: 'the-pragmatic-programmer',
        sku: 'BOOK-001',
        description: 'Must-read book for software developers',
        price: 2599, // $25.99 in cents
        inventory: 100,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: books.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'Data Structures and Algorithms in JavaScript',
        slug: 'data-structures-algorithms-javascript',
        sku: 'BOOK-TEXTB-002',
        description:
          'Comprehensive guide to data structures and algorithms in JavaScript',
        price: 3999, // $39.99 in cents
        inventory: 55,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: textbooks.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'Eloquent JavaScript',
        slug: 'eloquent-javascript',
        sku: 'BOOK-002',
        description: 'Essential JavaScript programming for beginners',
        price: 1299, // $12.99 in cents
        inventory: 15,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: books.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'Clean Code',
        slug: 'clean-code',
        sku: 'BOOK-003',
        description: 'A Handbook of Agile Software Craftsmanship',
        price: 2999, // $29.99 in cents
        inventory: 45,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: books.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'The Software Craftsman',
        slug: 'the-software-craftsman',
        sku: 'BOOK-004',
        description: 'A Handbook of Agile Software Craftsmanship',
        price: 2999, // $29.99 in cents
        inventory: 45,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: books.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'Data-Driven Development',
        slug: 'data-driven-development',
        sku: 'BOOK-005',
        description: 'Data as a first-class citizen in software development',
        price: 4999, // $49.99 in cents
        inventory: 35,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: books.id,
      },
    }),
    // Home & Garden
    prisma.product.create({
      data: {
        name: 'Indoor Plant Collection',
        slug: 'indoor-plant-collection',
        sku: 'HGRDN-001',
        description: 'Set of 5 easy-care indoor plants',
        price: 4999, // $49.99 in cents
        inventory: 30,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: homeGarden.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'Organic Herb Garden Kit',
        slug: 'organic-herb-garden-kit',
        sku: 'HGRDN-002',
        description: 'Grow your own herbs with this complete indoor kit',
        price: 2999,
        inventory: 25,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: homeGarden.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'Luxury Scented Candle Set',
        slug: 'luxury-scented-candle-set',
        sku: 'HGRDN-003',
        description: 'Set of 3 hand-poured candles for home ambiance',
        price: 3999,
        inventory: 40,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: homeGarden.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'Bamboo Storage Baskets',
        slug: 'bamboo-storage-baskets',
        sku: 'HGRDN-004',
        description: 'Eco-friendly woven baskets for stylish home storage',
        price: 2499,
        inventory: 50,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: homeGarden.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'Velvet Throw Pillow Set',
        slug: 'velvet-throw-pillow-set',
        sku: 'HGRDN-005',
        description:
          'Set of 2 soft velvet cushions for living rooms or bedrooms',
        price: 3499,
        inventory: 60,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: homeGarden.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'Ceramic Flower Vase',
        slug: 'ceramic-flower-vase',
        sku: 'HGRDN-006',
        description: 'Elegant handmade vase for fresh or dried flowers',
        price: 1999,
        inventory: 70,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: homeGarden.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'Aromatherapy Diffuser',
        slug: 'aromatherapy-diffuser',
        sku: 'HGRDN-007',
        description: 'Ultrasonic essential oil diffuser with LED lights',
        price: 4599,
        inventory: 45,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: homeGarden.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'Macrame Wall Hanging',
        slug: 'macrame-wall-hanging',
        sku: 'HGRDN-008',
        description: 'Handcrafted boho-chic decor for living spaces',
        price: 2999,
        inventory: 35,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: homeGarden.id,
      },
    }),

    prisma.product.create({
      data: {
        name: 'Outdoor Solar Lights',
        slug: 'outdoor-solar-lights',
        sku: 'HGRDN-009',
        description: 'Set of 6 waterproof solar-powered garden lights',
        price: 5599,
        inventory: 25,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: homeGarden.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Luxury Bath Towel Set',
        slug: 'luxury-bath-towel-set',
        sku: 'HGRDN-010',
        description: '6-piece premium cotton towel set for spa-like comfort',
        price: 4999,
        inventory: 30,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: homeGarden.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'The Alchemist',
        slug: 'the-alchemist',
        sku: 'BOOK-006',
        description:
          'A timeless novel about destiny and following your dreams by Paulo Coelho',
        price: 1599,
        comparePrice: 1999,
        inventory: 60,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: books.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Atomic Habits',
        slug: 'atomic-habits',
        sku: 'BOOK-007',
        description:
          'An easy and proven way to build good habits and break bad ones by James Clear',
        price: 1899,
        comparePrice: 2499,
        inventory: 80,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: books.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Sapiens: A Brief History of Humankind',
        slug: 'sapiens-brief-history-of-humankind',
        sku: 'BOOK-008',
        description:
          'A deep exploration of human evolution and civilization by Yuval Noah Harari',
        price: 2299,
        comparePrice: 2799,
        inventory: 50,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: books.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Deep Work',
        slug: 'deep-work',
        sku: 'BOOK-009',
        description:
          'Rules for focused success in a distracted world by Cal Newport',
        price: 1699,
        comparePrice: 2199,
        inventory: 70,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: books.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'The Subtle Art of Not Giving a F*ck',
        slug: 'the-subtle-art-of-not-giving-a-f',
        sku: 'BOOK-010',
        description:
          'A counterintuitive approach to living a good life by Mark Manson',
        price: 1799,
        comparePrice: 2399,
        inventory: 65,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: books.id,
      },
    }),
    prisma.product.create({
      data: {
        name: '1984',
        slug: '1984',
        sku: 'BOOK-011',
        description:
          'George Orwell’s dystopian masterpiece about surveillance and control',
        price: 1499,
        comparePrice: 1899,
        inventory: 75,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: books.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'The Power of Now',
        slug: 'the-power-of-now',
        sku: 'BOOK-012',
        description: 'A guide to spiritual enlightenment by Eckhart Tolle',
        price: 1699,
        comparePrice: 2099,
        inventory: 55,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: books.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Rich Dad Poor Dad',
        slug: 'rich-dad-poor-dad',
        sku: 'BOOK-013',
        description:
          'What the rich teach their kids about money by Robert Kiyosaki',
        price: 1499,
        comparePrice: 1999,
        inventory: 90,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: books.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Think and Grow Rich',
        slug: 'think-and-grow-rich',
        sku: 'BOOK-014',
        description: 'Napoleon Hill’s classic on success and mindset',
        price: 1399,
        comparePrice: 1899,
        inventory: 85,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: books.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'The Four Agreements',
        slug: 'the-four-agreements',
        sku: 'BOOK-015',
        description: 'A practical guide to personal freedom by Don Miguel Ruiz',
        price: 1299,
        comparePrice: 1799,
        inventory: 70,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: books.id,
      },
    }),

    // --- Additional Clothing (T-Shirts) ---
    prisma.product.create({
      data: {
        name: 'Classic White Cotton T-Shirt',
        slug: 'classic-white-cotton-tshirt',
        sku: 'CLOTH-SHIRT-005',
        description: 'Soft 100% cotton T-shirt with a relaxed fit',
        price: 1999,
        comparePrice: 2499,
        inventory: 100,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: shirts.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Black Graphic Tee',
        slug: 'black-graphic-tee',
        sku: 'CLOTH-SHIRT-006',
        description: 'Minimalist black T-shirt with a subtle front graphic',
        price: 2199,
        comparePrice: 2899,
        inventory: 90,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: shirts.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Vintage Wash T-Shirt',
        slug: 'vintage-wash-tshirt',
        sku: 'CLOTH-SHIRT-007',
        description: 'Retro washed finish for a worn-in look and feel',
        price: 2499,
        comparePrice: 2999,
        inventory: 60,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: shirts.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Eco-Friendly Bamboo Tee',
        slug: 'eco-friendly-bamboo-tee',
        sku: 'CLOTH-SHIRT-008',
        description: 'Sustainable bamboo fabric for breathable comfort',
        price: 2699,
        comparePrice: 3199,
        inventory: 75,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: shirts.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Slim Fit Crew Neck T-Shirt',
        slug: 'slim-fit-crew-neck-tshirt',
        sku: 'CLOTH-SHIRT-009',
        description: 'Modern slim-fit crew neck tee for everyday wear',
        price: 2099,
        comparePrice: 2599,
        inventory: 85,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: shirts.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Long Sleeve Cotton Tee',
        slug: 'long-sleeve-cotton-tee',
        sku: 'CLOTH-SHIRT-010',
        description: 'Lightweight long sleeve tee, perfect for layering',
        price: 2599,
        comparePrice: 2999,
        inventory: 70,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: shirts.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Pocket T-Shirt',
        slug: 'pocket-tshirt',
        sku: 'CLOTH-SHIRT-011',
        description: 'Classic fit T-shirt with left chest pocket detail',
        price: 2299,
        comparePrice: 2799,
        inventory: 95,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: shirts.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Tie-Dye T-Shirt',
        slug: 'tie-dye-tshirt',
        sku: 'CLOTH-SHIRT-012',
        description: 'Hand-dyed colorful T-shirt for a bold summer look',
        price: 2499,
        comparePrice: 3099,
        inventory: 50,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: shirts.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Oversized Heavyweight Tee',
        slug: 'oversized-heavyweight-tee',
        sku: 'CLOTH-SHIRT-013',
        description: 'Premium heavyweight cotton tee with oversized fit',
        price: 2799,
        comparePrice: 3299,
        inventory: 65,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: shirts.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'V-Neck Soft Touch Tee',
        slug: 'v-neck-soft-touch-tee',
        sku: 'CLOTH-SHIRT-014',
        description: 'Lightweight v-neck tee with soft, silky finish',
        price: 1999,
        comparePrice: 2599,
        inventory: 110,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.ACTIVE,
        categoryId: shirts.id,
      },
    }),

    // Discontinued product for testing
    prisma.product.create({
      data: {
        name: 'Vintage Phone Case',
        slug: 'vintage-phone-case',
        sku: 'ELEC-ACCES-001',
        description: 'Discontinued phone case design',
        price: 1499, // $14.99 in cents
        inventory: 0,
        images: [
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
          'https://placehold.co/400x400',
        ],
        status: ProductStatus.DISCONTINUED,
        categoryId: accessories.id,
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
  await prisma.order.create({
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
