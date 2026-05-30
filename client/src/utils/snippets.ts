// 10 multi-line paragraphs (~45–55 words each, wraps to a few lines). We cycle
// through them so every refresh / replay gives a fresh one and loops back after
// the tenth.
export const SNIPPETS: string[] = [
  'The quick brown fox jumps over the lazy dog while the autumn sun dips behind the distant hills. A cool breeze drifts across the quiet valley, carrying the scent of pine and wet earth, and somewhere far away a church bell rings out the hour.',
  'Learning to type without looking down takes patience and steady practice, but every focused session quietly builds the muscle memory your fingers need. Trust your hands, keep your eyes forward, and the keys will slowly become a map you no longer have to read.',
  'Good code is written for people to read and only incidentally for machines to run. Keep your functions small, your names honest, and your intentions obvious, because the person who maintains it tomorrow might very well be a tired version of you.',
  'She packed her bags the night before the long trip, checking twice that the tickets, the passport, and the small blue notebook were tucked safely inside. By morning the house was silent, the kettle was cold, and the road outside was already waiting for her.',
  'Focus on the screen and let your hands do the work they have practiced. The moment your eyes drift toward the keyboard your rhythm stumbles, your speed drops, and the quiet confidence you spent so long building begins to slip through your fingers.',
  'The ocean never asks for permission. It rises and falls with the moon, swallows old footprints from the sand, and returns each morning as if the day before had never happened at all. There is a strange comfort in something so vast and so patient.',
  'Every great project begins as a small and slightly ridiculous idea that refuses to leave you alone. You sketch it on a napkin, argue with yourself about it in the shower, and one ordinary evening you finally sit down and decide to actually build the thing.',
  'Reading widely is like keeping company with the most interesting people who ever lived. A single quiet afternoon can carry you across centuries and oceans, into other minds and other lives, and you return to your own world a little larger than you left it.',
  'Discipline is mostly choosing what you want most over what you want right now. It rarely feels heroic in the moment; it looks like a closed tab, an early alarm, and one more honest attempt on a night when quitting would have been so much easier.',
  'The city wakes slowly on a rainy morning, with umbrellas blooming like dark flowers along the crowded street. Buses hiss at the curb, coffee steams behind fogged glass, and a thousand strangers move past one another, each carrying a world no one else can see.',
]

const INDEX_KEY = 'gazetype-snippet-index'

// Returns the next snippet in the loop. The chosen index is persisted in
// localStorage, so each page refresh advances to a new paragraph (and wraps
// around after the last one). The very first run starts at a random paragraph.
export function getNextSnippet(): string {
  let index: number
  try {
    const stored = localStorage.getItem(INDEX_KEY)
    if (stored === null) {
      index = Math.floor(Math.random() * SNIPPETS.length) // random starting point
    } else {
      const prev = parseInt(stored, 10)
      index = Number.isNaN(prev) ? 0 : (prev + 1) % SNIPPETS.length // advance + loop
    }
    localStorage.setItem(INDEX_KEY, String(index))
  } catch {
    index = Math.floor(Math.random() * SNIPPETS.length) // localStorage blocked
  }
  return SNIPPETS[index]
}
