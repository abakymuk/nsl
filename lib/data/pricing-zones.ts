// Pricing zones for LA/LB drayage
// Prices are estimates and subject to change based on fuel, demand, etc.

export interface PricingZone {
  name: string;
  description: string;
  zipPrefixes: string[]; // First 3 digits of ZIP
  pricing: {
    "20ft": { standard: [number, number]; expedited: [number, number] };
    "40ft": { standard: [number, number]; expedited: [number, number] };
    "40ftHC": { standard: [number, number]; expedited: [number, number] };
    "45ft": { standard: [number, number]; expedited: [number, number] };
  };
}

export const pricingZones: PricingZone[] = [
  {
    name: "Zone 1 - LA Basin",
    description: "Los Angeles, Carson, Compton, Long Beach",
    zipPrefixes: ["900", "901", "902", "903", "904", "905", "906", "907", "908"],
    pricing: {
      "20ft": { standard: [350, 450], expedited: [450, 550] },
      "40ft": { standard: [400, 500], expedited: [500, 650] },
      "40ftHC": { standard: [425, 525], expedited: [525, 675] },
      "45ft": { standard: [475, 575], expedited: [575, 725] },
    },
  },
  {
    name: "Zone 2 - South Bay / Torrance",
    description: "Torrance, Gardena, Hawthorne, Inglewood",
    zipPrefixes: ["902", "905"],
    pricing: {
      "20ft": { standard: [375, 475], expedited: [475, 600] },
      "40ft": { standard: [425, 550], expedited: [550, 700] },
      "40ftHC": { standard: [450, 575], expedited: [575, 725] },
      "45ft": { standard: [500, 625], expedited: [625, 775] },
    },
  },
  {
    name: "Zone 3 - Inland Empire West",
    description: "Ontario, Rancho Cucamonga, Fontana, Chino",
    zipPrefixes: ["917", "918", "919"],
    pricing: {
      "20ft": { standard: [450, 550], expedited: [550, 700] },
      "40ft": { standard: [525, 650], expedited: [650, 825] },
      "40ftHC": { standard: [550, 675], expedited: [675, 850] },
      "45ft": { standard: [600, 750], expedited: [750, 925] },
    },
  },
  {
    name: "Zone 4 - Inland Empire East",
    description: "Riverside, San Bernardino, Moreno Valley, Corona",
    zipPrefixes: ["920", "921", "922", "923", "924", "925", "926", "927"],
    pricing: {
      "20ft": { standard: [525, 650], expedited: [650, 825] },
      "40ft": { standard: [625, 775], expedited: [775, 975] },
      "40ftHC": { standard: [650, 800], expedited: [800, 1000] },
      "45ft": { standard: [725, 875], expedited: [875, 1100] },
    },
  },
  {
    name: "Zone 5 - Orange County",
    description: "Santa Ana, Irvine, Anaheim, Fullerton",
    zipPrefixes: ["926", "927", "928"],
    pricing: {
      "20ft": { standard: [400, 500], expedited: [500, 650] },
      "40ft": { standard: [475, 600], expedited: [600, 775] },
      "40ftHC": { standard: [500, 625], expedited: [625, 800] },
      "45ft": { standard: [550, 700], expedited: [700, 875] },
    },
  },
  {
    name: "Zone 6 - San Fernando Valley",
    description: "Van Nuys, Burbank, Glendale, Pasadena",
    zipPrefixes: ["910", "911", "912", "913", "914", "915", "916"],
    pricing: {
      "20ft": { standard: [475, 600], expedited: [600, 775] },
      "40ft": { standard: [575, 725], expedited: [725, 925] },
      "40ftHC": { standard: [600, 750], expedited: [750, 950] },
      "45ft": { standard: [675, 850], expedited: [850, 1075] },
    },
  },
];

export type ContainerSize = "20ft" | "40ft" | "40ftHC" | "45ft";
export type ServiceType = "standard" | "expedited";

export function getZoneByZip(zip: string): PricingZone | null {
  const prefix = zip.slice(0, 3);

  // Check specific zones first (more specific matches)
  for (const zone of pricingZones) {
    if (zone.zipPrefixes.includes(prefix)) {
      return zone;
    }
  }

  return null;
}

export function getPriceEstimate(
  zip: string,
  containerSize: ContainerSize,
  serviceType: ServiceType
): { min: number; max: number; zone: string } | null {
  const zone = getZoneByZip(zip);

  if (!zone) {
    return null;
  }

  const pricing = zone.pricing[containerSize][serviceType];

  return {
    min: pricing[0],
    max: pricing[1],
    zone: zone.name,
  };
}

// Additional fees that may apply
export const additionalFees = {
  hazmat: { min: 150, max: 300, description: "Hazardous materials handling" },
  overweight: { min: 100, max: 250, description: "Overweight container (over 44,000 lbs)" },
  reefer: { min: 75, max: 150, description: "Refrigerated container" },
  liftgate: { min: 150, max: 250, description: "Liftgate delivery" },
  detention: { min: 75, max: 100, description: "Per hour after 2 free hours", perHour: true },
  weekend: { min: 150, max: 300, description: "Weekend/holiday pickup or delivery" },
  prePull: { min: 100, max: 200, description: "Pre-pull to avoid demurrage" },
};
