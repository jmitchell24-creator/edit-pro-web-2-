import { useEffect, useMemo, useRef, useState } from 'react';

function resolveApiBase() {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080/api';
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE;
  if (fromEnv) return fromEnv;
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  return isLocal ? 'http://localhost:8080/api' : `${location.origin}/api`;
}

export default function Home() {
  const API_BASE = useMemo(resolveApiBase, []);
  const [projects, setProjects] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function loadProjects() {
    try {
      const res = await fetch(`${API_BASE}/projects`);
      if (!res.ok) throw new Error('Failed to load projects');
      const data = await res.json();
      setProjects(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load projects');
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function onUpload() {
    const input = fileRef.current;
    if (!input || !input.files || input.files.length === 0) {
      setError('Please select a video file');
      return;
    }
    setError('');
    setUploading(true);
    setStatus('Uploading...');
    try {
      const form = new FormData();
      form.append('videos', input.files[0]);
      form.append('projectName', 'Next.js Upload');
      form.append('style', 'cinematic');
      form.append('intensity', 'medium');
      form.append('quality', '1080p');

      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: form
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const projectId = data.projectId;
      setStatus('Processing...');
      await poll(projectId);
      await loadProjects();
      setStatus('Complete');
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function poll(projectId: string) {
    // simple polling
    for (let i = 0; i < 120; i++) { // up to ~4 min if 2s interval
      const r = await fetch(`${API_BASE}/projects/${projectId}`);
      if (r.ok) {
        const p = await r.json();
        if (p.status === 'completed') return;
        if (p.status === 'error') throw new Error('Processing failed');
      }
      await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error('Timed out waiting for processing');
  }

  async function download(id: string, name: string) {
    try {
      const res = await fetch(`${API_BASE}/projects/${id}/download`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AI-Edited-${name || 'Video'}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || 'Download failed');
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Edit Quick - Next.js Demo</h1>
      <p>API: {API_BASE}</p>
      <div style={{ border: '1px dashed #999', padding: 20, borderRadius: 8, marginTop: 16 }}>
        <input type="file" accept="video/*" ref={fileRef} />
        <button onClick={onUpload} disabled={uploading} style={{ marginLeft: 8 }}>
          {uploading ? 'Working...' : 'Upload & Process'}
        </button>
        {status && <p style={{ marginTop: 8 }}>Status: {status}</p>}
        {error && <p style={{ color: 'crimson', marginTop: 8 }}>{error}</p>}
      </div>

      <h2 style={{ marginTop: 32 }}>Projects</h2>
      <div>
        {projects.length === 0 && <p>No projects yet.</p>}
        {projects.map(p => (
          <div key={p.id} style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{p.name}</strong>
              <span>{p.status}</span>
            </div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>Style: {p.style}, Progress: {p.progress || 0}%</div>
            {p.status === 'completed' && (
              <button onClick={() => download(p.id, p.name)} style={{ marginTop: 8 }}>Download</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


