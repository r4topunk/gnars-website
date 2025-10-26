 /**
 * Mural page
 * The interactive mural is now displayed as a background across all pages.
 * This page provides information about the mural feature.
 */
export default function MuralPage() {
  return (
    <main className="relative z-10 min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl bg-white/90 backdrop-blur-sm p-8 shadow-xl">
          <h1 className="text-4xl font-bold mb-4">Mural de Gnars</h1>
          <p className="text-lg text-muted-foreground mb-6">
            O mural interativo agora está disponível como plano de fundo em todas as páginas do site!
          </p>
          <div className="space-y-4 text-muted-foreground">
            <p>
              <strong>Arraste</strong> para mover e explorar a galeria de NFTs
            </p>
          </div>
          <div className="mt-8 pt-8 border-t">
            <p className="text-sm text-muted-foreground">
              O mural exibe uma grade de 50x50 tiles com NFTs reais da coleção Gnars,
              criando uma experiência imersiva em todo o site.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
