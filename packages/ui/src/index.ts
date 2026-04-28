// Utility
export { cn } from './lib/utils'

// UI Components
export { Button, buttonVariants, type ButtonProps } from './components/ui/button'
export { Input, type InputProps } from './components/ui/input'
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './components/ui/card'
export { Badge, badgeVariants, type BadgeProps } from './components/ui/badge'
export { Avatar, type AvatarProps } from './components/ui/avatar'
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './components/ui/dialog'
export {
  Pagination,
  PaginationInfo,
  PaginationFooter,
} from './components/ui/pagination'

// Analytics Components
export { StatCard, type StatCardProps } from './components/analytics/stat-card'
export { DashboardCard, type DashboardCardProps } from './components/analytics/dashboard-card'
export { BarChart, LineChart, DonutChart, HorizontalBarChart, ProgressRing } from './components/analytics/charts'

// Navigation Components
export {
  Sidebar,
  platformOwnerSidebarItems,
  schoolAdminSidebarItems,
  teacherSidebarItems,
  type SidebarProps,
  type SidebarItem,
  type SidebarSection,
} from './components/navigation/sidebar'
export { Navbar, type NavbarProps } from './components/navigation/navbar'
export {
  PublicHeaderClient,
  type PublicHeaderClientProps,
  type NavLink,
} from './components/navigation/public-header-client'
export {
  PublicPageShell,
  PublicContainer,
} from './components/public/public-layout'
export {
  LanguageSwitcher,
  type LanguageSwitcherProps,
  type LocaleOption,
} from './components/navigation/language-switcher'

// Math / Formula rendering (lessons, exams, chat)
export { RichTextWithMath, type RichTextWithMathProps } from './components/math/rich-text-with-math'
export { renderLatexInHtml, renderPlainTextWithMath } from './lib/math-render'

// Exam Components
export { QuestionCard, type QuestionCardProps } from './components/exam/question-card'
export { ExamCreator, DEFAULT_EXAM_CREATOR_TRANSLATIONS, ExamCreatorTranslationsProvider, type ExamCreatorProps, type ExamCreatorTranslations, type ExamActions, type ExamData, type Question, type QuestionType, type DifficultyLevel } from './components/exam/exam-creator'
export { QuestionPreview, type QuestionPreviewProps } from './components/exam/question-preview'
export { QuestionEditor, type QuestionEditorProps } from './components/exam/question-editor'
export { exportQuestionsToCsv, type ExportQuestion, type ExportQuestionsCsvOptions } from './components/exam/export-questions-csv'

// Error boundary (shared by web interfaces)
export {
  AppErrorBoundary,
  type AppErrorBoundaryProps,
  type ErrorBoundaryVariant,
} from './components/error-boundary/app-error-boundary'
export {
  GlobalErrorBoundary,
  type GlobalErrorBoundaryProps,
} from './components/error-boundary/global-error-boundary'

// Document Components
export { DocumentUploadZone, type DocumentUploadActions, type DocumentUploadTranslations } from './components/documents/document-upload-zone'
export { EditDocumentDialog, type DocumentActions } from './components/documents/edit-document-dialog'
export { DocumentsList, useDocumentsList } from './components/documents/documents-list'
export {
  DocumentsExplorer,
  type DocumentExplorerItem,
  type DocumentsExplorerProps,
  type DocumentsExplorerTranslations,
} from './components/documents/documents-explorer'

// Lesson Components
export { LessonTabs, type LessonImage, type MiniTestQuestion, type Example } from './components/lessons/lesson-tabs'
export { LessonContent } from './components/lessons/lesson-content'
export { AudioPlayer, type AudioPlayerProps } from './components/lessons/audio-player'
export { LessonActions, type LessonActionsProps } from './components/lessons/lesson-actions'
export { LessonRowActions, type LessonRowActionsProps } from './components/lessons/lesson-row-actions'

// AI Tutor Components
export { AITutor } from './components/chat/teacher-chat'

// Teacher Dashboard Components
export { DashboardHeader } from './components/teacher/dashboard-header'
export { DashboardStatCard } from './components/teacher/dashboard-stat-card'
export { 
  TeacherDashboardClient, 
  type TeacherDashboardClientProps, 
  type TeacherDashboardStats,
  type TeacherDashboardTranslations,
  type Exam,
  type Document,
  type ClassData
} from './components/teacher/teacher-dashboard-client'
export { formatDate, formatFileSize, getGreeting } from './utils/teacher-dashboard'

// Teacher Settings Components
export { TeacherSettingsClient, type TeacherSettingsClientProps, type TeacherSettingsTranslations } from './components/teacher/teacher-settings-client'

export { AddClassDialog, type AddClassDialogProps, type AddClassDialogLabels } from './components/teacher/add-class-dialog'
export { ClassAITutor, type ClassAITutorLabels } from './components/teacher/class-ai-tutor'
export { ShareExamDialog, type ShareExamDialogProps, type ShareExamDialogLabels } from './components/teacher/share-exam-dialog'
export { ShareDocumentDialog, type ShareDocumentDialogProps, type ShareDocumentDialogLabels, type Document as ShareDocument } from './components/teacher/share-document-dialog'
export { ShareLessonDialog, type ShareLessonDialogProps, type ShareLessonDialogLabels, type Lesson } from './components/teacher/share-lesson-dialog'
export { SharedContentList, type SharedContentListProps, type SharedContentListLabels } from './components/teacher/shared-content-list'
export {
  EducationPlanCreateForm,
  EDUCATION_PLAN_LANGUAGES,
  type EducationPlanCreateFormProps,
  type EducationPlanCreateFormLabels,
  type ClassOption as EducationPlanClassOption,
  type DocumentOption as EducationPlanDocumentOption,
} from './components/teacher/education-plan-create-form'
export {
  EducationPlanRowActions,
  type EducationPlanRowActionsProps,
  type EducationPlanRowActionsLabels,
} from './components/teacher/education-plan-row-actions'
export {
  EducationPlanEditForm,
  type EducationPlanEditFormProps,
  type EducationPlanEditFormLabels,
} from './components/teacher/education-plan-edit-form'
