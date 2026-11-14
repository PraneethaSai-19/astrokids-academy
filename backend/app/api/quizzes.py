from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_owned_child
from app.database import get_db
from app.models import Child, Quiz, QuizAttempt
from app.schemas import QuizSubmit
from app.services.progression import award_xp, evaluate_badges, reward_summary, total_xp, try_daily

router = APIRouter(tags=["Quizzes"])


def _quiz(db: Session, slug: str) -> Quiz:
    q = db.scalar(select(Quiz).where(Quiz.slug == slug))
    if q is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Quiz not found.")
    return q


@router.get("/api/quizzes", summary="List quizzes")
def list_quizzes(db: Session = Depends(get_db)):
    return [{"slug": q.slug, "title": q.title, "description": q.description,
             "question_count": len(q.questions), "xp_per_correct": q.xp_per_correct}
            for q in db.scalars(select(Quiz).order_by(Quiz.id))]


@router.get("/api/quizzes/{slug}", summary="Quiz questions (answers are not included)")
def get_quiz(slug: str, db: Session = Depends(get_db)):
    q = _quiz(db, slug)
    return {"slug": q.slug, "title": q.title, "description": q.description, "xp_per_correct": q.xp_per_correct,
            "questions": [{"id": qq.id, "question": qq.question, "options": qq.options} for qq in q.questions]}


@router.get("/api/children/{child_id}/quizzes/best", summary="Best quiz results for a child")
def best(child: Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    rows = db.execute(select(Quiz.slug, func.max(QuizAttempt.percent), func.count(QuizAttempt.id))
                      .join(QuizAttempt, QuizAttempt.quiz_id == Quiz.id)
                      .where(QuizAttempt.child_id == child.id).group_by(Quiz.slug)).all()
    return {slug: {"best_percent": pct, "attempts": n} for slug, pct, n in rows}


@router.post("/api/children/{child_id}/quizzes/{slug}/submit", summary="Submit answers; server scores them")
def submit(slug: str, body: QuizSubmit, child: Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    quiz = _quiz(db, slug)
    questions = quiz.questions
    if len(body.answers) != len(questions):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Please answer every question.")
    review, correct = [], 0
    for qq, ans in zip(questions, body.answers):
        ok = ans == qq.correct_index
        correct += ok
        review.append({"question_id": qq.id, "picked": ans, "correct": ok,
                       "correct_index": qq.correct_index, "explanation": qq.explanation})
    total = len(questions)
    percent = round(correct / total * 100) if total else 0
    before = total_xp(db, child.id)
    prev_best = db.scalar(select(func.max(QuizAttempt.correct_count)).where(
        QuizAttempt.child_id == child.id, QuizAttempt.quiz_id == quiz.id)) or 0
    # XP only for improving on your best score: each correct answer can be rewarded once.
    xp = 0
    for n in range(prev_best + 1, correct + 1):
        xp += award_xp(db, child.id, "quiz", f"quiz:{quiz.slug}:{n}", quiz.xp_per_correct,
                       f"{quiz.title}: correct answer #{n}")
    db.add(QuizAttempt(child_id=child.id, quiz_id=quiz.id, correct_count=correct, total_questions=total,
                       percent=percent, xp_earned=xp, answers=body.answers))
    db.flush()
    daily = try_daily(db, child.id, "quiz") if percent >= 50 else 0
    badges = evaluate_badges(db, child.id)
    db.commit()
    return {"quiz": quiz.slug, "correct": correct, "total": total, "percent": percent, "review": review,
            **reward_summary(db, child, before, xp, badges, daily)}
