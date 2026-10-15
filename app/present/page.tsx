"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Bar, BarChart, ResponsiveContainer, XAxis } from "recharts";
import { createClient, GRADES } from "@/utils/supabase/client";
import { DeckSlide, slides } from "@/components/DeckSlide";

const SESSION_DEFAULT = "class";

type Vote = {
  student_id: string;
  grade: string;
  volunteer: boolean;
  student_name: string | null;
};

function calledMap(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string[]> = {};
  for (const [key, list] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(list)) out[key] = list.filter((item): item is string => typeof item === "string");
  }
  return out;
}

export default function PresentPage() {
  const [supabase] = useState(() => createClient());
  const [sessionId, setSessionId] = useState(SESSION_DEFAULT);
  const [index, setIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [called, setCalled] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState("");

  const slide = slides[index] ?? slides[0];

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("session");
    if (q && /^[a-zA-Z0-9_-]{1,40}$/.test(q)) setSessionId(q);
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      const { data, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();
      if (sessionError) {
        if (!stop) setError("Class database is not ready yet. Run supabase/schema.sql in the Supabase SQL editor.");
        return;
      }
      if (!data) {
        await supabase.from("sessions").insert({ id: sessionId });
      } else if (!stop) {
        const nextIndex = Math.max(0, Math.min(slides.length - 1, data.current_slide || 0));
        setIndex(nextIndex);
        setShowResults(Boolean(data.show_results));
        setCalled(calledMap(data.selected_volunteers)[String(slides[nextIndex].id)] ?? []);
      }
      const slideId = slides[Math.max(0, Math.min(slides.length - 1, data?.current_slide || 0))].id;
      const { data: voteRows } = await supabase
        .from("votes")
        .select("student_id, grade, volunteer, student_name")
        .eq("session_id", sessionId)
        .eq("slide_id", slideId);
      if (!stop) {
        setVotes((voteRows as Vote[]) || []);
        setError("");
      }
    };
    void load();
    const channel = supabase
      .channel(`present-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => void load())
      .subscribe();
    const timer = window.setInterval(() => void load(), 1500);
    return () => {
      stop = true;
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.repeat) return;
      if (event.key === "ArrowRight") void go(index + 1);
      if (event.key === "ArrowLeft") void go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function go(next: number) {
    const clamped = Math.max(0, Math.min(slides.length - 1, next));
    setPicked(null);
    setIndex(clamped);
    setShowResults(false);
    const { error: updateError } = await supabase
      .from("sessions")
      .update({ current_slide: clamped, show_results: false, updated_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (updateError) setError(updateError.message);
  }

  async function reveal() {
    if (!slide.isPoll) return;
    const next = !showResults;
    setShowResults(next);
    await supabase.from("sessions").update({ show_results: next, updated_at: new Date().toISOString() }).eq("id", sessionId);
  }

  async function selectVolunteer() {
    const already = new Set(called);
    const pool = votes.filter((vote) => vote.volunteer && !already.has(vote.student_id));
    if (pool.length === 0) {
      setPicked(null);
      setError("No volunteers left on this example.");
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const nextCalled = [...called, pick.student_id];
    const { data } = await supabase.from("sessions").select("selected_volunteers").eq("id", sessionId).single();
    const map = calledMap(data?.selected_volunteers);
    map[String(slide.id)] = nextCalled;
    await supabase
      .from("sessions")
      .update({ selected_volunteers: map, updated_at: new Date().toISOString() })
      .eq("id", sessionId);
    setCalled(nextCalled);
    setPicked(pick.student_name || "Anonymous");
    setError("");
  }

  const volunteers = votes.filter((vote) => vote.volunteer);
  const voteUrl = origin ? `${origin}/vote?session=${encodeURIComponent(sessionId)}` : "";
  const histogram = GRADES.map((grade) => ({
    grade,
    count: votes.filter((vote) => vote.grade === grade).length,
  }));

  return (
    <div className="presenter">
      <section className="presenter-slide">
        <DeckSlide slide={slide} index={index} />
      </section>
      <aside className="rail">
        <p className="eyebrow">Presenter</p>
        <h2>AME 101</h2>
        <div className="nav">
          <button className="btn" onClick={() => void go(index - 1)} disabled={index === 0}>Prev</button>
          <span className="count">{index + 1} / {slides.length}</span>
          <button className="btn" onClick={() => void go(index + 1)} disabled={index === slides.length - 1}>Next</button>
        </div>
        {slide.isPoll ? (
          <>
            <div className="stats">
              <span>{votes.length === 1 ? "1 vote" : `${votes.length} votes`}</span>
              <span>{volunteers.length === 1 ? "1 volunteer" : `${volunteers.length} volunteers`}</span>
              <span className={showResults ? "seal open" : "seal"}>{showResults ? "Open" : "Sealed"}</span>
            </div>
            <button className="btn primary" onClick={() => void reveal()}>
              {showResults ? "Hide results" : "Show results"}
            </button>
            <button className="btn" onClick={() => void selectVolunteer()} disabled={volunteers.filter((v) => !called.includes(v.student_id)).length === 0}>
              Select volunteer
            </button>
            {picked ? <p className="called">{picked} is up.</p> : null}
            {called.length > 0 ? (
              <ol className="called-list">
                {called.map((id, n) => {
                  const vote = votes.find((row) => row.student_id === id);
                  return (
                    <li key={id}>
                      <span>{n + 1}</span>
                      {vote?.student_name || "Anonymous"}
                      {showResults ? <em style={{ marginLeft: "auto" }}>{vote?.grade}</em> : null}
                    </li>
                  );
                })}
              </ol>
            ) : null}
            {showResults ? (
              <div className="histogram">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histogram}>
                    <XAxis dataKey="grade" tick={{ fontSize: 12 }} tickLine={false} />
                    <Bar dataKey="count" fill="#8f1d1d" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="muted">Histogram stays hidden until you show results.</p>
            )}
          </>
        ) : (
          <p className="muted">Lecture slide. Polling opens on the grading examples.</p>
        )}
        {error ? <p className="err">{error}</p> : null}
        <div className="qr">
          <p style={{ color: "inherit", fontWeight: 600 }}>Students join here</p>
          {voteUrl ? <QRCodeSVG value={voteUrl} size={160} bgColor="#fffdf8" fgColor="#1a1714" /> : null}
          <p>{voteUrl}</p>
        </div>
      </aside>
    </div>
  );
}
