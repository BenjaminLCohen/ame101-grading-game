"use client";

import { useEffect, useRef, useState } from "react";
import { createClient, GRADES } from "@/utils/supabase/client";
import { DeckSlide, slides } from "@/components/DeckSlide";
import { Bar, BarChart, ResponsiveContainer, XAxis } from "recharts";

export default function VotePage() {
  const [supabase] = useState(() => createClient());
  const [sessionId, setSessionId] = useState("class");
  const [studentId, setStudentId] = useState("");
  const [index, setIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [called, setCalled] = useState(false);
  const [grade, setGrade] = useState("");
  const [volunteer, setVolunteer] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState<{ grade: string; count: number }[]>([]);
  const dirty = useRef(false);

  const slide = slides[index] ?? slides[0];

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("session");
    if (q && /^[a-zA-Z0-9_-]{1,40}$/.test(q)) setSessionId(q);
    let id = localStorage.getItem("ame101-student-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("ame101-student-id", id);
    }
    setStudentId(id);
  }, []);

  useEffect(() => {
    if (!studentId) return;
    let stop = false;
    const load = async () => {
      const { data, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();
      if (sessionError) {
        if (!stop) setError("Waiting for the class database. Ask the instructor if this stays blank.");
        return;
      }
      if (!data || stop) return;
      const nextIndex = Math.max(0, Math.min(slides.length - 1, data.current_slide || 0));
      const nextSlide = slides[nextIndex];
      setIndex((prev) => {
        if (prev !== nextIndex) dirty.current = false;
        return nextIndex;
      });
      setShowResults(Boolean(data.show_results));
      const map = data.selected_volunteers && typeof data.selected_volunteers === "object"
        ? (data.selected_volunteers as Record<string, string[]>)
        : {};
      const list = Array.isArray(map[String(nextSlide.id)]) ? map[String(nextSlide.id)] : [];
      setCalled(list.includes(studentId));
      const { data: mine } = await supabase
        .from("votes")
        .select("grade, volunteer, student_name")
        .eq("session_id", sessionId)
        .eq("slide_id", nextSlide.id)
        .eq("student_id", studentId)
        .maybeSingle();
      if (!stop && !dirty.current) {
        setGrade(mine?.grade ?? "");
        setVolunteer(Boolean(mine?.volunteer));
        setName(mine?.student_name ?? "");
        setSaved(Boolean(mine));
      }
      if (data.show_results) {
        const { data: all } = await supabase
          .from("votes")
          .select("grade")
          .eq("session_id", sessionId)
          .eq("slide_id", nextSlide.id);
        if (!stop) {
          setCounts(GRADES.map((g) => ({ grade: g, count: (all || []).filter((row) => row.grade === g).length })));
        }
      }
      if (!stop) setError("");
    };
    void load();
    const channel = supabase
      .channel(`vote-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => void load())
      .subscribe();
    const timer = window.setInterval(() => void load(), 1500);
    return () => {
      stop = true;
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [sessionId, studentId, supabase]);

  async function submit() {
    if (!grade) {
      setError("Choose a grade first.");
      return;
    }
    if (!slide.isPoll) return;
    const { error: voteError } = await supabase.from("votes").upsert(
      {
        session_id: sessionId,
        slide_id: slide.id,
        student_id: studentId,
        grade,
        volunteer,
        student_name: name.trim() || null,
      },
      { onConflict: "session_id,slide_id,student_id" },
    );
    if (voteError) {
      setError(voteError.message);
      return;
    }
    dirty.current = false;
    setSaved(true);
    setError("");
  }

  return (
    <main className="vote">
      <DeckSlide slide={slide} index={index} />
      {called ? <p className="called">You were called. Come explain your grade.</p> : null}
      {slide.isPoll ? (
        <section>
          <h2>Your grade</h2>
          <div className="grades">
            {GRADES.map((option) => (
              <button
                key={option}
                className={grade === option ? "grade on" : "grade"}
                onClick={() => {
                  dirty.current = true;
                  setGrade(option);
                  setSaved(false);
                }}
              >
                {option}
              </button>
            ))}
          </div>
          <label className="volunteer">
            <input
              type="checkbox"
              checked={volunteer}
              onChange={(event) => {
                dirty.current = true;
                setVolunteer(event.target.checked);
                setSaved(false);
              }}
            />
            I feel comfortable coming up to explain my grade
          </label>
          <label className="name">
            Name, optional
            <input
              type="text"
              value={name}
              maxLength={40}
              placeholder="Only used if you volunteer"
              onChange={(event) => {
                dirty.current = true;
                setName(event.target.value);
                setSaved(false);
              }}
            />
          </label>
          <button className="btn primary submit" onClick={() => void submit()}>
            {saved ? "Update vote" : "Submit vote"}
          </button>
          {saved && !showResults ? <p className="muted">Recorded. Results stay hidden until the instructor opens them.</p> : null}
          {showResults ? (
            <div className="histogram">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={counts}>
                  <XAxis dataKey="grade" tick={{ fontSize: 12 }} tickLine={false} />
                  <Bar dataKey="count" fill="#8f1d1d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </section>
      ) : (
        <p className="muted">Follow the projector. Grading buttons appear on example slides.</p>
      )}
      {error ? <p className="err">{error}</p> : null}
    </main>
  );
}
