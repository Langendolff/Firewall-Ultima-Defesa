const KEY = 'firewall-game:completed-phases'

export function getCompleted() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

export function completePhase(id) {
  const done = getCompleted()
  if (!done.includes(id)) {
    done.push(id)
    localStorage.setItem(KEY, JSON.stringify(done))
  }
}

export function isUnlocked(id) {
  return id === 1 || getCompleted().includes(id - 1)
}
