// Helpers for the "throw the garment into the bag" interaction.

export function bagRect() {
  const bag = document.querySelector('[data-bag-drop]');
  return bag ? bag.getBoundingClientRect() : null;
}

export function pointOverBag(x, y) {
  const rect = bagRect();
  if (!rect) return false;
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function markBag(active) {
  const bag = document.querySelector('[data-bag-drop]');
  if (bag) bag.classList.toggle('bag-drop-active', Boolean(active));
}

// Animates a copy of the garment from its on-screen position into the bag.
// Resolves when the copy has landed so the caller can update the cart.
export function tossToBag({ image, rect, duration = 720 }) {
  return new Promise((resolve) => {
    const target = bagRect();
    if (!image || !rect || !target || typeof document === 'undefined') {
      resolve();
      return;
    }

    const ghost = document.createElement('img');
    ghost.src = image;
    ghost.alt = '';
    ghost.className = 'toss-ghost';
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    document.body.appendChild(ghost);

    const deltaX = target.left + target.width / 2 - (rect.left + rect.width / 2);
    const deltaY = target.top + target.height / 2 - (rect.top + rect.height / 2);

    const animation = ghost.animate(
      [
        { transform: 'translate3d(0,0,0) scale(1) rotate(0deg)', opacity: 1, offset: 0 },
        {
          transform: `translate3d(${deltaX * 0.55}px, ${deltaY * 0.35 - 70}px, 0) scale(0.62) rotate(12deg)`,
          opacity: 0.95,
          offset: 0.55,
        },
        {
          transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.08) rotate(28deg)`,
          opacity: 0.15,
          offset: 1,
        },
      ],
      { duration, easing: 'cubic-bezier(0.4, 0.05, 0.5, 1)', fill: 'forwards' }
    );

    const finish = () => {
      ghost.remove();
      resolve();
    };
    animation.addEventListener('finish', finish);
    animation.addEventListener('cancel', finish);
    window.setTimeout(finish, duration + 120);
  });
}
