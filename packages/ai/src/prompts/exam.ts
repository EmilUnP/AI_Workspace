import type { DifficultyDistribution } from '@eduator/core/types/exam'
import type { QuestionType } from '@eduator/config'

/**
 * Exam Generation Prompts
 */

export function createExamGenerationPrompt(params: {
  documentText: string
  questionCount: number
  difficultyDistribution: DifficultyDistribution
  questionTypes: QuestionType[]
  subject?: string
  gradeLevel?: string
  language?: string
  customInstructions?: string
  includeExplanations?: boolean
  includeHints?: boolean
}): string {
  const {
    documentText,
    questionCount,
    difficultyDistribution,
    questionTypes,
    subject,
    gradeLevel,
    language = 'English',
    customInstructions,
    includeExplanations = true,
    includeHints = false,
  } = params

  const questionTypeDescriptions: Record<QuestionType, string> = {
    multiple_choice: 'Multiple Choice (4 options, one correct answer)',
    multiple_select: 'Multiple Select (4-5 options, multiple correct answers)',
    fill_blank: 'Fill in the Blank (short answer to complete a sentence)',
    true_false: 'True/False',
  }

  const selectedTypes = questionTypes.map((t) => questionTypeDescriptions[t]).join(', ')

  const easyCount = Math.round((difficultyDistribution.easy / 100) * questionCount)
  const mediumCount = Math.round((difficultyDistribution.medium / 100) * questionCount)
  const hardCount = questionCount - easyCount - mediumCount

  return `You are an expert educational assessment creator. Generate ${questionCount} professional, human-quality exam questions. Each question must be self-contained and fair to the student.

## CRITICAL QUALITY RULES (MUST FOLLOW):
1. **NEVER reference page numbers.** No "on page 17", "на странице 17", "see page X" — the student does not see pages.
2. **NEVER reference section/chapter/topic names in the question text.** No "in the Introduction", "во ВВЕДЕНИИ", "according to section X". Questions must be self-contained.
3. **NEVER refer to content the student cannot see.** Do not ask about "the table below", "the figure", "the diagram", "согласно таблице" unless you state the full relevant information in the question text. Every question must be answerable from the question and options alone.
4. **Write like a professional assessment.** Clear, natural, human language; no meta-references to the document or examiner jargon.
5. **Explanations must be direct.** Do not start with filler like "According to the text...", "The text states...", "Mətndə ... qeyd olunur ki", or similar source-referencing intros in any language.

## Source Content:
${documentText}

## Requirements:
- Subject: ${subject || 'General'}
- Grade Level: ${gradeLevel || 'Not specified'}
- Language: ${language}
- Question Types: ${selectedTypes}

## Difficulty Distribution:
- Easy (${difficultyDistribution.easy}%): ${easyCount} questions - Basic recall and comprehension
- Medium (${difficultyDistribution.medium}%): ${mediumCount} questions - Application and analysis
- Hard (${difficultyDistribution.hard}%): ${hardCount} questions - Synthesis and evaluation

## Output Format:
Generate a JSON array of questions with the following structure:
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice" | "multiple_select" | "fill_blank" | "true_false",
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"], // For MC/MS only
      "correct_answer": "Option A" | ["Option A", "Option C"] | "answer text" | "true/false",
      "difficulty": "easy" | "medium" | "hard",
      ${includeExplanations ? '"explanation": "Why this is the correct answer",' : ''}
      ${includeHints ? '"hint": "A helpful hint for students",' : ''}
      "order": 1
    }
  ]
}

## Guidelines:
1. Questions should directly relate to the source content
2. Avoid ambiguous wording
3. For multiple choice, all options should be plausible
4. Correct answers must be factually accurate based on the content
5. Vary question complexity according to difficulty level
6. Ensure even distribution of question types where possible
8. If the source mentions a table/figure, either state the needed facts in the question stem or skip that content — never ask "according to the table" without providing the table data in the question
9. Explanations should be short, specific, and student-facing; begin with the key concept, not with source references.

${customInstructions ? `## Additional Instructions:\n${customInstructions}` : ''}

Generate exactly ${questionCount} questions following these specifications.`
}

/**
 * Question Improvement Prompt
 */
export function createQuestionImprovementPrompt(params: {
  question: string
  options?: string[]
  correctAnswer: string | string[]
  feedback: string
}): string {
  return `You are an expert educational assessment designer. Improve the following exam question based on the feedback provided.

## Original Question:
${params.question}

${params.options ? `## Options:\n${params.options.map((o, i) => `${i + 1}. ${o}`).join('\n')}` : ''}

## Correct Answer:
${Array.isArray(params.correctAnswer) ? params.correctAnswer.join(', ') : params.correctAnswer}

## Feedback for Improvement:
${params.feedback}

## Instructions:
1. Address all issues mentioned in the feedback
2. Maintain the question's core learning objective
3. Ensure clarity and avoid ambiguity
4. Make sure the correct answer is definitively correct
5. For multiple choice, ensure distractors are plausible but clearly incorrect

Provide the improved question in JSON format:
{
  "question": "Improved question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": "The correct answer",
  "explanation": "Why this is the correct answer",
  "improvements_made": ["List of changes made"]
}`
}

/**
 * Answer Validation Prompt
 */
export function createAnswerValidationPrompt(params: {
  question: string
  correctAnswer: string | string[]
  studentAnswer: string | string[]
  questionType: QuestionType
}): string {
  return `You are an expert grader. Evaluate the student's answer to the following question.

## Question:
${params.question}

## Question Type: ${params.questionType}

## Correct Answer:
${Array.isArray(params.correctAnswer) ? params.correctAnswer.join(', ') : params.correctAnswer}

## Student's Answer:
${Array.isArray(params.studentAnswer) ? params.studentAnswer.join(', ') : params.studentAnswer}

## Instructions:
Evaluate if the student's answer is correct. For fill-in-the-blank and short answer questions, consider synonyms and minor variations as potentially correct.

Respond in JSON format:
{
  "is_correct": true | false,
  "partial_credit": 0.0 - 1.0, // For partial correctness
  "feedback": "Specific feedback for the student",
  "explanation": "Why this answer is correct/incorrect"
}`
}
