"use client";

import Link from "next/link";
import type { LatLngExpression } from "leaflet";
import { Map, MapMarker, MapPopup, MapTileLayer } from "@/components/ui/map";

export const locations = [
  {
    position: [-22.903044816157887, -43.17337963607664],
    label: "Praca XV",
    images: [
      "https://gnars.center/rocknogles.gif",
      "https://gnars.center/xvgroup.jpg",
      "https://gnars.center/xv-mentex-fscrooks.png",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    proposal: {
      name: "Gnars Proposal",
      link: "https://snapshot.box/#/s:gnars.eth/proposal/0xb63306dbfe950dd9754d5edcf8f48c6ff9bdd32eeeff4c644cb90c974a3055fa",
    },
  },
  {
    position: [33.81427083205093, -118.21369178292444],
    label: "Silverado",
    images: ["https://gnars.center/tom_silverdo.jpg", "https://gnars.center/example-image2.jpg"],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    proposal: { name: "Nouns Proposal", link: "www.nouns.camp/proposals/303" },
  },
  {
    position: [-22.891659522582522, -43.192417292690315],
    label: "Aquario",
    images: [
      "https://ipfs.skatehive.app/ipfs/Qmb5vK5V5SJWC8EQJWDaRFztkYBcYzJi8Q6c7appjeQejA",
      "https://ipfs.skatehive.app/ipfs/QmZt4DZvvqAo8YA6S3ZQfGENGG9AZcLLtLGFDEJ9PL1Sgm",
    ],
    iconUrl: "https://i.ibb.co/hF3Xx1HB/image.png",
    iconSize: [40, 40],
    proposal: {
      name: "Gnars Proposal 20",
      link: "https://www.gnars.com/proposals/20",
    },
  },
  {
    position: [41.965330396404994, -87.6638363963253],
    label: "Chicago",
    images: ["https://gnars.center/chicago.jpg", "https://gnars.center/chicago.jpg"],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    proposal: {
      name: "Gnars Proposal",
      link: "https://snapshot.box/#/s:gnars.eth/proposal/0x487760526824abbe7997ee2fe4887de10af737eb60d35a4165025b8f58148e50",
    },
  },
  {
    position: [-30.017866183250845, -51.17985537072372],
    label: "Iapi",
    images: ["https://gnars.center/IAPI1.jpg", "https://gnars.center/IAPI1.jpg"],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    proposal: {
      name: "Gnars Proposal",
      link: "https://www.gnars.wtf/dao/proposals/eth/31",
    },
  },
  {
    position: [9.082, 8.6753],
    label: "Kenya",
    images: ["https://gnars.center/kenya.jpg", "https://gnars.center/kenya2.jpg"],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    proposal: {
      name: "Gnars Proposal",
      link: "https://gnars.com/proposals/73",
    },
  },
  {
    position: [-23.4990518351234, -46.624191393782525],
    label: "Sopa de Letras",
    images: [
      "https://gnars.center/sopadeletras.png",
      "https://gnars.center/sopadeletras.png",
      "https://gnars.center/sopadeletras.png",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    proposal: {
      name: "Gnars Proposal",
      link: "https://www.gnars.com/dao/proposal/4",
    },
  },
  {
    position: [-20.24901180535837, -42.029355475124554],
    label: "Manhuaçu",
    images: ["https://gnars.center/manhuacurail.png", "https://gnars.center/another-image5.jpg"],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    proposal: { name: "Organic Proliferation - ", link: "" },
  },
  {
    position: [42.737274371776024, 140.9109422458354],
    label: "Rusutsu Resort",
    images: ["https://gnars.center/rutsujpg.jpg"],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    proposal: {
      name: "Nouns Proposal",
      link: "https://www.nouns.camp/proposals/218",
    },
  },
  {
    position: [6.243173184580065, -75.5966651104881],
    label: "Medellin",
    images: [
      "https://gnars.center/medellin.png",
      "https://ipfs.skatehive.app/ipfs/Qme5iX2KMzwnJyaP6ThqTWVd7WoU197cjuDZ6zpcxMtDfJ",
    ],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    proposal: {
      name: "Gnars Proposal",
      link: "https://www.gnars.com/dao/proposal/25",
    },
  },
  {
    position: [51.52064675412003, -0.20505440289551358],
    label: "London",
    images: ["https://gnars.center/london.png", "https://gnars.center/london2.png"],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    proposal: {
      name: "Gnars Proposal",
      link: "https://www.gnars.com/dao/proposal/33",
    },
  },
  {
    position: [-34.584183310926065, -58.39040299272954],
    label: "Argentina",
    images: ["https://gnars.center/argentina1.jpg", "https://gnars.center/argentina2.jpg"],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    proposal: {
      name: "Gnars Proposal",
      link: "https://www.gnars.com/proposals/41",
    },
  },
  {
    position: [45.4836, 9.1924],
    label: "Italy",
    images: ["https://gnars.center/milan.jpg"],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    proposal: {
      name: "Gnars Proposal",
      link: "https://www.gnars.com/dao/proposal/68",
    },
  },
  {
    position: [33.71824554962641, -117.84727040288683],
    label: "OC Ramp",
    images: ["https://gnars.center/ocramp.png"],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    proposal: {
      name: "Gnars Proposal",
      link: "https://www.gnars.com/proposals/63",
    },
  },
  {
    position: [-23.594602, -48.052915],
    label: "Itapetininga Skate Park",
    images: ["https://gnars.center/noggle_itape.jpeg"],
    iconUrl: "/nogglesRail3D.png",
    iconSize: [30, 30],
    proposal: {
      name: "Gnars Proposal",
      link: "https://www.gnars.com/proposals/89",
    },
  },
];

export default function GnarsMap() {
  const CENTER_COORDINATES = [0, 0] satisfies LatLngExpression;

  return (
    <div className="fixed inset-0 h-screen w-screen">
      <Map center={CENTER_COORDINATES} zoom={2} className="h-full w-full">
        <MapTileLayer />
        {locations.map((location, index) => (
          <MapMarker
            key={index}
            position={location.position as LatLngExpression}
            icon={
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={location.iconUrl}
                alt={location.label}
                style={{
                  width: `${location.iconSize[0]}px`,
                  height: `${location.iconSize[1]}px`,
                }}
              />
            }
            iconAnchor={[location.iconSize[0] / 2, location.iconSize[1] / 2]}
          >
            <MapPopup>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-bold">{location.label}</h3>
                {location.images[0] && (
                  <div className="relative h-32 w-full overflow-hidden rounded-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={location.images[0]}
                      alt={location.label}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                {location.proposal.link && (
                  <Link
                    href={
                      location.proposal.link.startsWith("http")
                        ? location.proposal.link
                        : `https://${location.proposal.link}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline"
                  >
                    {location.proposal.name} →
                  </Link>
                )}
              </div>
            </MapPopup>
          </MapMarker>
        ))}
      </Map>
    </div>
  );
}
