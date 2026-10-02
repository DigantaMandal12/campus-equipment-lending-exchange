// ==============================================================================
// Campus Pickup & Handover Point Configuration
// ==============================================================================

const CAMPUS_PICKUP_LOCATIONS = [
  'Electrical Lab (Room 304)',
  'Computer Lab (Block B)',
  'Central Library (1st Floor Desk)',
  'Main Gate Security Counter',
  'Department Office (ECE/EE)',
  'College Office (Admin Block)',
  'Mechanical Workshop Counter'
];

const STANDARD_PICKUP_SLOTS = [
  { id: 'slot-1', label: '10:00 AM – 10:30 AM', timeRange: '10:00 - 10:30' },
  { id: 'slot-2', label: '11:00 AM – 11:30 AM', timeRange: '11:00 - 11:30' },
  { id: 'slot-3', label: '1:00 PM – 1:30 PM', timeRange: '13:00 - 13:30' },
  { id: 'slot-4', label: '2:00 PM – 2:30 PM', timeRange: '14:00 - 14:30' },
  { id: 'slot-5', label: '2:30 PM – 3:00 PM', timeRange: '14:30 - 15:00' },
  { id: 'slot-6', label: '3:00 PM – 3:30 PM', timeRange: '15:00 - 15:30' },
  { id: 'slot-7', label: '4:00 PM – 4:30 PM', timeRange: '16:00 - 16:30' }
];

/**
 * Returns available pickup dates starting from today up to daysAhead
 * Sundays are marked as NOT AVAILABLE
 */
function getAvailablePickupDates(daysAhead = 7) {
  const dates = [];
  const now = new Date();
  const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };

  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const isSunday = d.getDay() === 0;

    dates.push({
      dateString,
      formatted: d.toLocaleDateString('en-US', options),
      isAvailable: !isSunday,
      statusLabel: isSunday ? 'NOT AVAILABLE' : 'AVAILABLE'
    });
  }
  return dates;
}

module.exports = {
  CAMPUS_PICKUP_LOCATIONS,
  STANDARD_PICKUP_SLOTS,
  getAvailablePickupDates
};
