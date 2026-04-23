/**
 * Static message imports for i18n.
 * Avoids dynamic import() so Vercel deployment can package the output reliably.
 * See: MESSAGE_MODULES in module-mapping.ts (public, platform-owner, school-admin).
 */

import publicAz from '../messages/public/az.json'
import publicEn from '../messages/public/en.json'
import teacherAz from '../messages/teacher/az.json'
import teacherEn from '../messages/teacher/en.json'
import platformOwnerAz from '../messages/platform-owner/az.json'
import platformOwnerEn from '../messages/platform-owner/en.json'
import schoolAdminAz from '../messages/school-admin/az.json'
import schoolAdminEn from '../messages/school-admin/en.json'

type Messages = Record<string, unknown>

export const MESSAGES = {
  public: { az: publicAz as Messages, en: publicEn as Messages },
  'platform-owner': {
    az: platformOwnerAz as Messages,
    en: platformOwnerEn as Messages,
  },
  'school-admin': {
    // During migration, school-admin pages still reference legacy teacher translation namespaces.
    az: {
      ...(teacherAz as Messages),
      ...(schoolAdminAz as Messages),
    } as Messages,
    en: {
      ...(teacherEn as Messages),
      ...(schoolAdminEn as Messages),
    } as Messages,
  },
} as const
