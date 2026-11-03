<script lang="ts">
  // Matchs en direct (pastille rouge), puis à venir, puis derniers résultats (vainqueur en gras).
  // Une ligne par match : jour et heure, les deux équipes l'une sous l'autre avec leur score,
  // compétition en petit. Clic : la page du match. Cache de Photon relu toutes les 20 s.
  // Mode édition : sport, ligue et équipe (foot) ou filtre (e-sport).
  import type { Feed, FootTeam, Match, MatchSport, MatchTeam } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import { dayLabel, timeLabel } from '../../lib/when'
  import type { WidgetProps } from '../types'
  import { LEAGUES, type MatchesSettings } from './manifest'

  let { settings, editing, save, preview }: WidgetProps<MatchesSettings> = $props()

  const SPORTS: [MatchSport, string][] = [
    ['foot', 'Foot'],
    ['lol', 'LoL'],
    ['valorant', 'Valorant']
  ]

  let feed = $state.raw<Feed<Match> | null | undefined>()
  let now = $state(new Date())
  pollWhileVisible(async () => {
    feed = await window.photon.matches(settings)
    now = new Date()
  }, 20_000)

  // Équipes de la ligue : lues seulement en mode édition (geste de l'utilisateur).
  let teams = $state.raw<FootTeam[] | null | undefined>()
  $effect(() => {
    const league = settings.league
    if (!editing || preview || settings.sport !== 'foot') return
    teams = undefined
    void window.photon.footTeams(league).then((list) => {
      if (settings.league === league) teams = list
    })
  })

  const leagueName = $derived(LEAGUES.find(([id]) => id === settings.league)?.[1] ?? '')
  const title = $derived(
    settings.sport === 'foot'
      ? settings.teamName || leagueName
      : `${settings.sport === 'lol' ? 'League of Legends' : 'Valorant'}${settings.filter ? ` · ${settings.filter}` : ''}`
  )

  const winner = (m: Match, team: MatchTeam): boolean => {
    const other = team === m.home ? m.away : m.home
    return (
      m.state === 'done' && team.score !== null && other.score !== null && team.score > other.score
    )
  }
</script>

<div class="w-body">
  <div class="w-head">
    <span class="w-label" {title}>{title || 'Matchs'}</span>
    {#if feed?.error}<span class="w-hint">{feed.error}</span>{/if}
  </div>

  {#if editing}
    <div class="settings" data-no-drag>
      <div class="w-chips">
        {#each SPORTS as [sport, label] (sport)}
          <button
            type="button"
            class="w-chip"
            class:selected={settings.sport === sport}
            aria-pressed={settings.sport === sport}
            onclick={() => save({ ...settings, sport })}>{label}</button
          >
        {/each}
      </div>
      {#if settings.sport === 'foot'}
        <div class="w-row">
          <select
            class="w-input grow"
            value={settings.league}
            aria-label="Ligue"
            onchange={(e) =>
              save({ ...settings, league: e.currentTarget.value, team: '', teamName: '' })}
          >
            {#each LEAGUES as [id, name] (id)}<option value={id}>{name}</option>{/each}
          </select>
          <select
            class="w-input grow"
            value={settings.team}
            aria-label="Équipe"
            disabled={!teams}
            onchange={(e) => {
              const id = e.currentTarget.value
              save({ ...settings, team: id, teamName: teams?.find((t) => t.id === id)?.name ?? '' })
            }}
          >
            <option value="">{teams === undefined ? 'Équipes…' : 'Toute la ligue'}</option>
            {#each teams ?? [] as team (team.id)}<option value={team.id}>{team.name}</option>{/each}
          </select>
        </div>
      {:else}
        <input
          class="w-input"
          value={settings.filter}
          maxlength="80"
          placeholder={settings.sport === 'lol'
            ? 'Ex. : G2, Karmine, LEC'
            : 'Ex. : Karmine, VCT, Fnatic'}
          aria-label="Équipes ou compétitions à suivre, séparées par des virgules"
          onchange={(e) => save({ ...settings, filter: e.currentTarget.value.trim() })}
        />
        <p class="w-hint">Vide : tous les matchs. Plusieurs : séparés par des virgules.</p>
      {/if}
    </div>
  {/if}

  {#if !feed || (feed.updatedAt === null && !feed.error)}
    <p class="w-message">Lecture des matchs…</p>
  {:else if !feed.items.length}
    <p class="w-message">{feed.error ? 'Hors ligne' : 'Aucun match trouvé.'}</p>
  {:else}
    <ul class="w-list">
      {#each feed.items as m (m.id)}
        <li>
          <button
            type="button"
            class="match"
            class:done={m.state === 'done'}
            disabled={!m.url}
            onclick={() => window.photon.openUrl(m.url)}
          >
            <span class="when">
              {#if m.state === 'live'}
                <span class="live">En direct</span>
              {:else}
                <span>{dayLabel(m.start, now)}</span>
                {#if m.state === 'upcoming'}<span class="hour">{timeLabel(m.start)}</span>{/if}
              {/if}
            </span>
            <span class="teams">
              {#each [m.home, m.away] as team, i (i)}
                <span class="team" class:win={winner(m, team)}>
                  {#if team.logo}<img src={team.logo} alt="" />{:else}<span class="nologo"
                    ></span>{/if}
                  <span class="name">{team.name}</span>
                  {#if team.score !== null}<span class="score">{team.score}</span>{/if}
                </span>
              {/each}
              {#if m.event}<span class="event">{m.event}</span>{/if}
            </span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .settings {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .grow {
    flex: 1;
  }

  .match {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 4px;
    border: 0;
    border-radius: var(--radius-row);
    background: none;
    color: var(--text);
    text-align: left;
    cursor: pointer;
  }

  .match:hover:not(:disabled) {
    background: var(--surface-hover);
  }

  .match:disabled {
    cursor: default;
  }

  .when {
    flex: none;
    width: 72px;
    display: flex;
    flex-direction: column;
    font-size: var(--text-12);
    color: var(--text-muted);
  }

  .hour {
    font-size: var(--text-14);
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }

  .live {
    align-self: flex-start;
    padding: 1px 6px;
    border-radius: var(--radius-pill);
    background: var(--danger);
    color: var(--white);
    font-size: var(--text-11);
    font-weight: var(--weight-semibold);
  }

  .teams {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .team {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-13);
  }

  .done .team {
    color: var(--text-muted);
  }

  .done .team.win {
    color: var(--text);
    font-weight: var(--weight-semibold);
  }

  img,
  .nologo {
    flex: none;
    width: 18px;
    height: 18px;
    object-fit: contain;
  }

  .nologo {
    border-radius: 50%;
    background: var(--white-6);
  }

  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .score {
    font-variant-numeric: tabular-nums;
  }

  .event {
    font-size: var(--text-11);
    color: var(--text-faint);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
