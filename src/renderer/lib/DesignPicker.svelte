<script lang="ts" module>
  // Place du contenu d'une carte de w × h cases quand une case fait 100 px, la taille des
  // maquettes (Claude Design). Pour manifest.minSize : la grille ajoute des cases si elles sont
  // plus petites. 2 px de marge : une largeur de case de 99,99 px n'ajoute pas une colonne.
  export const cardPx = (w: number, h: number): { width: number; height: number } => ({
    width: w * 100 - 24,
    height: h * 100 - 24
  })
</script>

<script lang="ts">
  // Choix du design d'un widget en mode édition : une pastille par design (comme les réglages).
  // Sert aussi à tout autre choix court (label).
  let {
    designs,
    value,
    label = 'Design',
    onpick
  }: {
    designs: readonly (readonly [string, string])[] // [id, libellé]
    value: string
    label?: string
    onpick(id: string): void
  } = $props()

  const uid = $props.id()
  // Design inconnu (profil d'une autre version) : le premier est coché.
  const current = $derived(designs.some(([id]) => id === value) ? value : designs[0]?.[0])
</script>

<fieldset class="seg" data-no-drag>
  <legend class="sr">{label}</legend>
  {#each designs as [id, text] (id)}
    <label>
      <input
        type="radio"
        name="design-{uid}"
        value={id}
        checked={current === id}
        onchange={() => onpick(id)}
      />
      <span>{text}</span>
    </label>
  {/each}
</fieldset>

<style>
  .seg {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    gap: 2px;
    max-width: 360px;
    margin: 0;
    padding: 3px;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--white-4);
  }

  label {
    position: relative;
    display: flex;
    min-width: 0;
  }

  input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  span {
    flex: 1;
    min-width: 0;
    height: var(--control-h-chip);
    line-height: var(--control-h-chip);
    padding: 0 8px;
    text-align: center;
    border-radius: var(--radius-pill);
    font-size: var(--text-13);
    font-weight: var(--weight-medium);
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  input:not(:checked):hover + span {
    color: var(--text);
    background: var(--white-6);
  }

  input:checked + span {
    background: var(--accent);
    color: var(--on-accent);
  }

  input:focus-visible + span {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  /* Carte étroite : pastilles plus serrées pour que les noms tiennent. */
  @container (max-width: 300px) {
    span {
      padding: 0 3px;
      font-size: var(--text-12);
    }
  }

  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
