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
  thumbnailPosition?: string;
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
      "The original NogglesRail in Rio de Janeiro, installed at the iconic Praça XV skate spot, stands as a symbol of the Nounish movement meeting Brazilian street culture.\n\nAs part of the Sponsor I ⌐◨-◨ ❤️ XV event, the project brought together a collective effort from Coletivo XV, Pharra, and Vlad (sktbrd), reinforcing the bridge between creative communities and skateboarding culture.\n\nThe activation featured the original NogglesRail as the central obstacle, with cash-for-tricks dynamics and premier clips capturing the energy, style, and progression of the session highlighting both performance and community-driven expression.",
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
      "https://images.hive.blog/DQmb6uJxrG5HsBbmRvtMrA1dcR4Uw1b9LPfiovW9vjVRhzb/Captura%20de%20Tela%202026-03-20%20a%CC%80s%2016.48.29.png",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    description:
      "The Silverado Rail in Long Beach, California, funded through a Nouns proposal, brings Noggles to the West Coast skate scene as a landmark within the evolving Nounish movement.\n\nThis NogglesRail became widely known after going viral across the internet, fueled by a sequence of clips from the Power Peralta team, alongside other local shredders who helped amplify its presence and energy within the global skate community.\n\nBlending community funding, cultural exchange, and high-performance skateboarding, the rail stands as both a physical obstacle and a digital catalyst for visibility, creativity, and progression.",
    proposal: {
      name: "Nouns Proposal",
      link: "https://www.nouns.camp/proposals/303",
    },
    slug: "silverado",
  },
  {
    position: [18.4861, -69.9312],
    label: "Santo Domingo",
    city: "Santo Domingo",
    country: "Dominican Republic",
    continent: "Americas",
    type: "Rail",
    images: [
      "https://images.hive.blog/DQmPZCpD6HXMm2nkKrH5XknciXn2cj3VW9rfcUaL8Gj4dAi/Captura%20de%20Tela%202026-03-19%20a%CC%80s%2018.51.36.png",
      "https://images.hive.blog/DQmZeFXz6M33cmc7eE3ktJdRNvta7qd7RsAcaqSPijbuFDP/Captura%20de%20Tela%202026-03-19%20a%CC%80s%2018.31.01.png",
      "https://images.hive.blog/DQmTd6ax62hHNe28QH3GHmwjaZ8VdfM2UXTnDuZ7BA9JtV5/Captura%20de%20Tela%202026-03-19%20a%CC%80s%2018.33.24.png",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    description:
      "The original NogglesRail in Santo Domingo, installed through a Nouns Amigos activation in the República Dominicana, stands as a symbol of the Nounish movement connecting with local street culture.\n\nThe project highlights the role of Gnars DAO in bridging subDAOs and strengthening the expansion of the global Nounish network, fostering collaboration, culture, and community-driven initiatives across regions.\n\nRooted in both on-chain coordination and off-chain expression, the rail becomes a point of convergence between digital governance and real-world skateboarding culture.",
    proposal: {
      name: "Nouns Amigos",
      link: "",
    },
    slug: "republica-dominicana",
  },
  {
    position: [-22.891659522582522, -43.192417292690315],
    label: "Aquario",
    city: "Rio de Janeiro",
    country: "Brazil",
    continent: "Americas",
    type: "Obstacle",
    images: [
      "https://img.paragraph.com/cdn-cgi/image/format=auto,width=1200,quality=85/https://storage.googleapis.com/papyrus_images/c560404490a3f18a87eb362cd9e5abce01ba362ec1ee7148602019cb4f25162d.png",
    ],
    iconUrl: "https://i.ibb.co/hF3Xx1HB/image.png",
    iconSize: [40, 40],
    description:
      "A custom obstacle installed near the Aquario area in Rio de Janeiro, expanding the network of Nounish skateable infrastructure across the city.\n\nOriginating from a Part 2 proposal focused on a new Nounish architecture, the community voted between four different models and selected the NogglesDelta, shaping a collective decision that materialized into the build.\n\nThe project resulted in a series of events and activations, bringing together skaters, creators, and the community. Explore the clips, Droposals, additional material, and the full proposal to dive deeper into the process and impact.",
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
      "The NogglesRail in Chicago brings CC0 skate infrastructure to the Midwest, expanding the reach of the Nounish movement through community-funded and community-built initiatives.\n\nDeveloped as part of efforts to proliferate and onboard Chicago into the Gnars ecosystem, the project was activated through the ETH Chicago Hackathon and the \"A Lil Gnarly Skate Jam,\" a three-day gathering combining a hackathon, conference, and skate session.\n\nThe initiative connects builders, skaters, and creators, reinforcing the bridge between on-chain coordination and off-chain action while growing the Nounish network in new regions.",
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
      "https://img.paragraph.com/cdn-cgi/image/format=auto,width=1200,quality=85/https://storage.googleapis.com/papyrus_images/5cc8ec2b3e85ced20e76f38b184eb1f25216dbd690c0b09d4ee0b0025d772283.png",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    description:
      "The Iapi Rail in Porto Alegre, southern Brazil, is part of the organic proliferation of NogglesRails across South America, expanding the presence of Nounish skate infrastructure into new regions.\n\nOrganized by Ygor Picollino at the iconic IAPI skate spot, the activation featured a cash-for-tricks format, premier production, and a gnarly community-driven session, bringing together local skaters and contributors.\n\nExplore more through the video, additional materials, and documentation to experience the energy, progression, and impact of the event.",
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
      "The NounGnarversary celebration in Nairobi, Kenya, brought together GnarsDAO and NounsDAO Africa, showcasing the Gnars Shreddable Noggles and marking a milestone moment for the global Nounish movement.",
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
      "The Sopa de Letras spot in São Paulo represents a creative intersection of street art, skateboarding, and Nounish expression. As part of a proposal execution by Will Dias, the project reimagined and revitalized a classic plaza, reactivating the space through Nounish events and transforming it into a gnarly gathering point. A standout element of the activation was the presence of a SLAP in the classic Noggles shape, reinforcing the visual identity of the Nounish movement. Explore the photos and videos to experience the space, its energy, and its impact on the local scene.",
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
      "https://images.hive.blog/DQmPXKkeMSPYtTVuEYfod2ua5gRcwtewA5u5d45zLdTQWr9/Captura%20de%20Tela%202026-03-20%20a%CC%80s%2017.22.21.png",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    description:
      "An organically proliferated NogglesRail in the hills of Minas Gerais, representing the pure expression of community-driven action within the Nounish movement. With no formal proposal, the project emerged through grassroots initiative and community spirit, rooted in the energy of the Gnars Contest 2024, where the best NogglesRail clips were rewarded with ETH and recognition within the Gnars community. The Minas Gerais crew, Coletivo Beach Park, stepped up by creating and documenting their own NogglesRail, contributing to the global narrative and proving that Nounish culture thrives through participation, creativity, and action. Legends.",
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
      "https://images.hive.blog/DQmSyemca91jAsjDR9oQFQBDE5qZEjCHfncdJWgdMi5r9NE/Captura%20de%20Tela%202026-03-19%20a%CC%80s%2018.14.32.png",
      "https://images.hive.blog/DQmYH1H2ygGgd1VUSD2bMqNAg5CafmhUQJj4B6fdGZBcVQB/Captura%20de%20Tela%202026-03-19%20a%CC%80s%2018.14.42.png",
      "https://images.hive.blog/DQmYV6oG6tNqAEtZXQ5RnXQ8Xy9G882tG2p48NHT1A5FDrN/Captura%20de%20Tela%202026-03-19%20a%CC%80s%2018.14.25.png",
      "https://gnars.center/rutsujpg.jpg",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    description:
      "The NogglesRail at Rusutsu Resort in Hokkaido, Japan, marks a meeting point between snowboarding culture and Nounish open-source infrastructure. Executed through Alps DAO and guided by gnarly master Benbodhi, the project expands the reach of action sports into new frontiers, bridging underground ski and snowboard communities with the broader Nounish ecosystem. Set in one of Japan's most iconic winter landscapes, the activation reinforces the spirit of exploration, collaboration, and decentralized culture across snow, mountains, and beyond.",
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
      "The Medellín NogglesRail is embedded within Colombia's vibrant skate scene, serving as a key node connecting Latin American skate culture. Organized by Builder DCOT, founder of the DHNOUNS project—focused on downhill—the activation expanded into the local street skating communities of Medellín and Bogotá, creating a powerful cross-discipline collaboration. The project came to life through a special activation on World Skate Day, bringing together skaters, creators, and the community. Explore the images to experience the energy and impact of the moment.",
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
      "The NogglesRail in London bridges the UK skate community with the decentralized Nouns ecosystem, expanding Nounish culture into one of the world's most influential urban centers. Organized by Joe Atkinson and Gnarly Master Gami (Origami), the activation took place during a major skate and inline event, bringing together diverse communities in a shared space for progression and expression. The session featured cash-for-tricks dynamics and a premier video, capturing the energy, creativity, and impact of the moment. Explore the images and videos to dive deeper into the experience.",
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
      "The Buenos Aires NogglesRail contributes to the dense South American network of community-owned skate infrastructure, reinforcing the growth of Nounish presence across the region. Organized by partners from 7CTV and Revista 7 Capas, in collaboration with Achee Jazz and other contributors, the project hosted two distinct events that brought together large crowds, live jazz performances, cash-for-tricks sessions, and premier screenings.",
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
      "https://images.hive.blog/DQmRiidbfUGk7NNyzuRApn5pW1cVxjNzQr4RvZReumGMk6V/Captura%20de%20Tela%202026-03-19%20a%CC%80s%2018.44.48.png",
      "https://gnars.center/milan.jpg",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    description:
      "Milan's NogglesRail brings Nounish culture to the heart of Italian design and skateboarding, connecting open-source infrastructure with one of Europe's most influential creative capitals. Activated during the APPCON crypto event under the coordination of builder Jacopo, the project integrates the Gnars ecosystem with cutting-edge technology, establishing another Nounish skateable landmark in Europe. The installation reinforces the expansion of Nounish architecture into urban environments, blending design, culture, and decentralized collaboration within Milan's dynamic landscape.",
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
      "A Nounish ramp in Orange County, California, expanding the NogglesRails network beyond rails into full skateable obstacles and new terrain for progression. Ideated by shredder Dave Bachinsky, the project focuses on proliferation through creative expression and viral content, bringing unconventional and bizarre tricks to the miniramp format. The activation highlights how Nounish infrastructure evolves beyond a single format, encouraging experimentation, visibility, and community-driven content. Explore the videos and images to dive deeper into the experience.",
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
      "The NogglesRail at the Itapetininga Skate Park in São Paulo state supports local skate infrastructure in smaller cities, expanding the reach of Nounish culture beyond major urban centers. Led by shredder Garcia, the activation featured a cash-for-tricks session and a premier, bringing the community together around progression and shared energy. The rail was presented in a blue colorway as a tribute to the BASE ecosystem, connecting design, symbolism, and decentralized culture. Explore the images to see more of the activation, the environment, and the community impact.",
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
