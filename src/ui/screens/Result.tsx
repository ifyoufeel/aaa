import { getFaction } from '../../content/factions'
import { isAlive, unitOf, type BattleState, type Side } from '../../rules'
import { Plaque } from '../Plaque'

/** Who held the field, and what was left of them. */
export function Result({ battle, side }: { battle: BattleState; side: Side }) {
  const winner = battle.outcome?.winner
  const drew = winner === 'draw'
  const won = winner === side

  const survivors = battle.stacks.filter((s) => s.side === winner && isAlive(s))
  const faction = survivors[0] ? getFaction(survivors[0].factionId) : null

  return (
    <main className="screen screen--centred result">
      <p className="kicker">{drew ? 'Ничья' : won ? 'Победа' : 'Поражение'}</p>
      <h1 className="display title">
        {drew ? 'Nobody holds the field' : won ? 'You hold the field' : 'The field is lost'}
      </h1>
      <p className="lede">
        {drew
          ? 'Both hosts were spent before either could finish it.'
          : `${battle.round} ${battle.round === 1 ? 'round' : 'rounds'}, and ${
              survivors.length === 0 ? 'nothing' : `${survivors.length} ${survivors.length === 1 ? 'stack' : 'stacks'}`
            } still standing.`}
      </p>

      {faction && survivors.length > 0 && (
        <section className="result__survivors">
          {survivors.map((stack) => (
            <div key={stack.id} className="result__survivor">
              <Plaque
                factionId={stack.factionId}
                unitId={stack.unitId}
                ink={faction.accent}
                width={56}
                height={66}
                label={unitOf(stack).name}
              />
              <p className="result__name">{unitOf(stack).name}</p>
              <p className="tnum result__count">&times;{stack.count}</p>
            </div>
          ))}
        </section>
      )}

      <button type="button" className="btn btn--primary" onClick={() => {
        window.location.hash = ''
        window.location.reload()
      }}>
        Again
      </button>
    </main>
  )
}
