document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'eventosInscritos';
  const load = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const save = (list) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

  const inscritos = new Set(load());

  document.querySelectorAll('.evento-card').forEach(card => {
    const id = card.getAttribute('data-evento-id');
    const btn = card.querySelector('.btn-inscrever');
    if (!btn) return;

    const refresh = () => {
      if (inscritos.has(id)) {
        btn.textContent = 'Inscrito';
        btn.classList.add('inscrito');
      } else {
        btn.textContent = 'Inscrever-se';
        btn.classList.remove('inscrito');
      }
    };

    refresh();

    btn.addEventListener('click', () => {
      if (inscritos.has(id)) {
        inscritos.delete(id);
      } else {
        inscritos.add(id);
      }
      save(Array.from(inscritos));
      refresh();
    });
  });
});


