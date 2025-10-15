import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui'

import Link from 'next/link'
import { ShoppingBag, Users, Shield, Zap } from 'lucide-react'
import { Route } from 'next'
import { MainLayout } from '../components/layout/main-layout'

const features = [
  {
    icon: ShoppingBag,
    title: 'Complete E-commerce',
    description:
      'Full-featured shopping experience with cart, checkout, and order management.',
  },
  {
    icon: Users,
    title: 'User Management',
    description:
      'Secure authentication with role-based access control and user profiles.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description:
      'Built-in security features including encryption, validation, and monitoring.',
  },
  {
    icon: Zap,
    title: 'High Performance',
    description:
      'Optimized for speed with caching, CDN integration, and modern architecture.',
  },
]

export default function HomePage() {
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-64">
        <div className="container mx-auto px-4 text-center ">
          <Badge variant="secondary" className="mb-4 text-gray-600">
            Now in Development
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            DevMart Pro
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            A modern e-commerce learning platform built with Next.js,
            TypeScript, and the latest web technologies. Perfect for developers
            learning full-stack development.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/auth/signup">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/products">Browse Products</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 my-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-100 mb-4">
              Built for Learning
            </h2>
            <p className="text-gray-100 max-w-2xl mx-auto">
              Explore modern web development concepts through a real-world
              e-commerce application with comprehensive features and best
              practices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="bg-gray-50 py-24 my-24">
        <div className="container mx-auto px-4 my-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Modern Tech Stack
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Learn industry-standard technologies used by top development teams
              worldwide.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {[
              'Next.js 14',
              'TypeScript',
              'Tailwind CSS',
              'Prisma ORM',
              'PostgreSQL',
              'Redis',
              'tRPC',
              'NextAuth.js',
              'Jest',
              'Docker',
              'Redux Toolkit',
              'Radix UI',
            ].map((tech) => (
              <div key={tech} className="text-center">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="font-medium text-gray-900">{tech}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 my-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-100 mb-4">
            Ready to Start Learning?
          </h2>
          <p className="text-gray-100 mb-8 max-w-2xl mx-auto">
            Join our platform and start exploring modern e-commerce development
            with hands-on projects and real-world scenarios.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/auth/signup">Create Account</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={'/about' as Route}>Learn More</Link>
            </Button>
          </div>
        </div>
      </section>
    </MainLayout>
  )
}
