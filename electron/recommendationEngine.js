/**
 * recommendationEngine.js
 * Generates actionable suggestions based on the aggregated topology state.
 *
 * Recommendation shape:
 * {
 *   id: string,
 *   priorityTag: 'IMPORTANT' | 'OPTIONAL' | 'INFO',
 *   title: string,
 *   steps: string[],
 * }
 */

let _recCounter = 0
function makeId() { return `rec-${++_recCounter}` }

/**
 * Generate recommendations based on the highest severity issue present.
 * @param {Array} issues – from ruleEngine.runRules()
 * @returns {Array} recommendations
 */
export function generateRecommendations(issues) {
  _recCounter = 0
  const recs = []

  const hasWarning = issues.some(i => i.status === 'WARNING')
  const hasLimited = issues.some(i => i.status === 'LIMITED')

  if (hasWarning) {
    recs.push({
      id: makeId(),
      priorityTag: 'IMPORTANT',
      title: 'Optimize High-Speed Devices',
      steps: [
        'Connect high-speed devices directly to the laptop instead of a hub',
        'Use a USB 3.x or higher port for storage devices'
      ]
    })
  }

  // If there are limited items but no critical warnings
  if (hasLimited && !hasWarning) {
    recs.push({
      id: makeId(),
      priorityTag: 'OPTIONAL',
      title: 'Setup Optimization Available',
      steps: [
        'Current setup is acceptable, but can be optimized for better performance',
        'Moving medium-tier devices to USB 3 ports can reduce systemic USB 2.0 controller load'
      ]
    })
  }

  // If no bottlenecks or limitations
  if (!hasWarning && !hasLimited) {
    recs.push({
      id: makeId(),
      priorityTag: 'INFO',
      title: 'Optimal USB Topology',
      steps: [
        'No configuration bottlenecks detected.',
        'All devices have sufficient bandwidth for their tier.'
      ]
    })
  }

  return recs
}
