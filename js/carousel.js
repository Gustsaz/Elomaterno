const items = Array.from(document.querySelectorAll('.carousel-item'));

function setActive() {
  items.forEach(it => it.classList.remove('active'));
  const middle = items.find(it => it.classList.contains('pos-center'));
  if (middle) middle.classList.add('active');
}

// rotação: esquerda -> direita -> meio -> esquerda -> ...
function rotate() {
  items.forEach(it => {
    if (it.classList.contains('pos-left')) {
      it.classList.replace('pos-left', 'pos-right');   // L -> R
    } else if (it.classList.contains('pos-right')) {
      it.classList.replace('pos-right', 'pos-center'); // R -> C
    } else if (it.classList.contains('pos-center')) {
      it.classList.replace('pos-center', 'pos-left');  // C -> L
    }
  });
  setActive();
}

// garante estado inicial correto
setActive();

// velocidade de troca
setInterval(rotate, 3000);
