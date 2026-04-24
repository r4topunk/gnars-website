export function NounstacleDefinition() {
  return (
    <div className="mt-8 flex justify-center">
      <div className="w-full max-w-4xl rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/20 px-6 py-8 shadow-sm md:px-10 md:py-10">
        <div className="space-y-6 text-foreground">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-5xl font-semibold tracking-tight md:text-7xl">Nounstacle</h3>
              <p className="mt-2 text-2xl italic text-muted-foreground md:text-3xl">’naun.sta.kal</p>
            </div>
            <p className="text-2xl font-medium text-muted-foreground md:text-4xl">(noun)</p>
          </div>

          <div className="space-y-5 text-lg leading-8 md:text-2xl md:leading-10">
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
      </div>
    </div>
  );
}
