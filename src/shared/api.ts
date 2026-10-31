// Contrat du pont : seules ces fonctions passent entre l'interface et Windows (window.photon).

export interface PhotonApi {
  hide(): void
  shown(): void // première image après affichage (mesure du délai)
  onShow(callback: () => void): () => void
  onHide(callback: () => void): () => void
}

declare global {
  interface Window {
    photon: PhotonApi
  }
}
