/**
 * Static message imports for i18n.
 * Avoids dynamic import() so Vercel deployment can package the output reliably.
 * See: MESSAGE_MODULES in module-mapping.ts (public, teacher, student, platform-owner, school-admin).
 */

import publicAz from '../messages/public/az.json'
import publicEn from '../messages/public/en.json'
import publicRu from '../messages/public/ru.json'
import publicTr from '../messages/public/tr.json'
import teacherAz from '../messages/teacher/az.json'
import teacherEn from '../messages/teacher/en.json'
import teacherRu from '../messages/teacher/ru.json'
import teacherTr from '../messages/teacher/tr.json'
import studentAz from '../messages/student/az.json'
import studentEn from '../messages/student/en.json'
import studentRu from '../messages/student/ru.json'
import studentTr from '../messages/student/tr.json'
import platformOwnerAz from '../messages/platform-owner/az.json'
import platformOwnerEn from '../messages/platform-owner/en.json'
import platformOwnerRu from '../messages/platform-owner/ru.json'
import platformOwnerTr from '../messages/platform-owner/tr.json'
import schoolAdminAz from '../messages/school-admin/az.json'
import schoolAdminEn from '../messages/school-admin/en.json'
import schoolAdminRu from '../messages/school-admin/ru.json'
import schoolAdminTr from '../messages/school-admin/tr.json'

type Messages = Record<string, unknown>

export const MESSAGES = {
  public: { az: publicAz as Messages, en: publicEn as Messages, ru: publicRu as Messages, tr: publicTr as Messages },
  teacher: { az: teacherAz as Messages, en: teacherEn as Messages, ru: teacherRu as Messages, tr: teacherTr as Messages },
  student: { az: studentAz as Messages, en: studentEn as Messages, ru: studentRu as Messages, tr: studentTr as Messages },
  'platform-owner': {
    az: platformOwnerAz as Messages,
    en: platformOwnerEn as Messages,
    ru: platformOwnerRu as Messages,
    tr: platformOwnerTr as Messages,
  },
  'school-admin': {
    az: schoolAdminAz as Messages,
    en: schoolAdminEn as Messages,
    ru: schoolAdminRu as Messages,
    tr: schoolAdminTr as Messages,
  },
} as const
