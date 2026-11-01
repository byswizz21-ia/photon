<script lang="ts">
  // Case « Propre à ce profil » (mode édition) des widgets à données partagées (notes, to-do).
  let { checked, onchange }: { checked: boolean; onchange: (own: boolean) => void } = $props()
</script>

<label title="Décoché : les mêmes données dans tous les profils">
  <input type="checkbox" {checked} onchange={(event) => onchange(event.currentTarget.checked)} />
  <span>Propre à ce profil</span>
</label>

<style>
  /* Case native teintée par l'accent (Photon Design System : forms/Checkbox). */
  label {
    display: inline-grid;
    grid-template-columns: 18px auto;
    align-items: center;
    gap: 10px;
    font-size: var(--text-13);
    color: var(--text-muted);
    cursor: pointer;
  }

  input {
    margin: 0;
    accent-color: var(--accent);
    cursor: inherit;
  }
</style>
