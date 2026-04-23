import Link from 'next/link'
import { GraduationCap } from 'lucide-react'

interface FooterLink {
  href: string
  label: string
}

interface FooterSection {
  title: string
  links: FooterLink[]
}

interface PublicFooterProps {
  brandName: string
  brandDescription: string
  accent?: 'violet' | 'green'
  sections: FooterSection[]
  socialLinks: FooterLink[]
  copyright: string
}

export function PublicFooter({
  brandName,
  brandDescription,
  accent = 'violet',
  sections,
  socialLinks,
  copyright,
}: PublicFooterProps) {
  const accentBg = accent === 'green' ? 'bg-green-600' : 'bg-violet-600'

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentBg}`}>
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">{brandName}</span>
            </div>
            <p className="text-sm text-gray-600">{brandDescription}</p>
          </div>

          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
              <ul className="mt-4 space-y-3">
                {section.links.map((link) => (
                  <li key={`${section.title}-${link.href}-${link.label}`}>
                    <Link href={link.href} className="text-sm text-gray-600 hover:text-gray-900">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-gray-500">{copyright}</p>
            <div className="flex items-center gap-6">
              {socialLinks.map((link) => (
                <Link key={`${link.href}-${link.label}`} href={link.href} className="text-sm text-gray-500 hover:text-gray-900">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
