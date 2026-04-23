/**
 * Lesson Generation Prompts
 */

export function createLessonGenerationPrompt(params: {
  topic: string
  subject?: string
  gradeLevel: string
  durationMinutes: number
  learningObjectives?: string[]
  teachingStyle?: 'traditional' | 'inquiry_based' | 'project_based' | 'flipped'
  includeActivities?: boolean
  includeAssessment?: boolean
  language?: string
  customInstructions?: string
}): string {
  const {
    topic,
    subject = 'General',
    gradeLevel,
    durationMinutes,
    learningObjectives = [],
    teachingStyle = 'traditional',
    includeActivities = true,
    includeAssessment = true,
    language = 'English',
    customInstructions,
  } = params

  const styleDescriptions: Record<string, string> = {
    traditional: 'Direct instruction with clear explanations and guided practice',
    inquiry_based: 'Student-led discovery through questions and exploration',
    project_based: 'Hands-on project work with real-world applications',
    flipped: 'Pre-class content review with in-class application and discussion',
  }

  return `You are an expert curriculum designer. Create a comprehensive lesson plan for the following:

## Lesson Details:
- Topic: ${topic}
- Subject: ${subject}
- Grade Level: ${gradeLevel}
- Duration: ${durationMinutes} minutes
- Teaching Style: ${teachingStyle} - ${styleDescriptions[teachingStyle]}
- Language: ${language}

${learningObjectives.length > 0 ? `## Learning Objectives:\n${learningObjectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}` : '## Generate 3-5 appropriate learning objectives for this topic.'}

## Output Format:
Generate a detailed lesson plan in JSON format:
{
  "title": "Lesson title",
  "description": "Brief description of the lesson",
  "duration_minutes": ${durationMinutes},
  "learning_objectives": ["objective 1", "objective 2", ...],
  "prerequisites": ["What students should know beforehand"],
  "materials": [
    {
      "name": "Material name",
      "type": "document|video|link|image",
      "description": "How it's used",
      "is_required": true|false
    }
  ],
  "content": {
    "sections": [
      {
        "title": "Section title (e.g., Introduction, Main Content, Practice)",
        "content_type": "text|video|interactive|quiz",
        "content": "Detailed content for this section",
        "duration_minutes": 10,
        "teacher_notes": "Instructions for the teacher",
        "order": 1
      }
    ],
    "summary": "Key takeaways from the lesson",
    "key_vocabulary": [
      {
        "term": "Term",
        "definition": "Definition",
        "example": "Example usage"
      }
    ]${includeAssessment ? `,
    "assessment_questions": [
      {
        "question": "Discussion or practice question",
        "type": "discussion|reflection|practice",
        "suggested_answer": "Model answer or discussion points"
      }
    ]` : ''}
  }${includeActivities ? `,
  "activities": [
    {
      "name": "Activity name",
      "type": "individual|pair|group|whole_class",
      "duration_minutes": 10,
      "description": "What students do",
      "materials_needed": ["list of materials"],
      "instructions": ["step 1", "step 2", ...]
    }
  ]` : ''},
  "differentiation": {
    "for_struggling_learners": "Modifications for students who need support",
    "for_advanced_learners": "Extensions for students who need challenge"
  },
  "homework": {
    "assignment": "Homework description",
    "estimated_time_minutes": 20
  }
}

## Guidelines:
1. Content should be accurate and grade-appropriate
2. Include engaging hooks and real-world connections
3. Balance teacher-led and student-centered activities
4. Ensure smooth transitions between sections
5. Time allocations should be realistic
6. Include formative assessment opportunities throughout

${customInstructions ? `## Additional Instructions:\n${customInstructions}` : ''}

Create a complete, ready-to-use lesson plan.`
}

/**
 * Lesson content expansion prompt
 */
export function createContentExpansionPrompt(params: {
  sectionTitle: string
  currentContent: string
  targetAudience: string
  expansionType: 'examples' | 'explanation' | 'activities' | 'assessment'
}): string {
  const expansionInstructions: Record<string, string> = {
    examples: 'Add 3-5 relevant real-world examples that illustrate the concepts',
    explanation: 'Expand the explanation with more detail and clarity',
    activities: 'Add 2-3 engaging learning activities for this content',
    assessment: 'Create formative assessment questions to check understanding',
  }

  return `Expand the following lesson section for ${params.targetAudience}:

## Section: ${params.sectionTitle}

## Current Content:
${params.currentContent}

## Task:
${expansionInstructions[params.expansionType]}

## Guidelines:
- Maintain consistency with the existing content
- Ensure additions are grade-appropriate
- Keep the same tone and style
- Make content engaging and memorable

Provide the expanded content in a clear, structured format.`
}
