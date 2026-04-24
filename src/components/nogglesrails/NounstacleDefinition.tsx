export function NounstacleDefinition() {
  return (
    <section className="border-t py-12">
      <article className="rounded-lg border bg-card p-6 text-card-foreground">
        <div className="space-y-4 text-foreground">
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-3xl font-semibold tracking-tight md:text-4xl">Nounstacle</h3>
              <p className="mt-1 text-lg italic text-muted-foreground md:text-xl">’naun.sta.kal</p>
            </div>
            <p className="text-lg font-medium text-muted-foreground md:text-2xl">(noun)</p>
          </div>

          <div className="space-y-4 text-sm leading-7 text-muted-foreground md:text-base">
            <p>
              <span className="font-semibold text-foreground">Definition:</span> A skateboarding
              obstacle, such as a rail or ramp, shaped like noggles, the iconic glasses symbol of
              Nouns DAO.
            </p>

            <p>
              <span className="font-semibold text-foreground">Origin:</span> Pioneered by Gnars DAO
              in 2023, there are now over a dozen nounstacles around the world.
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}
