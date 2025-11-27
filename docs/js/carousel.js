const items = Array.from(document.querySelectorAll('.carousel-item'));

function setActive() {
  items.forEach(it => it.classList.remove('active'));
  const middle = items.find(it => it.classList.contains('pos-center'));
  if (middle) middle.classList.add('active');
}

function rotate() {
  items.forEach(it => {
    if (it.classList.contains('pos-left')) {
      it.classList.replace('pos-left', 'pos-right');   
    } else if (it.classList.contains('pos-right')) {
      it.classList.replace('pos-right', 'pos-center'); 
    } else if (it.classList.contains('pos-center')) {
      it.classList.replace('pos-center', 'pos-left'); 
    }
  });
  setActive();
}

setActive();

setInterval(rotate, 3000);