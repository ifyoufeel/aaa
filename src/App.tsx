/**
 * M0 landing screen. Its only job is to prove the deploy pipeline end to end:
 * if this renders on the Vercel URL with the right commit, the pipeline works.
 * Replaced by the real Lobby screen in M5.
 */
export default function App() {
  return (
    <main className="boot">
      <p className="boot__kicker">Явь · Nav&rsquo; &amp; Yav&rsquo; · Навь</p>
      <h1 className="boot__title">Nav&rsquo; &amp; Yav&rsquo;</h1>
      <p className="boot__blurb">
        A two-player Slavic dark-fantasy tactical battler. Send a link, pick a castle, buy an
        army, fight it out on the hexes.
      </p>
      <p className="boot__stamp">
        build <code data-testid="build-commit">{__BUILD_COMMIT__}</code>
      </p>
    </main>
  )
}
