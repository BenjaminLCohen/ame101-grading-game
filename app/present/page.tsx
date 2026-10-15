'use client';

import { useEffect, useState } from 'react';
import { createClient, GRADES } from '@/utils/supabase/client';
import slidesData from '@/data/slides.json';
import { QRCodeSVG } from 'qrcode.react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const SESSION = 'class';

export default function PresentPage() {
  const supabase = createClient();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [votes, setVotes] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [sessionId] = useState(SESSION);

  const slide = slidesData.slides[currentSlide];
  const studentUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/vote?session=${sessionId}` 
    : '';

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('sessions').select('*').eq('id', SESSION).single();
      if (data) {
        setCurrentSlide(data.current_slide || 0);
        setShowResults(data.show_results || false);
        setSelected(data.selected_volunteers || []);
      }
    };
    load();

    const channel = supabase.channel('present')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, (payload) => {
        const d = payload.new as any;
        if (d) {
          setCurrentSlide(d.current_slide);
          setShowResults(d.show_results);
          setSelected(d.selected_volunteers || []);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => {
        loadVotes();
      })
      .subscribe();

    loadVotes();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadVotes = async () => {
    const { data } = await supabase.from('votes')
      .select('*')
      .eq('session_id', SESSION)
      .eq('slide_id', slidesData.slides[currentSlide]?.id);
    setVotes(data || []);
  };

  useEffect(() => { loadVotes(); }, [currentSlide]);

  const updateSession = async (updates: any) => {
    await supabase.from('sessions').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', SESSION);
  };

  const next = () => updateSession({ current_slide: Math.min(currentSlide + 1, slidesData.slides.length - 1), show_results: false });
  const prev = () => updateSession({ current_slide: Math.max(currentSlide - 1, 0), show_results: false });

  const toggleResults = () => updateSession({ show_results: !showResults });

  const selectVolunteer = async () => {
    const volunteers = votes.filter(v => v.volunteer && !selected.includes(v.student_id));
    if (volunteers.length === 0) {
      alert('No more volunteers for this slide');
      return;
    }
    const pick = volunteers[Math.floor(Math.random() * volunteers.length)];
    const newSelected = [...selected, pick.student_id];
    await updateSession({ selected_volunteers: newSelected });
    alert(`Volunteer: ${pick.student_name || 'Anonymous'} (grade: ${pick.grade})`);
  };

  const histogram = GRADES.map(g => ({
    grade: g,
    count: votes.filter(v => v.grade === g).length
  }));

  const isPoll = slide?.isPoll;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui' }}>
      <div style={{ flex: 1, padding: 24, overflow: 'auto', background: '#fafafa' }}>
        <h2 style={{ marginTop: 0 }}>{slide?.title}</h2>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 15 }}>{slide?.content}</pre>
      </div>

      <div style={{ width: 420, padding: 24, borderLeft: '1px solid #ddd', background: '#fff' }}>
        <h3>Presenter Controls</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={prev} disabled={currentSlide === 0}>← Prev</button>
          <button onClick={next} disabled={currentSlide === slidesData.slides.length - 1}>Next →</button>
        </div>
        <p>Slide {currentSlide + 1} / {slidesData.slides.length}</p>

        {isPoll && (
          <>
            <button onClick={toggleResults} style={{ marginRight: 8 }}>
              {showResults ? 'Hide Results' : 'Show Results'}
            </button>
            <button onClick={selectVolunteer}>Select Volunteer</button>
            <p>Votes: {votes.length} | Volunteers: {votes.filter(v => v.volunteer).length}</p>
            {showResults && (
              <div style={{ height: 220, marginTop: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histogram}>
                    <XAxis dataKey="grade" />
                    <YAxis allowDecimals={false} />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: 32 }}>
          <p>Student QR Code</p>
          {studentUrl && <QRCodeSVG value={studentUrl} size={180} />}
          <p style={{ fontSize: 12, wordBreak: 'break-all' }}>{studentUrl}</p>
        </div>
      </div>
    </div>
  );
}