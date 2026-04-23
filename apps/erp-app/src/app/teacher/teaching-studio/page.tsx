import { getTranslations } from 'next-intl/server'
import { TeachingStudioHub } from '@eduator/ui'
import type { TeachingStudioTranslations } from '@eduator/ui'

export default async function TeachingStudioPage() {
  const t = await getTranslations('teacherTeachingStudio')

  const translations: TeachingStudioTranslations = {
    title: t('title'),
    subtitle: t('subtitle'),
    aiPoweredWorkflow: t('aiPoweredWorkflow'),
    step1Title: t('step1Title'),
    step1Desc: t('step1Desc'),
    step2Title: t('step2Title'),
    step2Desc: t('step2Desc'),
    step3Title: t('step3Title'),
    step3Desc: t('step3Desc'),
    createManageContent: t('createManageContent'),
    createManageContentDesc: t('createManageContentDesc'),
    recommendedStartingPoint: t('recommendedStartingPoint'),
    openWorkspace: t('openWorkspace'),
    connectedNote: t('connectedNote'),
    tileDocuments: t('tileDocuments'),
    tileDocumentsDesc: t('tileDocumentsDesc'),
    tileDocumentsBadge: t('tileDocumentsBadge'),
    tileExams: t('tileExams'),
    tileExamsDesc: t('tileExamsDesc'),
    tileExamsBadge: t('tileExamsBadge'),
    tileLessons: t('tileLessons'),
    tileLessonsDesc: t('tileLessonsDesc'),
    tileLessonsBadge: t('tileLessonsBadge'),
    tileCourses: t('tileCourses'),
    tileCoursesDesc: t('tileCoursesDesc'),
    tileCoursesBadge: t('tileCoursesBadge'),
    tileAiTutor: t('tileAiTutor'),
    tileAiTutorDesc: t('tileAiTutorDesc'),
    tileAiTutorBadge: t('tileAiTutorBadge'),
  }

  return <TeachingStudioHub accentColor="blue" translations={translations} />
}

