import Link from "next/link";

export default function Home() {
  return (
    <main className="home">
      <p className="eyebrow">AME 101 · University lecture</p>
      <h1>Chapter 8, then grade the reports live.</h1>
      <p className="lede">
        Project the deck. Students scan in, assign a grade on each example, and stay on the same
        slide as the room. Results stay sealed until you open them.
      </p>
      <div className="home-links">
        <Link href="/present">Presenter</Link>
        <Link href="/vote">Student</Link>
      </div>
    </main>
  );
}
