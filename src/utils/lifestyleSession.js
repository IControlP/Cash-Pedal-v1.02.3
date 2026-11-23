// Rebuild a calculator state (profile, life events, active profile) from the plain form
// the page keeps — used by the page itself and by the saved-profile comparison, so a saved
// item always computes exactly as it did when it was saved. Pure and Node-importable.

import { applyLifeEvents } from './lifestyle.js'

// cityRow(state, cityId) → city row or null (the caller supplies the lookup).
export function profileFromForm(form, prefs, cityRow = () => null) {
  const partnered = !!form.married || !!form.cohabiting
  const income1 = Number(form.income1) || 0
  const income2 = partnered ? Number(form.income2) || 0 : 0
  return {
    incomes: partnered ? [income1, income2] : [income1],
    age: form.age, state: form.state, married: !!form.married, cohabiting: !!form.cohabiting,
    children: form.children, childrenUnder6: form.under6 === '' || form.under6 == null ? form.children : Math.min(form.under6, form.children),
    roommates: form.roommates,
    debtMonthly: Number(form.debt) || 0, savedForHome: Number(form.saved) || 0,
    city: cityRow(form.state, form.city),
    prefs: prefs ?? {},
  }
}

export function eventInputsFromForm(form, cityRow = () => null) {
  return {
    newIncome: Number(form.newIncome) || 0,
    jobState: form.newState || '', jobCity: cityRow(form.newState, form.newCity),
    destState: form.destState, destCity: cityRow(form.destState, form.destCity),
    partnerIncome: Number(form.partnerIncome) || 0, babies: form.babies,
  }
}

// Everything the engine needs for one saved/open state.
export function stateFromSaved({ form, prefs, mode, events }, cityRow = () => null) {
  const profile = profileFromForm(form ?? {}, prefs, cityRow)
  const evs = events ?? []
  const after = mode === 'change' ? applyLifeEvents(profile, evs, eventInputsFromForm(form ?? {}, cityRow)) : null
  return { profile, after, active: after ?? profile }
}
