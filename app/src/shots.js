// Fixed scenes for screenshots: ?shot=cover shows the exported cover alone,
// ?shot=cover-portrait the portrait cover, ?shot=editor the editor with the
// samples loaded, ?shot=editor-grid the editor on the six-grid layout with a
// different grade. window.__shotReady is set once the scene is painted.
export async function runShot(shot, query, api) {
  const layout = query.get('layout');
  const grade = query.get('grade');
  const title = query.get('title');
  if (layout) api.setLayout(layout);
  if (grade) api.setGrade(grade);
  if (title) api.setTitle(title);

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    api.canvas.width = 1920;
    api.canvas.height = 1080;
    if (!layout) api.setLayout('hero-mosaic');
    if (!grade) api.setGrade('sunset');
  } else if (shot === 'cover-portrait') {
    document.body.classList.add('shot-cover');
    api.canvas.width = 1080;
    api.canvas.height = 1350;
    if (!layout) api.setLayout('hero-three');
    if (!grade) api.setGrade('golden');
  } else if (shot === 'editor-grid') {
    if (!layout) api.setLayout('six-grid');
    if (!grade) api.setGrade('neon');
  } else {
    // editor (default shot)
    if (!layout) api.setLayout('hero-mosaic');
    if (!grade) api.setGrade('sunset');
  }

  await api.loadSamples();
  api.syncAndRender();
  requestAnimationFrame(() => requestAnimationFrame(() => api.ready()));
}
