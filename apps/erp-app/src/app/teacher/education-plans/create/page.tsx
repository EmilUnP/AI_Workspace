'use client'

import { useTranslations } from 'next-intl'
import { EducationPlanCreateForm } from '@eduator/ui'
import { createEducationPlan } from '../actions'

export default function CreateEducationPlanPage() {
  const t = useTranslations('teacherEducationPlans')
  const audienceOptions = [
    { value: '', label: t('selectAudience') },
    { value: 'Grade 1', label: t('grade1') },
    { value: 'Grade 2', label: t('grade2') },
    { value: 'Grade 3', label: t('grade3') },
    { value: 'Grade 4', label: t('grade4') },
    { value: 'Grade 5', label: t('grade5') },
    { value: 'Grade 6', label: t('grade6') },
    { value: 'Grade 7', label: t('grade7') },
    { value: 'Grade 8', label: t('grade8') },
    { value: 'Grade 9', label: t('grade9') },
    { value: 'Grade 10', label: t('grade10') },
    { value: 'Grade 11', label: t('grade11') },
    { value: 'Grade 12', label: t('grade12') },
    { value: 'Undergraduate', label: t('undergraduate') },
    { value: 'Graduate', label: t('graduate') },
    { value: 'PhD', label: t('phd') },
    { value: '__other__', label: t('otherCustom') },
  ]
  return (
    <EducationPlanCreateForm
      generateUrl="/api/teacher/education-plans/generate"
      classesUrl="/api/teacher/classes"
      documentsUrl="/api/teacher/documents"
      createPlanAction={createEducationPlan}
      backHref="/teacher/education-plans"
      planDetailHref={(id) => `/teacher/education-plans/${id}`}
      audienceOptions={audienceOptions}
      labels={{
        backToPlans: t('backToPlans'),
        createTitle: t('createTitle'),
        createSubtitle: t('createSubtitle'),
        basics: t('basics'),
        planName: t('planName'),
        classGroup: t('classGroupOptional'),
        selectClass: t('selectClassOptional'),
        descriptionOptional: t('descriptionOptional'),
        briefDescription: t('briefDescription'),
        schedule: t('schedule'),
        periodMonths: t('periodMonths'),
        sessionsPerWeek: t('sessionsPerWeek'),
        hoursPerSession: t('hoursPerSession'),
        audience: t('audience'),
        audiencePlaceholder: t('audiencePlaceholder'),
        outputLanguage: t('outputLanguage'),
        outputLanguageHint: t('outputLanguageHint'),
        baseOnDocuments: t('baseOnDocuments'),
        baseOnDocumentsHint: t('baseOnDocumentsHint'),
        noDocumentsYet: t('noDocumentsYet'),
        createPlanSection: t('createPlanSection'),
        generateWithAi: t('generateWithAi'),
        buildManually: t('buildManually'),
        planNamePlaceholder: t('planNamePlaceholder'),
        planNameRequired: t('planNameRequired'),
        nameAndClassRequired: t('nameAndClassRequired'),
        planGeneratedNotSaved: t('planGeneratedNotSaved'),
        generateFailed: t('generateFailed'),
        failedToCreatePlan: t('failedToCreatePlan'),
        selectAudience: t('selectAudience'),
        otherCustom: t('otherCustom'),
      }}
    />
  )
}
