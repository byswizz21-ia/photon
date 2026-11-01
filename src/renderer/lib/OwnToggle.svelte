<script lang="ts">
  // Case « Propre à ce profil » (mode édition) des widgets à données partagées (notes, to-do).
  let { checked, onchange }: { checked: boolean; onchange: (own: boolean) => void } = $props()
</script>

<label title="Décoché : les mêmes données dans tous les profils">
  <input type="checkbox" {checked} onchange={(event) => onchange(event.currentTarget.checked)} />
  Propre à ce profil
</label>

<style>
  label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-muted);
    cursor: pointer;
  }

  input {
    margin: 0;
    accent-color: var(--accent);
  }
</style>
