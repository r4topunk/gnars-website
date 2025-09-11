import MiniSearch from 'minisearch';

type Doc = { id: string; title: string; text: string };
let index: MiniSearch<Doc> | null = null;

self.onmessage = (e: MessageEvent) => {
  const { type, docs, query } = e.data as
    | { type: 'init'; docs: Doc[] }
    | { type: 'search'; query: string };

  if (type === 'init') {
    index = new MiniSearch<Doc>({
      fields: ['title', 'text'],
      storeFields: ['id'],
      searchOptions: { boost: { title: 2 }, prefix: true, fuzzy: 0.2 },
    });
    index.addAll(docs);
    (self as unknown as Worker).postMessage({ type: 'ready' });
  } else if (type === 'search' && index) {
    const ids = index.search(query).slice(0, 100).map(r => r.id as string);
    (self as unknown as Worker).postMessage({ type: 'results', ids });
  }
};
