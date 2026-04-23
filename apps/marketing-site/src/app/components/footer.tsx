import { getTranslations } from 'next-intl/server'
import { PublicFooter } from '@eduator/ui'

export async function Footer() {
  const t = await getTranslations('footer')
  const currentYear = new Date().getFullYear()

  return (
    <PublicFooter
      brandName="Eduator AI"
      brandDescription={t('brandDescription')}
      accent="violet"
      sections={[]}
      socialLinks={[]}
      copyright={`© ${currentYear} Eduator AI. ${t('allRightsReserved')}`}
    />
  )
}

