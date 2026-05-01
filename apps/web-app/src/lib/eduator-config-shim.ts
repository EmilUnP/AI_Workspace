export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', countryCode: 'gb' },
  { code: 'az', name: 'Azerbaijani', countryCode: 'az' },
  { code: 'tr', name: 'Turkish', countryCode: 'tr' },
  { code: 'ru', name: 'Russian', countryCode: 'ru' },
]

export const QUESTION_TYPES = {
  multiple_choice: 'multiple_choice',
  true_false: 'true_false',
  short_answer: 'short_answer',
  fill_blank: 'fill_blank',
  multiple_select: 'multiple_select',
} as const
