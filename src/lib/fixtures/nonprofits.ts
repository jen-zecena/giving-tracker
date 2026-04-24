export const NONPROFIT_CATEGORIES = [
  "Education",
  "Health",
  "Environment",
  "Hunger & Poverty",
  "Animal Welfare",
  "Human Rights",
  "Arts & Culture",
  "Disaster Relief",
  "Housing",
  "Community",
  "Research",
  "Youth",
] as const;

export type NonprofitCategory = (typeof NONPROFIT_CATEGORIES)[number];

export type NonprofitRating = {
  source: string;
  rating: string;
  score: number;
  maxScore: number;
  lastUpdated: string;
};

export type Nonprofit = {
  id: string;
  ein: string;
  name: string;
  mission: string;
  description: string;
  category: NonprofitCategory[];
  subcategory?: string;
  tags: string[];
  location: { city: string; state: string; country: string };
  website: string;
  donationUrl: string;
  verified: boolean;
  verificationDate?: string;
  flagged: boolean;
  flagCount: number;
  ratings: NonprofitRating[];
  founded?: number;
  size?: string;
  revenue?: number;
};

export type NonprofitSearchFilters = {
  category?: NonprofitCategory[];
  verified?: boolean;
  minRating?: number;
};

export const MOCK_NONPROFITS: Nonprofit[] = [
  {
    id: "np-001",
    ein: "13-1635294",
    name: "World Wildlife Fund",
    mission: "The leading organization in wildlife conservation and endangered species protection worldwide.",
    description:
      "WWF works in nearly 100 countries to conserve nature and reduce the most pressing threats to the diversity of life on Earth. We collaborate with communities, governments, and businesses to protect wildlife and wild places, tackle climate change, and secure a more sustainable future for people and nature.",
    category: ["Environment", "Animal Welfare"],
    subcategory: "Wildlife Conservation",
    tags: ["conservation", "endangered-species", "climate", "biodiversity"],
    location: { city: "Washington", state: "DC", country: "United States" },
    website: "https://www.worldwildlife.org",
    donationUrl: "https://www.worldwildlife.org/donate",
    verified: true,
    verificationDate: "2025-11-15",
    flagged: false,
    flagCount: 0,
    ratings: [
      { source: "Charity Navigator", rating: "4-Star", score: 96, maxScore: 100, lastUpdated: "2025-09-20" },
      { source: "GuideStar", rating: "Platinum", score: 98, maxScore: 100, lastUpdated: "2025-10-01" },
    ],
    founded: 1961,
    size: "1,000+ employees",
    revenue: 348000000,
  },
  {
    id: "np-002",
    ein: "13-1644147",
    name: "American Red Cross",
    mission: "Prevents and alleviates human suffering in the face of emergencies through volunteer support and donor generosity.",
    description:
      "The American Red Cross shelters, feeds, and provides emotional support to victims of disasters; supplies about 40% of the nation's blood; teaches skills that save lives; distributes international humanitarian aid; and supports veterans, military members, and their families.",
    category: ["Disaster Relief", "Health"],
    subcategory: "Emergency Response",
    tags: ["disaster", "blood-donation", "emergency", "humanitarian"],
    location: { city: "Washington", state: "DC", country: "United States" },
    website: "https://www.redcross.org",
    donationUrl: "https://www.redcross.org/donate/donation.html",
    verified: true,
    verificationDate: "2025-12-02",
    flagged: false,
    flagCount: 0,
    ratings: [
      { source: "Charity Navigator", rating: "4-Star", score: 92, maxScore: 100, lastUpdated: "2025-08-12" },
      { source: "GuideStar", rating: "Gold", score: 90, maxScore: 100, lastUpdated: "2025-07-30" },
    ],
    founded: 1881,
    size: "10,000+ employees",
    revenue: 2900000000,
  },
  {
    id: "np-003",
    ein: "13-1623888",
    name: "Doctors Without Borders",
    mission: "Delivers emergency medical aid to people affected by conflict, epidemics, disasters, or exclusion from healthcare.",
    description:
      "Médecins Sans Frontières (MSF) provides medical assistance where it is most needed, regardless of race, religion, or political affiliation. Our teams respond to armed conflicts, epidemics, and natural disasters in more than 70 countries each year.",
    category: ["Health", "Human Rights"],
    subcategory: "Global Health",
    tags: ["medical", "refugees", "epidemics", "international"],
    location: { city: "New York", state: "NY", country: "United States" },
    website: "https://www.doctorswithoutborders.org",
    donationUrl: "https://donate.doctorswithoutborders.org",
    verified: true,
    verificationDate: "2025-10-18",
    flagged: false,
    flagCount: 0,
    ratings: [
      { source: "Charity Navigator", rating: "4-Star", score: 98, maxScore: 100, lastUpdated: "2025-11-04" },
      { source: "GuideStar", rating: "Platinum", score: 99, maxScore: 100, lastUpdated: "2025-09-22" },
    ],
    founded: 1971,
    size: "5,000+ employees",
    revenue: 580000000,
  },
  {
    id: "np-004",
    ein: "23-7327393",
    name: "Khan Academy",
    mission: "Provides a free, world-class education to anyone, anywhere.",
    description:
      "Khan Academy offers practice exercises, instructional videos, and a personalized learning dashboard that empower learners to study at their own pace in and outside of the classroom. Lessons in math, science, computing, history, art history, economics, and more.",
    category: ["Education", "Research"],
    subcategory: "Online Learning",
    tags: ["education", "online", "free", "k-12", "test-prep"],
    location: { city: "Mountain View", state: "CA", country: "United States" },
    website: "https://www.khanacademy.org",
    donationUrl: "https://www.khanacademy.org/donate",
    verified: true,
    verificationDate: "2025-12-10",
    flagged: false,
    flagCount: 0,
    ratings: [
      { source: "Charity Navigator", rating: "4-Star", score: 95, maxScore: 100, lastUpdated: "2025-08-01" },
      { source: "GuideStar", rating: "Platinum", score: 97, maxScore: 100, lastUpdated: "2025-09-14" },
    ],
    founded: 2008,
    size: "200-500 employees",
    revenue: 70000000,
  },
  {
    id: "np-005",
    ein: "94-1166337",
    name: "Habitat for Humanity International",
    mission: "Brings people together to build homes, communities, and hope.",
    description:
      "Habitat for Humanity partners with families, volunteers, and donors to help build or improve a place they can call home. Through financial support, volunteering, or adding a voice in support of affordable housing, everyone can help families achieve the strength, stability, and self-reliance they need to build a better life.",
    category: ["Housing", "Community"],
    subcategory: "Affordable Housing",
    tags: ["housing", "construction", "volunteer", "poverty"],
    location: { city: "Americus", state: "GA", country: "United States" },
    website: "https://www.habitat.org",
    donationUrl: "https://www.habitat.org/donate",
    verified: true,
    verificationDate: "2025-11-01",
    flagged: false,
    flagCount: 0,
    ratings: [
      { source: "Charity Navigator", rating: "4-Star", score: 88, maxScore: 100, lastUpdated: "2025-07-18" },
      { source: "GuideStar", rating: "Gold", score: 85, maxScore: 100, lastUpdated: "2025-08-05" },
    ],
    founded: 1976,
    size: "1,000+ employees",
    revenue: 420000000,
  },
  {
    id: "np-006",
    ein: "13-1760110",
    name: "Feeding America",
    mission: "Feeds America's hungry through a nationwide network of food banks and engages our country in the fight to end hunger.",
    description:
      "Feeding America is the largest domestic hunger-relief organization in the United States. The Feeding America nationwide network of 200 food banks and 60,000 partner agencies, food pantries, and meal programs provides meals to more than 40 million people each year.",
    category: ["Hunger & Poverty", "Community"],
    subcategory: "Food Security",
    tags: ["hunger", "food-bank", "poverty", "food-rescue"],
    location: { city: "Chicago", state: "IL", country: "United States" },
    website: "https://www.feedingamerica.org",
    donationUrl: "https://secure.feedingamerica.org/donate",
    verified: true,
    verificationDate: "2025-12-15",
    flagged: false,
    flagCount: 0,
    ratings: [
      { source: "Charity Navigator", rating: "4-Star", score: 99, maxScore: 100, lastUpdated: "2025-11-11" },
      { source: "GuideStar", rating: "Platinum", score: 98, maxScore: 100, lastUpdated: "2025-10-20" },
    ],
    founded: 1979,
    size: "200-500 employees",
    revenue: 4200000000,
  },
  {
    id: "np-007",
    ein: "13-1788491",
    name: "ASPCA",
    mission: "Works to prevent cruelty to animals and rescue those in need.",
    description:
      "Founded in 1866, the American Society for the Prevention of Cruelty to Animals (ASPCA) was the first humane society to be established in North America and is, today, one of the largest in the world. Our organization's mission is to provide effective means for the prevention of cruelty to animals throughout the United States.",
    category: ["Animal Welfare"],
    subcategory: "Animal Rescue",
    tags: ["animals", "rescue", "adoption", "anti-cruelty"],
    location: { city: "New York", state: "NY", country: "United States" },
    website: "https://www.aspca.org",
    donationUrl: "https://secure.aspca.org/donate",
    verified: true,
    verificationDate: "2025-10-05",
    flagged: false,
    flagCount: 0,
    ratings: [
      { source: "Charity Navigator", rating: "3-Star", score: 82, maxScore: 100, lastUpdated: "2025-06-20" },
      { source: "GuideStar", rating: "Gold", score: 84, maxScore: 100, lastUpdated: "2025-07-12" },
    ],
    founded: 1866,
    size: "500-1,000 employees",
    revenue: 287000000,
  },
  {
    id: "np-008",
    ein: "53-0196605",
    name: "Smithsonian Institution",
    mission: "The world's largest museum, education, and research complex dedicated to the increase and diffusion of knowledge.",
    description:
      "The Smithsonian comprises 21 museums and galleries, the National Zoo, and numerous research facilities. Supported by federal appropriations and private donations, the Smithsonian preserves cultural heritage and advances scientific research for the benefit of the American public and the world.",
    category: ["Arts & Culture", "Education", "Research"],
    subcategory: "Museum",
    tags: ["museums", "research", "culture", "science", "history"],
    location: { city: "Washington", state: "DC", country: "United States" },
    website: "https://www.si.edu",
    donationUrl: "https://www.si.edu/giving",
    verified: true,
    verificationDate: "2025-09-30",
    flagged: false,
    flagCount: 0,
    ratings: [
      { source: "Charity Navigator", rating: "3-Star", score: 78, maxScore: 100, lastUpdated: "2025-05-18" },
      { source: "GuideStar", rating: "Gold", score: 80, maxScore: 100, lastUpdated: "2025-06-05" },
    ],
    founded: 1846,
    size: "6,000+ employees",
    revenue: 1650000000,
  },
  {
    id: "np-009",
    ein: "13-1837418",
    name: "Planned Parenthood Federation of America",
    mission: "Delivers vital reproductive health care, sex education, and information to millions of people worldwide.",
    description:
      "Planned Parenthood is a trusted health care provider, an informed educator, a passionate advocate, and a global partner helping similar organizations around the world. We deliver vital reproductive health care, sex education, and information to millions of people worldwide each year.",
    category: ["Health", "Human Rights"],
    subcategory: "Reproductive Health",
    tags: ["health", "reproductive-rights", "education", "advocacy"],
    location: { city: "New York", state: "NY", country: "United States" },
    website: "https://www.plannedparenthood.org",
    donationUrl: "https://www.plannedparenthood.org/donate",
    verified: true,
    verificationDate: "2025-11-20",
    flagged: false,
    flagCount: 0,
    ratings: [
      { source: "Charity Navigator", rating: "4-Star", score: 90, maxScore: 100, lastUpdated: "2025-10-08" },
      { source: "GuideStar", rating: "Platinum", score: 93, maxScore: 100, lastUpdated: "2025-09-02" },
    ],
    founded: 1916,
    size: "5,000+ employees",
    revenue: 1930000000,
  },
  {
    id: "np-010",
    ein: "22-2306795",
    name: "charity: water",
    mission: "Brings clean, safe drinking water to people in developing countries.",
    description:
      "charity: water funds sustainable, community-owned water projects in 29 countries around the world. 100% of public donations fund clean water projects. Since 2006, we've funded more than 137,000 water projects, bringing clean water to over 18 million people.",
    category: ["Health", "Community"],
    subcategory: "Clean Water",
    tags: ["water", "sanitation", "developing-world", "100-model"],
    location: { city: "New York", state: "NY", country: "United States" },
    website: "https://www.charitywater.org",
    donationUrl: "https://www.charitywater.org/donate",
    verified: true,
    verificationDate: "2025-12-20",
    flagged: false,
    flagCount: 0,
    ratings: [
      { source: "Charity Navigator", rating: "4-Star", score: 97, maxScore: 100, lastUpdated: "2025-11-25" },
      { source: "GuideStar", rating: "Platinum", score: 100, maxScore: 100, lastUpdated: "2025-12-01" },
    ],
    founded: 2006,
    size: "100-200 employees",
    revenue: 107000000,
  },
  {
    id: "np-011",
    ein: "52-1265691",
    name: "Boys & Girls Clubs of America",
    mission: "Enables all young people to reach their full potential as productive, caring, responsible citizens.",
    description:
      "For more than 160 years, Boys & Girls Clubs of America has provided a safe place, caring adult mentors, fun, and friendship, and high-impact youth development programs on a daily basis during critical non-school hours.",
    category: ["Youth", "Education", "Community"],
    subcategory: "Youth Development",
    tags: ["youth", "mentorship", "after-school", "community"],
    location: { city: "Atlanta", state: "GA", country: "United States" },
    website: "https://www.bgca.org",
    donationUrl: "https://www.bgca.org/ways-to-give",
    verified: true,
    verificationDate: "2025-08-14",
    flagged: false,
    flagCount: 0,
    ratings: [
      { source: "Charity Navigator", rating: "3-Star", score: 76, maxScore: 100, lastUpdated: "2025-05-02" },
      { source: "GuideStar", rating: "Gold", score: 78, maxScore: 100, lastUpdated: "2025-04-18" },
    ],
    founded: 1860,
    size: "500-1,000 employees",
    revenue: 189000000,
  },
  {
    id: "np-012",
    ein: "95-3825756",
    name: "Local Community Giving Co-op",
    mission: "A smaller organization serving local needs — example of a community-scale nonprofit without charity-watchdog ratings.",
    description:
      "A volunteer-run neighborhood organization that distributes small grants to local causes. Included in the directory to illustrate how the UI handles nonprofits without external ratings.",
    category: ["Community"],
    subcategory: "Local Giving",
    tags: ["local", "community", "grassroots"],
    location: { city: "Portland", state: "OR", country: "United States" },
    website: "https://example.org/local-giving",
    donationUrl: "https://example.org/local-giving/donate",
    verified: false,
    flagged: false,
    flagCount: 0,
    ratings: [],
    founded: 2019,
    size: "< 10 volunteers",
  },
];

export function getAverageRating(nonprofit: Nonprofit): number {
  if (nonprofit.ratings.length === 0) return 0;
  const total = nonprofit.ratings.reduce((sum, r) => sum + r.score, 0);
  return total / nonprofit.ratings.length;
}

export function searchNonprofits(
  query: string,
  filters: NonprofitSearchFilters = {},
): Nonprofit[] {
  const q = query.trim().toLowerCase();
  const { category, verified, minRating } = filters;

  return MOCK_NONPROFITS.filter((n) => {
    if (q) {
      const haystack = [
        n.name,
        n.mission,
        n.description,
        n.subcategory ?? "",
        ...n.category,
        ...n.tags,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (category && category.length > 0) {
      const hasAny = category.some((c) => n.category.includes(c));
      if (!hasAny) return false;
    }

    if (verified === true && !n.verified) return false;

    if (typeof minRating === "number" && minRating > 0) {
      if (getAverageRating(n) < minRating) return false;
    }

    return true;
  });
}

export function getNonprofitById(id: string): Nonprofit | undefined {
  return MOCK_NONPROFITS.find((n) => n.id === id);
}
