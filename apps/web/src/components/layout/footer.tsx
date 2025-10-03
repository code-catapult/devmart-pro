import Link from 'next/link'
import {
  Store,
  Mail,
  Phone,
  MapPin,
  Github,
  Twitter,
  Linkedin,
} from 'lucide-react'

const footerLinks = {
  company: {
    title: 'Company',
    links: [
      { name: 'About Us', href: '/about' },
      { name: 'Our Team', href: '/team' },
      { name: 'Careers', href: '/careers' },
      { name: 'Press', href: '/press' },
      { name: 'Blog', href: '/blog' },
    ],
  },
  support: {
    title: 'Customer Support',
    links: [
      { name: 'Help Center', href: '/help' },
      { name: 'Contact Us', href: '/contact' },
      { name: 'Shipping Info', href: '/shipping' },
      { name: 'Returns', href: '/returns' },
      { name: 'Size Guide', href: '/size-guide' },
    ],
  },
  shop: {
    title: 'Shop',
    links: [
      { name: 'All Products', href: '/products' },
      { name: 'Categories', href: '/categories' },
      { name: 'New Arrivals', href: '/products?filter=new' },
      { name: 'Sale Items', href: '/products?filter=sale' },
      { name: 'Gift Cards', href: '/gift-cards' },
    ],
  },
  legal: {
    title: 'Legal',
    links: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Cookie Policy', href: '/cookies' },
      { name: 'GDPR', href: '/gdpr' },
      { name: 'Accessibility', href: '/accessibility' },
    ],
  },
}

const socialLinks = [
  { name: 'GitHub', href: 'https://github.com', icon: Github },
  { name: 'Twitter', href: 'https://twitter.com', icon: Twitter },
  { name: 'LinkedIn', href: 'https://linkedin.com', icon: Linkedin },
]

const contactInfo = [
  {
    icon: Mail,
    text: 'support@devmart.com',
    href: 'mailto:support@devmart.com',
  },
  { icon: Phone, text: '+1 (555) 123-4567', href: 'tel:+15551234567' },
  { icon: MapPin, text: '123 Commerce St, Business City, BC 12345', href: '#' },
]

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container px-4 py-12 mx-auto">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Store className="h-8 w-8 text-blue-400" />
              <span className="text-xl font-bold text-white">DevMart Pro</span>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              Your trusted e-commerce platform for quality products at
              competitive prices. We're committed to providing an exceptional
              shopping experience with secure payments and reliable delivery.
            </p>

            {/* Contact Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                Contact Information
              </h3>
              {contactInfo.map((contact, index) => (
                <a
                  key={index}
                  href={contact.href}
                  className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
                >
                  <contact.icon className="h-4 w-4" />
                  <span className="text-sm">{contact.text}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Footer Links */}
          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key} className="lg:col-span-1">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter Signup */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="max-w-md mx-auto text-center">
            <h3 className="text-lg font-semibold text-white mb-2">
              Stay Updated
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Subscribe to our newsletter for the latest products and exclusive
              offers.
            </p>
            <form className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-md border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Subscribe
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-2">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            {/* Copyright */}
            <div className="text-center md:text-left mb-4 md:mb-0">
              <p className="text-sm text-gray-400">
                © {currentYear} DevMart Pro. All rights reserved.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Built with ❤️ for developers learning e-commerce
              </p>
            </div>

            {/* Social Links */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400 hidden sm:block">
                Follow us:
              </span>
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label={`Follow us on ${social.name}`}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="bg-gray-800 py-4">
        <div className="container px-4 mx-auto">
          <div className="flex flex-wrap justify-center items-center gap-6 text-xs text-gray-500">
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Secure Payments</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>Free Shipping Over $50</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span>24/7 Customer Support</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>30-Day Returns</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
