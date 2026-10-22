// The results screen, shown once the restaurant closes: the Receipt judged against real Node.
import './results.css';
import { openReplay } from './replay.ts';
import { judge, receipt, type Shift } from './sim/shift.ts';

const RULES = {
  2: 'Rule 2 broken: after every Dish, clear the orange then the purple Rail.',
  3: 'Rule 3 broken: then walk the Ring in order.',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...children: (Node | string)[]) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

export function showResults(shift: Shift) {
  if (document.getElementById('results')) return;
  const { stars, routingMistakes, brokenRules, nodeReceipt } = judge(shift);
  const mine = receipt(shift);

  const rows = Array.from({ length: Math.max(mine.length, nodeReceipt.length) }, (_, i) =>
    el(
      'tr',
      { className: mine[i] === nodeReceipt[i] ? '' : 'differs' },
      el('td', { textContent: mine[i] ?? '' }),
      el('td', { textContent: nodeReceipt[i] ?? '' }),
    ),
  );
  // A reload starts a fresh Shift, with a new seed unless the URL fixed one.
  const retry = el('button', { id: 'retry', textContent: 'Retry', onclick: () => location.reload() });
  // Let Enter and Space press the button instead of reaching the kitchen's "use" key.
  retry.addEventListener('keydown', (e) => e.stopPropagation());

  document.body.append(
    el(
      'section',
      { id: 'results', className: 'panel', ariaLabel: 'Results' },
      el('h2', { textContent: 'Results' }),
      el('p', { id: 'stars', textContent: stars ? '★ Star 1: your Receipt matches real Node' : '☆ No star: your Receipt differs from real Node' }),
      el(
        'table',
        {},
        el('thead', {}, el('tr', {}, el('th', { textContent: 'Your Receipt' }), el('th', { textContent: 'Real Node' }))),
        el('tbody', { id: 'compare' }, ...rows),
      ),
      el(
        'ul',
        { id: 'broken-rules' },
        ...(brokenRules.length
          ? brokenRules.map((r) => el('li', { textContent: RULES[r] }))
          : [el('li', { textContent: 'No Kitchen rules broken.' })]),
      ),
      el('p', {}, 'Routing mistakes: ', el('b', { id: 'result-mistakes', textContent: String(routingMistakes) })),
      el('button', { id: 'open-replay', textContent: 'Replay', onclick: () => openReplay(shift), onkeydown: (e) => e.stopPropagation() }),
      ' ',
      retry,
    ),
  );
  retry.focus();
}
