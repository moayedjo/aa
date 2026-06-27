/**
 * JO Study — submit quiz answers. Scoring is authoritative server-side.
 */
import { NextRequest } from 'next/server'
import { requireUser, studyError, studyOk } from '@/lib/study/studyAuth'
import { studyRateLimit } from '@/lib/study/rateLimitConfig'
import { scoreQuiz } from '@/lib/study/quizScoring'
import { quizQuestionSchema, submitQuizRequest, type QuizQuestion } from '@/lib/study/schemas'
import { isValidUUID } from '@/lib/apiHelpers'
import { z } from 'zod'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  if (!isValidUUID(params.id)) return studyError('VALIDATION')
  if (!await studyRateLimit('quiz', user.id)) return studyError('RATE_LIMITED')

  let body: unknown
  try { body = await req.json() } catch { return studyError('VALIDATION') }
  const parsed = submitQuizRequest.safeParse(body)
  if (!parsed.success) return studyError('VALIDATION', parsed.error.issues[0]?.message)
  const { answers } = parsed.data

  // Ownership check + load questions.
  const { data: quiz, error: quizErr } = await supabase
    .from('study_quizzes')
    .select('id, user_id, questions')
    .eq('id', params.id)
    .maybeSingle()
  if (quizErr) {
    console.error('quiz submit fetch error:', quizErr.code)
    return studyError('SERVER_ERROR')
  }
  if (!quiz || quiz.user_id !== user.id) return studyError('NOT_FOUND')

  const questionsParsed = z.array(quizQuestionSchema).safeParse(quiz.questions)
  if (!questionsParsed.success) {
    console.error('quiz submit bad stored questions')
    return studyError('SERVER_ERROR')
  }
  const questions: QuizQuestion[] = questionsParsed.data

  // Authoritative server-side scoring (any client-supplied score is ignored).
  const score = scoreQuiz(questions, answers)

  const { error: insErr } = await supabase
    .from('study_quiz_attempts')
    .insert({
      user_id: user.id,
      quiz_id: quiz.id,
      answers,
      score: score.score,
      weak_topics: score.weakTopics,
      completed_at: new Date().toISOString(),
    })
  if (insErr) {
    console.error('quiz submit insert error:', insErr.code)
    return studyError('SERVER_ERROR')
  }

  return studyOk({
    score: score.score,
    correct: score.correct,
    graded: score.graded,
    total: score.total,
    weakTopics: score.weakTopics,
    perQuestion: score.perQuestion,
  })
}
