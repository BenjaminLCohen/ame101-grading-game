'use client';

import { useEffect, useState } from 'react';
import { supabase, GRADES } from '@/lib/supabase';
import slidesData from '@/data/slides.json';
import { useSearchParams } from 'next/navigation';

const SESSION = 'class';

export default function VotePage() {
  const params = useSearchParams();
  const session = params.get('session') || SESSION;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [grade, setGrade] = useState('');
  const [volunteer, setVolunteer] = useState(false);
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const slide = slidesData.slides[currentSlide];

  useEffect(() => {
    let id = localStorage.getItem('studentId');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('studentId', id);
    }
    setStudentId(id);

    const load = async () => {
      const { data } = await supabase.from('sessions').select('*').eq('id', session).single();
      if (data) {
        setCurrentSlide(data.current_slide || 0);
        setShowResults(data.show_results || false);
      }
      // Check existing vote
      const { data: v } = await supabase.from('votes')
        .select('*')
        .eq('session_id', session)
        .eq('slide_id', slidesData.slides[data?.current_slide || 0]?.id)
        .eq('student_id', id)
        .maybeSingle();
      if (v) {
        setGrade(v.grade);
        setVolunteer(v.volunteer);
        setName(v.student_name || '');
        setSubmitted(true);
      }
    };
    load();

    const channel = supabase.channel('vote')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, (payload) => {
        const d = payload.new as any;
        if (d) {
          setCurrentSlide(d.current_slide);
          setShowResults(d.show_results);
          setSubmitted(false); // reset on slide change
          setGrade('');
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  const submit = async () => {
    if (!grade) return alert('Select a grade');
    const { error } = await supabase.from('votes').upsert({
      session_id: session,
      slide_id: slidesData.slides[currentSlide].id,
      student_id: studentId,
      grade,
      volunteer,
      student_name: name || null
    }, { onConflict: 'session_id,slide_id,student_id' });
    if (error) alert(error.message);
    else setSubmitted(true);
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16, fontFamily: 'system-ui' }}>
      <h2>{slide?.title}</h2>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: 14, background: '#f5f5f5', padding: 12, borderRadius: 8 }}>
        {slide?.content}
      </pre>

      {slide?.isPoll && (
        <div style={{ marginTop: 24 }}>
          <h3>Your Grade</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {GRADES.map(g => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                style={{
                  padding: '8px 14px',
                  background: grade === g ? '#3b82f6' : '#e5e7eb',
                  color: grade === g ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: 6
                }}
              >{g}</button>
            ))}
          </div>
          <label style={{ display: 'block', marginTop: 16 }}>
            <input type="checkbox" checked={volunteer} onChange={e => setVolunteer(e.target.checked)} />
            {' '}I feel comfortable coming up to explain my grade
          </label>
          <input
            placeholder="Optional name (for volunteer)"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: '100%', marginTop: 8, padding: 8 }}
          />
          <button onClick={submit} style={{ marginTop: 16, padding: '10px 20px' }}>
            {submitted ? 'Update Vote' : 'Submit Vote'}
          </button>
          {submitted && <p style={{ color: 'green' }}>Vote recorded! Waiting for instructor to show results.</p>}
          {showResults && <p style={{ color: '#666' }}>Results are now visible on the projector.</p>}
        </div>
      )}
    </div>
  );
}