import MiniSearch from 'minisearch';

type Doc = { id: string; title: string; text: string };
let index: MiniSearch<Doc> | null = null;

self.onmessage = (e: MessageEvent) => {
  const data = e.data as { type: string; docs?: Doc[]; query?: string };
  const { type } = data;

  if (type === 'init') {
    const { docs } = data;
    index = new MiniSearch<Doc>({
      fields: ['title', 'text'],
      storeFields: ['id'],
      searchOptions: { boost: { title: 2 }, prefix: true, fuzzy: 0.2 },
    });
    if (docs) {
      index.addAll(docs);
    } else {
      console.error("'docs' is missing in the 'init' message.");
      return; // Or throw an error
    }
    (self as unknown as Worker).postMessage({ type: 'ready' });
  } else if (type === 'search' && index) {
    const { query } = data;
    if (query) {
      const ids = index.search(query).slice(0, 100).map(r => r.id as string);
      (self as unknown as Worker).postMessage({ type: 'results', ids });
    } else {
      console.error("'query' is missing in the 'search' message.");
      return; // Or throw an error
    }
  }
};
