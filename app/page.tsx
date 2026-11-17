import Link from "next/link";

export default function Home() {
  return (
    <main className="home">
      <p className="eyebrow">AME 101 · University lecture</p>
      <h1>Choose a lesson, then go live.</h1>
      <p className="lede">
        Same phone voting system for every lesson. Students scan the QR and stay locked to the room.
        Results stay sealed until you open them.
      </p>
      <div className="home-links" style={{ flexDirection: "column", gap: "0.8rem" }}>
        <Link href="/present?lesson=grading">Chapter 8 · Grading Game</Link>
        <Link href="/present?lesson=second-law">Chapter 7 · Second Law</Link>
      </div>
    </main>
  );
}
