// Agenda : prochains événements d'un agenda iCal (Google Agenda : « adresse secrète au format iCal »).
import CalendarDotsIcon from 'phosphor-svelte/lib/CalendarDotsIcon'
import type { WidgetManifest } from '../types'
import Calendar from './Calendar.svelte'

// remind : minutes avant chaque événement pour la notification (src/main/reminders.ts), 0 = aucune.
export type CalendarSettings = { url: string; remind: number }

const manifest: WidgetManifest<CalendarSettings> = {
  name: 'Agenda',
  category: 'time',
  description: "Prochains événements d'un agenda (Google Agenda, iCal).",
  icon: CalendarDotsIcon,
  size: { w: 4, h: 3, minW: 3, minH: 2 },
  defaults: { url: '', remind: 10 },
  component: Calendar
}

export default manifest
