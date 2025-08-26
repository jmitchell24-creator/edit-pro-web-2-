import React, { useState } from 'react';

function resolveApiBase(): string {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080/api';
  const fromEnv = (process as any).env?.NEXT_PUBLIC_API_BASE;
  if (fromEnv) return fromEnv;
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  return isLocal ? 'http://localhost:8080/api' : `${location.origin}/api`;
}

export default function UploadForm() {
  const API_BASE = resolveApiBase();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [editedVideoUrl, setEditedVideoUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setVideoFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) return;

    setLoading(true);
    setEditedVideoUrl(null);

    try {
      // Step 1: Upload file to backend (expects field name 'videos')
      const formData = new FormData();
      formData.append('videos', videoFile);

      const uploadRes = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const t = await uploadRes.text();
        throw new Error(`Upload failed: ${uploadRes.status} ${t}`);
      }

      const uploadData = await uploadRes.json();
      const projectId: string | undefined = uploadData?.projectId;
      if (!projectId) throw new Error('Upload did not return a projectId');

      // Get project to find originalVideo filename
      const projRes = await fetch(`${API_BASE}/projects/${projectId}`);
      if (!projRes.ok) throw new Error(`Project fetch failed: ${projRes.status}`);
      const project = await projRes.json();
      const originalVideo: string | undefined = project?.originalVideo;
      if (!originalVideo) throw new Error('Project did not include originalVideo');

      // Build public URL served by /uploads
      const base = window.location.origin.replace(/\/$/, '');
      const videoUrl = `${base}/uploads/${encodeURIComponent(originalVideo)}`;

      // Step 2: Send video URL to AI editing API
      const editRes = await fetch(`${API_BASE}/edit-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl }),
      });

      if (!editRes.ok) {
        const t = await editRes.text();
        throw new Error(`Edit failed: ${editRes.status} ${t}`);
      }

      const editData = await editRes.json();
      if (editData?.success && editData?.videoLink) {
        setEditedVideoUrl(editData.videoLink);
      } else {
        throw new Error('Editing failed. Try again.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Error uploading or editing video.');
    }

    setLoading(false);
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-xl font-bold">Upload Video for AI Editing</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          {loading ? 'Processing...' : 'Upload & Edit'}
        </button>
      </form>

      {editedVideoUrl && (
        <div className="mt-6">
          <h3 className="font-semibold">Edited Video:</h3>
          <video
            controls
            className="mt-2 rounded-lg border"
            src={editedVideoUrl}
          />
          <a
            href={editedVideoUrl}
            download
            className="mt-2 inline-block text-blue-600 underline"
          >
            Download Edited Video
          </a>
        </div>
      )}
    </div>
  );
}


