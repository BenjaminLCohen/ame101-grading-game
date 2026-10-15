"use client";

import slidesData from "@/data/slides.json";

export type SlideBlock = { text: string; level: number };
export type AnswerCard = { letter: string; verdict: string; note: string; source: string };
export type Slide = {
  id: number;
  title: string;
  kind: string;
  isPoll: boolean;
  letter: string | null;
  round: number | null;
  image: string | null;
  blocks: SlideBlock[];
  answers: AnswerCard[];
};

export const slides = slidesData.slides as Slide[];

export function DeckSlide({ slide, index }: { slide: Slide; index: number }) {
  const kicker =
    slide.kind === "example" && slide.round && slide.letter
      ? `Round ${slide.round} · Example ${slide.letter}`
      : slide.kind === "answer"
        ? "Answer key"
        : slide.kind === "lecture"
          ? "Chapter 8"
          : "Grading game";
  return (
    <article className="stage">
      <div className="kicker">
        <span>{kicker}</span>
        <span>
          {index + 1} / {slides.length}
        </span>
      </div>
      <div className="title-row">
        {slide.letter && slide.kind === "example" ? <span className="badge">{slide.letter}</span> : null}
        <h1>{slide.kind === "example" ? `Example ${slide.letter}` : slide.title}</h1>
      </div>
      {slide.kind === "example" ? <p className="muted">{slide.title}</p> : null}
      {slide.image ? <img src={slide.image} alt={slide.title} /> : null}
      {slide.blocks.map((block, i) =>
        block.text.startsWith("“") ? (
          <blockquote key={i}>{block.text}</blockquote>
        ) : block.text.startsWith("if ") ? (
          <pre key={i} className="code-line">{block.text}</pre>
        ) : (
          <p key={i} className={`lvl-${block.level}`}>{block.text}</p>
        ),
      )}
      {slide.answers.length > 0 ? (
        <div className="answers">
          {slide.answers.map((card) => (
            <section key={card.letter} className="answer">
              <header>
                <strong>{card.letter}</strong>
                <span className={`pill ${card.verdict === "WEAK" ? "weak" : card.verdict === "OK" ? "ok" : "strong"}`}>
                  {card.verdict}
                </span>
              </header>
              <p>{card.note}</p>
              <p className="source">{card.source}</p>
            </section>
          ))}
        </div>
      ) : null}
    </article>
  );
}
