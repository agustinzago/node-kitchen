// Before service: a card with the controls and the Kitchen rules, then the predict board.
// The Kitchen rules also stay painted on the wall for the whole Shift.
import './preservice.css';
import type { Level } from './sim/level.ts';

const KITCHEN_RULES = [
  'One Dish at a time, to the end.',
  'After every Dish, clear the orange then the purple Rail until both are empty.',
  'Then walk the Ring.',
];
const CONTROLS: [keys: string[], does: string][] = [
  [['↑', '↓', '←', '→'], 'move the Head Chef (or W A S D)'],
  [['Space', 'E', 'Enter'], 'use what you face: cook at the Stove, put a Ticket down or pick one up'],
  [['X'], 'turn X-ray off and on (real Node names)'],
];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...children: (Node | string)[]) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}
const rulesList = () => el('ol', { className: 'rules' }, ...KITCHEN_RULES.map((rule) => el('li', { textContent: rule })));

/** The program's Receipt lines in source order: the cards the player sorts. */
function receiptLines(level: Level): string[] {
  return [
    ...level.openingDish.flatMap((l) => ('prints' in l ? [{ at: l.sourceLine, line: l.prints }] : [])),
    ...Object.values(level.tickets).flatMap((t) => t.receiptLines.map((line) => ({ at: t.sourceLine, line }))),
  ]
    .sort((a, b) => a.at - b.at)
    .map(({ line }) => line);
}

/** Shows the card, then the predict board; resolves with the Prediction, or null when skipped. */
export function preService(level: Level): Promise<string[] | null> {
  document.body.append(el('section', { id: 'rules', className: 'panel', ariaLabel: 'Kitchen rules' }, el('h2', { textContent: 'Kitchen rules' }), rulesList()));

  // The kitchen gets no keys until service starts: they stop at the document, before the window's listeners.
  const holdKeys = (e: KeyboardEvent) => e.stopPropagation();
  document.addEventListener('keydown', holdKeys);

  const next = el('button', { textContent: 'Next: predict the Receipt' });
  const card = el(
    'section',
    { id: 'card', className: 'panel', ariaLabel: 'Before service' },
    el('h2', { textContent: 'Before service' }),
    el('h3', { textContent: 'Controls' }),
    el('dl', {}, ...CONTROLS.flatMap(([keys, does]) => [el('dt', {}, ...keys.map((k) => el('kbd', { textContent: k }))), el('dd', { textContent: does })])),
    el('h3', { textContent: 'Kitchen rules' }),
    rulesList(),
    next,
  );
  document.body.append(card);
  next.focus();

  return new Promise((resolve) => {
    next.onclick = () => {
      card.remove();
      const board = predictBoard(receiptLines(level), (prediction) => {
        board.remove();
        document.removeEventListener('keydown', holdKeys);
        resolve(prediction);
      });
      document.body.append(board);
      (board.querySelector('li') as HTMLElement).focus();
    };
  });
}

function predictBoard(lines: string[], done: (prediction: string[] | null) => void) {
  const cards = el('ol', { id: 'predict-cards', ariaLabel: 'Your Prediction, first line at the top' }, ...lines.map((line) => el('li', { textContent: line, tabIndex: 0, draggable: true })));

  // Keyboard: ↑/↓ moves between cards, Shift+↑/↓ moves the card.
  cards.addEventListener('keydown', (e) => {
    const card = e.target as HTMLElement;
    const up = e.key === 'ArrowUp';
    if (!up && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const sibling = (up ? card.previousElementSibling : card.nextElementSibling) as HTMLElement | null;
    if (!sibling) return;
    if (!e.shiftKey) return sibling.focus();
    if (up) sibling.before(card);
    else sibling.after(card);
    card.focus();
  });

  // Mouse: native drag-and-drop; the dragged card slides past whichever card it's over.
  let dragged: HTMLElement | null = null;
  cards.addEventListener('dragstart', (e) => {
    dragged = e.target as HTMLElement;
    e.dataTransfer!.setData('text/plain', dragged.textContent!); // Firefox won't drag without data
    dragged.classList.add('dragging');
  });
  cards.addEventListener('dragend', () => dragged?.classList.remove('dragging'));
  cards.addEventListener('dragover', (e) => {
    e.preventDefault();
    const over = (e.target as Element).closest('li');
    if (!dragged || !over || over === dragged) return;
    const order = [...cards.children];
    if (order.indexOf(over) > order.indexOf(dragged)) over.after(dragged);
    else over.before(dragged);
  });
  cards.addEventListener('drop', (e) => e.preventDefault());

  return el(
    'section',
    { id: 'predict', className: 'panel', ariaLabel: 'Predict board' },
    el('h2', { textContent: 'Predict the Receipt' }),
    el('p', {}, 'Put the lines in the order the program prints them. Drag a card, or use ', el('kbd', { textContent: '↑' }), el('kbd', { textContent: '↓' }), ' to pick a card and ', el('kbd', { textContent: 'Shift' }), '+', el('kbd', { textContent: '↑' }), el('kbd', { textContent: '↓' }), ' to move it.'),
    cards,
    el('p', {}, 'Your Prediction locks when service starts.'),
    el(
      'div',
      { className: 'buttons' },
      el('button', { id: 'lock-in', textContent: 'Lock in and start service', onclick: () => done([...cards.children].map((li) => li.textContent!)) }),
      el('button', { id: 'skip-predict', textContent: 'Skip', onclick: () => done(null) }),
    ),
  );
}
