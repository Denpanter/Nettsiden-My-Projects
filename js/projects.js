const cards = document.querySelectorAll('[data-project]');
cards.forEach((card) => {
  card.addEventListener('click', () => {
    const dialog = document.getElementById('dialog-' + card.dataset.project);
    dialog.showModal();
    document.body.classList.add('dialog-open');
    dialog.scrollTop = 0;
    dialog.addEventListener('close', () => {
      document.body.classList.remove('dialog-open');
      card.focus();
    }, { once: true });
  });
});
document.querySelectorAll('.project-dialog').forEach((dialog) => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
});
