import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ padding: 40, fontFamily: 'system-ui', maxWidth: 600 }}>
      <h1>AME 101 Grading Game</h1>
      <p>Interactive presentation with live class polling.</p>
      <ul>
        <li><Link href="/present">Presenter View</Link> (computer / projector)</li>
        <li><Link href="/vote">Student View</Link> (or scan QR from presenter)</li>
      </ul>
      <p>See README for Supabase setup.</p>
    </main>
  );
}