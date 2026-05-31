import { useEffect, useMemo, useState } from 'react';
import { Place } from '../lib/types';
import { Link } from 'react-router-dom'
import {
  getDiscoverQuestions,
  searchDgisPlacesByAnswers,
  type DiscoverAnswer,
  type DiscoverOption
} from '../lib/discover'
import { useAppState } from '../state/AppState'

export default function DiscoverPage() {
  const { state } = useAppState()
  const [answers, setAnswers] = useState<DiscoverAnswer[]>([])
  const [error, setError] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [recommendations, setRecommendations] = useState<Array<{ place: Place; score: number; matchedTags: string[]; reason: string }>>([])

  const questions = useMemo(() => getDiscoverQuestions(answers), [answers])
  const step = answers.length
  const currentQuestion = questions[step]

  useEffect(() => {
    if (currentQuestion) {
      return
    }

    let isActive = true

    async function loadRecommendations() {
      setIsSearching(true)
      setError('')

      try {
        const recs = await searchDgisPlacesByAnswers(answers, state.currentLocation)

        if (!isActive) {
          return
        }

        setRecommendations(recs)
        window.sessionStorage.setItem('otkryvaika-discover-places', JSON.stringify(recs.map((item: { place: Place }) => item.place)))

        if (recs.length === 0) {
          setError('2ГИС не нашёл подходящие места по этим ответам. Попробуйте расширить радиус или пройти подбор заново.')
        }
      } catch (searchError) {
        if (!isActive) {
          return
        }

        setRecommendations([])
        setError(searchError instanceof Error ? searchError.message : 'Не удалось выполнить поиск в 2ГИС.')
      } finally {
        if (isActive) {
          setIsSearching(false)
        }
      }
    }

    loadRecommendations()

    return () => {
      isActive = false
    }
  }, [answers, currentQuestion, state.currentLocation])

  function advanceWithOption(option: DiscoverOption) {
    if (!currentQuestion) {
      return
    }

    setError('')
    setAnswers((current) => [
      ...current,
      {
        questionId: currentQuestion.id,
        label: option.label,
        tags: option.tags,
        query: option.query
      }
    ])
  }

  function resetQuiz() {
    setAnswers([])
    setError('')
    setRecommendations([])
  }

  return (
    <div className="page-grid">
      <section className="hero-card compact-hero">
        <div className="hero-copy">
          <div className="eyebrow">Открывайка</div>
          <h2>Соберём запрос к 2ГИС по вашим ответам</h2>
          <p>
            Ответьте на 6 коротких вопросов, а приложение найдёт 4-5 мест рядом с текущей точкой.
          </p>
        </div>
        <div className="quiz-progress">
          <span>Шаг {Math.min(step + 1, questions.length)} из {questions.length}</span>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${(answers.length / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </section>

      <section className="quiz-shell">
        {currentQuestion ? (
          <div className="quiz-question-card">
            <div className="section-heading">
              <strong>{currentQuestion.title}</strong>
              <span className="muted">{currentQuestion.hint}</span>
            </div>

            <div className="option-grid">
              {currentQuestion.options.map((option) => (
                <button
                  className="option-card"
                  key={option.label}
                  onClick={() => advanceWithOption(option)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>

            {error ? <p className="error-copy">{error}</p> : null}

            <div className="answer-summary">
              {answers.map((answer) => (
                <span className="summary-chip" key={answer.questionId}>
                  {answer.label}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="quiz-results section-card">
            <div className="section-heading">
              <strong>Готовая подборка</strong>
              <span className="muted">Места найдены через 2ГИС по собранным параметрам запроса.</span>
            </div>

            <div className="answer-summary">
              {answers.map((answer) => (
                <span className="summary-chip" key={answer.questionId}>
                  {answer.label}
                </span>
              ))}
            </div>

            {isSearching ? <div className="empty-state"><p>Ищем подходящие места в 2ГИС...</p></div> : null}
            {error ? <p className="error-copy">{error}</p> : null}

            <div className="recommend-grid">
              {recommendations.map((item, index) => (
                <article className="recommend-card" key={item.place.id}>
                  <div
                    className="place-gradient"
                    style={{ background: item.place.highlight }}
                  />
                  <div className="recommend-rank">#{index + 1}</div>
                  <h3>{item.place.name}</h3>
                  <p>{item.reason}</p>
                  <div className="chip-row">
                    {item.place.tags.slice(0, 4).map((tag: string) => (
                      <span className="info-chip" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="detail-actions">
                    <Link className="primary-button" to={`/?focus=${encodeURIComponent(item.place.id)}`}>
                      На карте
                    </Link>
                    <Link className="secondary-button small" to="/notes">
                      Смотреть заметки
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <div className="action-row">
              <button className="secondary-button" onClick={resetQuiz} type="button">
                Пройти ещё раз
              </button>
              <Link className="secondary-button" to="/rewards">
                Проверить бонусы
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
