// New Stream Logistics Rate Sheet - January 2026
// Rates include 36% fuel surcharge
// All rates are for standard containers (port to port round trip)

export interface CityRate {
  city: string;
  baseRate: number;      // Customer target rate before fuel
  fuelSurcharge: number; // 36% of base
  totalRate: number;     // Total round trip customer rate
}

// All city rates from rate sheet (alphabetically sorted)
export const cityRates: CityRate[] = [
  { city: "Aguora Hills", baseRate: 470, fuelSurcharge: 169.20, totalRate: 639.20 },
  { city: "Alhambra", baseRate: 375, fuelSurcharge: 135, totalRate: 510 },
  { city: "Aliso Viejo", baseRate: 370, fuelSurcharge: 133.20, totalRate: 503.20 },
  { city: "Anaheim", baseRate: 340, fuelSurcharge: 122.40, totalRate: 462.40 },
  { city: "Azusa", baseRate: 355, fuelSurcharge: 127.80, totalRate: 482.80 },
  { city: "Baldwin Park", baseRate: 355, fuelSurcharge: 127.80, totalRate: 482.80 },
  { city: "Beaumont", baseRate: 480, fuelSurcharge: 172.80, totalRate: 652.80 },
  { city: "Bell", baseRate: 310, fuelSurcharge: 111.60, totalRate: 421.60 },
  { city: "Bellflower", baseRate: 285, fuelSurcharge: 102.60, totalRate: 387.60 },
  { city: "Bloomington", baseRate: 485, fuelSurcharge: 174.60, totalRate: 659.60 },
  { city: "Brea", baseRate: 375, fuelSurcharge: 135, totalRate: 510 },
  { city: "Buena Park", baseRate: 315, fuelSurcharge: 113.40, totalRate: 428.40 },
  { city: "Carlsbad", baseRate: 470, fuelSurcharge: 169.20, totalRate: 639.20 },
  { city: "Carson", baseRate: 250, fuelSurcharge: 90, totalRate: 340 },
  { city: "Castaic", baseRate: 460, fuelSurcharge: 165.60, totalRate: 625.60 },
  { city: "Cerritos", baseRate: 300, fuelSurcharge: 108, totalRate: 408 },
  { city: "Chatsworth", baseRate: 435, fuelSurcharge: 156.60, totalRate: 591.60 },
  { city: "Chino", baseRate: 385, fuelSurcharge: 138.60, totalRate: 523.60 },
  { city: "City of Industry", baseRate: 365, fuelSurcharge: 131.40, totalRate: 496.40 },
  { city: "Colton", baseRate: 485, fuelSurcharge: 174.60, totalRate: 659.60 },
  { city: "Commerce", baseRate: 310, fuelSurcharge: 111.60, totalRate: 421.60 },
  { city: "Compton", baseRate: 250, fuelSurcharge: 90, totalRate: 340 },
  { city: "Corona", baseRate: 405, fuelSurcharge: 145.80, totalRate: 550.80 },
  { city: "Coto de Caza", baseRate: 430, fuelSurcharge: 154.80, totalRate: 584.80 },
  { city: "Covina", baseRate: 375, fuelSurcharge: 135, totalRate: 510 },
  { city: "Cypress", baseRate: 285, fuelSurcharge: 102.60, totalRate: 387.60 },
  { city: "Downey", baseRate: 340, fuelSurcharge: 122.40, totalRate: 462.40 },
  { city: "Duarte", baseRate: 345, fuelSurcharge: 124.20, totalRate: 469.20 },
  { city: "Eastvale", baseRate: 400, fuelSurcharge: 144, totalRate: 544 },
  { city: "El Monte", baseRate: 345, fuelSurcharge: 124.20, totalRate: 469.20 },
  { city: "El Segundo", baseRate: 280, fuelSurcharge: 100.80, totalRate: 380.80 },
  { city: "Fallbrook", baseRate: 530, fuelSurcharge: 190.80, totalRate: 720.80 },
  { city: "Fontana", baseRate: 455, fuelSurcharge: 163.80, totalRate: 618.80 },
  { city: "Foothill Ranch", baseRate: 355, fuelSurcharge: 127.80, totalRate: 482.80 },
  { city: "Fullerton", baseRate: 325, fuelSurcharge: 117, totalRate: 442 },
  { city: "Garden Grove", baseRate: 300, fuelSurcharge: 108, totalRate: 408 },
  { city: "Gardena", baseRate: 250, fuelSurcharge: 90, totalRate: 340 },
  { city: "Glendale", baseRate: 340, fuelSurcharge: 122.40, totalRate: 462.40 },
  { city: "Hacienda Heights", baseRate: 355, fuelSurcharge: 127.80, totalRate: 482.80 },
  { city: "Harbor City", baseRate: 250, fuelSurcharge: 90, totalRate: 340 },
  { city: "Hawthorne", baseRate: 260, fuelSurcharge: 93.60, totalRate: 353.60 },
  { city: "Hollywood", baseRate: 375, fuelSurcharge: 135, totalRate: 510 },
  { city: "Huntington Beach", baseRate: 300, fuelSurcharge: 108, totalRate: 408 },
  { city: "Inglewood", baseRate: 280, fuelSurcharge: 100.80, totalRate: 380.80 },
  { city: "Irvine", baseRate: 325, fuelSurcharge: 117, totalRate: 442 },
  { city: "Irwindale", baseRate: 340, fuelSurcharge: 122.40, totalRate: 462.40 },
  { city: "Jurupa Valley", baseRate: 440, fuelSurcharge: 158.40, totalRate: 598.40 },
  { city: "La Habra", baseRate: 360, fuelSurcharge: 129.60, totalRate: 489.60 },
  { city: "La Mirada", baseRate: 310, fuelSurcharge: 111.60, totalRate: 421.60 },
  { city: "La Palma", baseRate: 310, fuelSurcharge: 111.60, totalRate: 421.60 },
  { city: "La Puente", baseRate: 360, fuelSurcharge: 129.60, totalRate: 489.60 },
  { city: "La Verne", baseRate: 385, fuelSurcharge: 138.60, totalRate: 523.60 },
  { city: "Laguna Niguel", baseRate: 355, fuelSurcharge: 127.80, totalRate: 482.80 },
  { city: "Lake Elsinore", baseRate: 440, fuelSurcharge: 158.40, totalRate: 598.40 },
  { city: "Lake Forest", baseRate: 355, fuelSurcharge: 127.80, totalRate: 482.80 },
  { city: "Long Beach", baseRate: 265, fuelSurcharge: 95.40, totalRate: 360.40 },
  { city: "Los Angeles", baseRate: 345, fuelSurcharge: 124.20, totalRate: 469.20 },
  { city: "Lynwood", baseRate: 250, fuelSurcharge: 90, totalRate: 340 },
  { city: "Menifee", baseRate: 470, fuelSurcharge: 169.20, totalRate: 639.20 },
  { city: "Mira Loma", baseRate: 440, fuelSurcharge: 158.40, totalRate: 598.40 },
  { city: "Montclair", baseRate: 425, fuelSurcharge: 153, totalRate: 578 },
  { city: "Montebello", baseRate: 325, fuelSurcharge: 117, totalRate: 442 },
  { city: "Monterey Park", baseRate: 380, fuelSurcharge: 136.80, totalRate: 516.80 },
  { city: "Moorpark", baseRate: 460, fuelSurcharge: 165.60, totalRate: 625.60 },
  { city: "Moreno Valley", baseRate: 500, fuelSurcharge: 180, totalRate: 680 },
  { city: "Murrieta", baseRate: 530, fuelSurcharge: 190.80, totalRate: 720.80 },
  { city: "Northridge", baseRate: 425, fuelSurcharge: 153, totalRate: 578 },
  { city: "Norwalk", baseRate: 300, fuelSurcharge: 108, totalRate: 408 },
  { city: "Ontario", baseRate: 430, fuelSurcharge: 154.80, totalRate: 584.80 },
  { city: "Orange", baseRate: 310, fuelSurcharge: 111.60, totalRate: 421.60 },
  { city: "Pacoima", baseRate: 400, fuelSurcharge: 144, totalRate: 544 },
  { city: "Paramount", baseRate: 290, fuelSurcharge: 104.40, totalRate: 394.40 },
  { city: "Perris", baseRate: 515, fuelSurcharge: 185.40, totalRate: 700.40 },
  { city: "Pico Rivera", baseRate: 325, fuelSurcharge: 117, totalRate: 442 },
  { city: "Placentia", baseRate: 325, fuelSurcharge: 117, totalRate: 442 },
  { city: "Pomona", baseRate: 400, fuelSurcharge: 144, totalRate: 544 },
  { city: "Rancho Cucamonga", baseRate: 445, fuelSurcharge: 160.20, totalRate: 605.20 },
  { city: "Rancho Dominguez", baseRate: 250, fuelSurcharge: 90, totalRate: 340 },
  { city: "Redlands", baseRate: 500, fuelSurcharge: 180, totalRate: 680 },
  { city: "Redondo Beach", baseRate: 265, fuelSurcharge: 95.40, totalRate: 360.40 },
  { city: "Reseda", baseRate: 390, fuelSurcharge: 140.40, totalRate: 530.40 },
  { city: "Rialto", baseRate: 465, fuelSurcharge: 167.40, totalRate: 632.40 },
  { city: "Riverside", baseRate: 515, fuelSurcharge: 185.40, totalRate: 700.40 },
  { city: "San Bernardino", baseRate: 515, fuelSurcharge: 185.40, totalRate: 700.40 },
  { city: "San Dimas", baseRate: 415, fuelSurcharge: 149.40, totalRate: 564.40 },
  { city: "San Gabriel", baseRate: 390, fuelSurcharge: 140.40, totalRate: 530.40 },
  { city: "Santa Ana", baseRate: 310, fuelSurcharge: 111.60, totalRate: 421.60 },
  { city: "Santa Clarita", baseRate: 450, fuelSurcharge: 162, totalRate: 612 },
  { city: "Santa Fe Springs", baseRate: 325, fuelSurcharge: 117, totalRate: 442 },
  { city: "Santa Paula", baseRate: 550, fuelSurcharge: 198, totalRate: 748 },
  { city: "Signal Hill", baseRate: 250, fuelSurcharge: 90, totalRate: 340 },
  { city: "Simi Valley", baseRate: 430, fuelSurcharge: 154.80, totalRate: 584.80 },
  { city: "South Gate", baseRate: 265, fuelSurcharge: 95.40, totalRate: 360.40 },
  { city: "Sun Valley", baseRate: 385, fuelSurcharge: 138.60, totalRate: 523.60 },
  { city: "Sylmar", baseRate: 415, fuelSurcharge: 149.40, totalRate: 564.40 },
  { city: "Topanga", baseRate: 445, fuelSurcharge: 160.20, totalRate: 605.20 },
  { city: "Torrance", baseRate: 260, fuelSurcharge: 93.60, totalRate: 353.60 },
  { city: "Trabuco Canyon", baseRate: 385, fuelSurcharge: 138.60, totalRate: 523.60 },
  { city: "Tustin", baseRate: 310, fuelSurcharge: 111.60, totalRate: 421.60 },
  { city: "Upland", baseRate: 445, fuelSurcharge: 160.20, totalRate: 605.20 },
  { city: "Valencia", baseRate: 460, fuelSurcharge: 165.60, totalRate: 625.60 },
  { city: "Van Nuys", baseRate: 385, fuelSurcharge: 138.60, totalRate: 523.60 },
  { city: "Vernon", baseRate: 290, fuelSurcharge: 104.40, totalRate: 394.40 },
  { city: "Walnut", baseRate: 370, fuelSurcharge: 133.20, totalRate: 503.20 },
  { city: "Westminster", baseRate: 300, fuelSurcharge: 108, totalRate: 408 },
  { city: "Whittier", baseRate: 325, fuelSurcharge: 117, totalRate: 442 },
  { city: "Wilmington", baseRate: 250, fuelSurcharge: 90, totalRate: 340 },
  { city: "Yorba Linda", baseRate: 360, fuelSurcharge: 129.60, totalRate: 489.60 },
];

// Accessorial fees (fixed rates from rate sheet)
export const accessorialFees = {
  chassisRental: 40,      // Per day
  yardStorage: 40,        // Per day
  prepull: 130,           // Flat fee
  overweight: 250,        // Over 44,000 lbs
  emptyStopOff: 120,      // Flat fee
  detention: 85,          // Per hour after 2 free hours
  fuelSurchargePercent: 36, // Applied to base rate
};

// Helper function to find rate by city name (case-insensitive, partial match)
export function findCityRate(searchTerm: string): CityRate | null {
  const normalized = searchTerm.toLowerCase().trim();

  // Exact match first
  const exactMatch = cityRates.find(
    (r) => r.city.toLowerCase() === normalized
  );
  if (exactMatch) return exactMatch;

  // Partial match
  const partialMatch = cityRates.find(
    (r) => r.city.toLowerCase().includes(normalized) ||
           normalized.includes(r.city.toLowerCase())
  );
  return partialMatch || null;
}

// Get price range for estimator (adds buffer for quote vs actual)
export function getPriceRange(city: string): { min: number; max: number; city: string } | null {
  const rate = findCityRate(city);
  if (!rate) return null;

  // Show a range around the total rate (±5% buffer)
  const buffer = rate.totalRate * 0.05;
  return {
    min: Math.round(rate.totalRate - buffer),
    max: Math.round(rate.totalRate + buffer),
    city: rate.city,
  };
}

// Calculate total with accessorials
export function calculateTotalWithAccessorials(
  baseTotal: number,
  options: {
    prepull?: boolean;
    overweight?: boolean;
    emptyStopOff?: boolean;
    chassisDays?: number;
    storageDays?: number;
    detentionHours?: number;
  }
): number {
  let total = baseTotal;

  if (options.prepull) total += accessorialFees.prepull;
  if (options.overweight) total += accessorialFees.overweight;
  if (options.emptyStopOff) total += accessorialFees.emptyStopOff;
  if (options.chassisDays) total += accessorialFees.chassisRental * options.chassisDays;
  if (options.storageDays) total += accessorialFees.yardStorage * options.storageDays;
  if (options.detentionHours) total += accessorialFees.detention * options.detentionHours;

  return total;
}
