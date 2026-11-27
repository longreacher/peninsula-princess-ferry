export function lateStatusLabel(slackSeconds) {
  return slackSeconds < -300 ? "Ain't gonna happen" : 'Unlikely';
}
