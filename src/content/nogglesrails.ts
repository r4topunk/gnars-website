export type Continent = "Americas" | "Europe" | "Asia" | "Africa" | "Oceania";
export type RailType = "Rail" | "Obstacle" | "Spot";

export interface NogglesRailLocation {
  position: [number, number];
  label: string;
  city: string;
  country: string;
  continent: Continent;
  type: RailType;
  images: string[];
  iconUrl: string;
  iconSize: [number, number];
  description: string;
  proposal: {
    name: string;
    link: string;
  };
  video?: string;
  droposals?: number[];
  slug: string;
}

export const NOGGLES_RAILS: NogglesRailLocation[] = [
  {
    position: [-22.903044816157887, -43.17337963607664],
    label: "Praca XV",
    city: "Rio de Janeiro",
    country: "Brazil",
    continent: "Americas",
    type: "Rail",
    images: [
      "https://www.youtube.com/watch?v=r4GEIl2b_WI",
      "https://www.youtube.com/watch?v=lYkAEhMmFsU",
      "https://ipfs.skatehive.app/ipfs/QmVKzejFTSNyf8mnjootYPKtLir7D7Mu1rkxkuEkWwXduW",
      "https://ipfs.skatehive.app/ipfs/QmRNaq6eSWLw2w8MBtENMeST6yyxU66oEMEktBcdFx17xx",
      "https://gnars.center/xv-mentex-fscrooks.png",
      "https://gnars.center/rocknogles.gif",
      "https://gnars.center/xvgroup.jpg",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    description:
      "The original NogglesRail in Rio de Janeiro, installed at the iconic Praca XV skate spot. A symbol of the Nounish movement meeting Brazilian street culture.",
    proposal: {
      name: "Gnars Proposal",
      link: "https://snapshot.box/#/s:gnars.eth/proposal/0xb63306dbfe950dd9754d5edcf8f48c6ff9bdd32eeeff4c644cb90c974a3055fa",
    },
    droposals: [93],
    slug: "rio-de-janeiro",
  },
  {
    position: [33.81427083205093, -118.21369178292444],
    label: "Silverado",
    city: "Long Beach",
    country: "USA",
    continent: "Americas",
    type: "Rail",
    images: [
      "https://gnars.center/tom_silverdo.jpg",
      "https://gnars.center/example-image2.jpg",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    description:
      "Silverado rail in Long Beach, California. Funded through a Nouns proposal, bringing Noggles to the West Coast skate scene.",
    proposal: {
      name: "Nouns Proposal",
      link: "https://www.nouns.camp/proposals/303",
    },
    slug: "silverado",
  },
  {
    position: [-22.891659522582522, -43.192417292690315],
    label: "Aquario",
    city: "Rio de Janeiro",
    country: "Brazil",
    continent: "Americas",
    type: "Obstacle",
    images: [
      "https://ipfs.skatehive.app/ipfs/Qmb5vK5V5SJWC8EQJWDaRFztkYBcYzJi8Q6c7appjeQejA",
      "https://ipfs.skatehive.app/ipfs/QmZt4DZvvqAo8YA6S3ZQfGENGG9AZcLLtLGFDEJ9PL1Sgm",
    ],
    iconUrl: "https://i.ibb.co/hF3Xx1HB/image.png",
    iconSize: [40, 40],
    description:
      "A custom obstacle near the Aquario area in Rio, expanding the network of Nounish skateable infrastructure in the city.",
    proposal: {
      name: "Gnars Proposal 20",
      link: "https://www.gnars.com/proposals/20",
    },
    slug: "rio-de-janeiro-delta",
  },
  {
    position: [41.965330396404994, -87.6638363963253],
    label: "Chicago",
    city: "Chicago",
    country: "USA",
    continent: "Americas",
    type: "Rail",
    images: [
      "https://gnars.center/chicago.jpg",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    description:
      "NogglesRail in Chicago, bringing CC0 skate infrastructure to the Midwest. Community-funded and community-built.",
    proposal: {
      name: "Gnars Proposal",
      link: "https://snapshot.box/#/s:gnars.eth/proposal/0x487760526824abbe7997ee2fe4887de10af737eb60d35a4165025b8f58148e50",
    },
    slug: "chicago",
  },
  {
    position: [-30.017866183250845, -51.17985537072372],
    label: "Iapi",
    city: "Porto Alegre",
    country: "Brazil",
    continent: "Americas",
    type: "Rail",
    images: [
      "https://gnars.center/IAPI1.jpg",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    description:
      "The Iapi rail in Porto Alegre, southern Brazil. Part of the organic proliferation of NogglesRails across South America.",
    proposal: {
      name: "Gnars Proposal",
      link: "https://www.gnars.wtf/dao/proposals/eth/31",
    },
    slug: "porto-alegre",
  },
  {
    position: [-1.2864, 36.8172],
    label: "Kenya",
    city: "Nairobi",
    country: "Kenya",
    continent: "Africa",
    type: "Rail",
    images: [
      "/images/nogglesrails/kenya-noungnarversary.jpg",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    description:
      "GnarsDAO x NounsDAO Africa NounGnarversary Celebration in Nairobi, Kenya showcasing the Gnars Shreddable Noggles. Red NogglesRail obstacle designed by Nouns DAO / Nouns DAO Africa. An open, permissionless and decentralised celebration of nounish and gnarly culture globally.",
    proposal: {
      name: "Gnars Proposal",
      link: "https://gnars.com/proposals/73",
    },
    slug: "nairobi",
  },
  {
    position: [-23.4990518351234, -46.624191393782525],
    label: "Sopa de Letras",
    city: "Sao Paulo",
    country: "Brazil",
    continent: "Americas",
    type: "Spot",
    images: [
      "https://gnars.center/sopadeletras.png",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    description:
      "Sopa de Letras spot in Sao Paulo, a creative intersection of street art, skateboarding, and Nounish expression.",
    proposal: {
      name: "Gnars Proposal",
      link: "https://www.gnars.com/dao/proposal/4",
    },
    slug: "sao-paulo-sopa-de-letras",
  },
  {
    position: [-20.24901180535837, -42.029355475124554],
    label: "Manhuacu",
    city: "Manhuacu",
    country: "Brazil",
    continent: "Americas",
    type: "Rail",
    images: [
      "https://gnars.center/manhuacurail.png",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    description:
      "An organically proliferated NogglesRail in the hills of Minas Gerais. No formal proposal — just community spirit in action.",
    proposal: {
      name: "Organic Proliferation",
      link: "",
    },
    slug: "minas-gerais",
  },
  {
    position: [42.737274371776024, 140.9109422458354],
    label: "Rusutsu Resort",
    city: "Rusutsu",
    country: "Japan",
    continent: "Asia",
    type: "Rail",
    images: [
      "https://gnars.center/rutsujpg.jpg",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    description:
      "NogglesRail at Rusutsu Resort in Hokkaido, Japan. Where snowboarding culture meets Nounish open-source infrastructure.",
    proposal: {
      name: "Nouns Proposal",
      link: "https://www.nouns.camp/proposals/218",
    },
    slug: "rusutsu",
  },
  {
    position: [6.243173184580065, -75.5966651104881],
    label: "Medellin",
    city: "Medellin",
    country: "Colombia",
    continent: "Americas",
    type: "Rail",
    images: [
      "https://gnars.center/medellin.png",
      "https://ipfs.skatehive.app/ipfs/Qme5iX2KMzwnJyaP6ThqTWVd7WoU197cjuDZ6zpcxMtDfJ",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    description:
      "The Medellin NogglesRail, embedded in Colombia's vibrant skate scene. A node connecting Latin American skate culture.",
    proposal: {
      name: "Gnars Proposal",
      link: "https://www.gnars.com/dao/proposal/25",
    },
    slug: "medellin",
  },
  {
    position: [51.52064675412003, -0.20505440289551358],
    label: "London",
    city: "London",
    country: "United Kingdom",
    continent: "Europe",
    type: "Rail",
    images: [
      "https://gnars.center/london.png",
      "https://gnars.center/london2.png",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    description:
      "NogglesRail in London, bridging the UK skate community with the decentralized Nouns ecosystem.",
    proposal: {
      name: "Gnars Proposal",
      link: "https://www.gnars.com/dao/proposal/33",
    },
    slug: "london",
  },
  {
    position: [-34.584183310926065, -58.39040299272954],
    label: "Argentina",
    city: "Buenos Aires",
    country: "Argentina",
    continent: "Americas",
    type: "Rail",
    images: [
      "https://gnars.center/argentina1.jpg",
      "https://gnars.center/argentina2.jpg",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    description:
      "Buenos Aires NogglesRail, contributing to the dense South American network of community-owned skate infrastructure.",
    proposal: {
      name: "Gnars Proposal",
      link: "https://www.gnars.com/proposals/41",
    },
    slug: "buenos-aires",
  },
  {
    position: [45.4836, 9.1924],
    label: "Italy",
    city: "Milan",
    country: "Italy",
    continent: "Europe",
    type: "Rail",
    images: [
      "https://gnars.center/milan.jpg",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    description:
      "Milan's NogglesRail brings Nounish culture to the heart of Italian design and skateboarding.",
    proposal: {
      name: "Gnars Proposal",
      link: "https://www.gnars.com/dao/proposal/68",
    },
    slug: "milan",
  },
  {
    position: [33.71824554962641, -117.84727040288683],
    label: "OC Ramp",
    city: "Orange County",
    country: "USA",
    continent: "Americas",
    type: "Obstacle",
    images: [
      "https://gnars.center/ocramp.png",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    description:
      "A Nounish ramp in Orange County, California. Expanding the NogglesRails network beyond rails into full obstacles.",
    proposal: {
      name: "Gnars Proposal",
      link: "https://www.gnars.com/proposals/63",
    },
    slug: "oc-ramp",
  },
  {
    position: [-23.594602, -48.052915],
    label: "Itapetininga Skate Park",
    city: "Itapetininga",
    country: "Brazil",
    continent: "Americas",
    type: "Spot",
    images: [
      "https://gnars.center/noggle_itape.jpeg",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    description:
      "NogglesRail at the Itapetininga Skate Park in Sao Paulo state. Supporting local skate infrastructure in smaller cities.",
    proposal: {
      name: "Gnars Proposal",
      link: "https://www.gnars.com/proposals/89",
    },
    slug: "sao-paulo-itapetininga",
  },
];

export const ALL_CONTINENTS: Continent[] = [
  "Americas",
  "Europe",
  "Asia",
  "Africa",
  "Oceania",
];

export const ALL_TYPES: RailType[] = ["Rail", "Obstacle", "Spot"];

export function getRailBySlug(slug: string): NogglesRailLocation | undefined {
  return NOGGLES_RAILS.find((rail) => rail.slug === slug);
}

export function getActiveContents(): Continent[] {
  return [...new Set(NOGGLES_RAILS.map((r) => r.continent))];
}

export function getActiveTypes(): RailType[] {
  return [...new Set(NOGGLES_RAILS.map((r) => r.type))];
}
