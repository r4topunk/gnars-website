import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

const NAMESPACES = [
  "common",
  "nav",
  "footer",
  "wallet",
  "home",
  "about",
  "proposals",
  "propose",
  "propdates",
  "auctions",
  "tv",
  "members",
  "treasury",
  "feed",
  "droposals",
  "swap",
  "coinProposal",
  "createCoin",
  "mural",
  "map",
  "installations",
  "bounties",
  "blogs",
  "errors",
  "metadata",
] as const;

type Namespace = (typeof NAMESPACES)[number];

// Static loader map — explicit per (locale × namespace) for bundler compatibility.
const loaders: Record<string, () => Promise<unknown>> = {
  "en/common": () => import("../../messages/en/common.json"),
  "en/nav": () => import("../../messages/en/nav.json"),
  "en/footer": () => import("../../messages/en/footer.json"),
  "en/wallet": () => import("../../messages/en/wallet.json"),
  "en/home": () => import("../../messages/en/home.json"),
  "en/about": () => import("../../messages/en/about.json"),
  "en/proposals": () => import("../../messages/en/proposals.json"),
  "en/propose": () => import("../../messages/en/propose.json"),
  "en/propdates": () => import("../../messages/en/propdates.json"),
  "en/auctions": () => import("../../messages/en/auctions.json"),
  "en/tv": () => import("../../messages/en/tv.json"),
  "en/members": () => import("../../messages/en/members.json"),
  "en/treasury": () => import("../../messages/en/treasury.json"),
  "en/feed": () => import("../../messages/en/feed.json"),
  "en/droposals": () => import("../../messages/en/droposals.json"),
  "en/swap": () => import("../../messages/en/swap.json"),
  "en/coinProposal": () => import("../../messages/en/coinProposal.json"),
  "en/createCoin": () => import("../../messages/en/createCoin.json"),
  "en/mural": () => import("../../messages/en/mural.json"),
  "en/map": () => import("../../messages/en/map.json"),
  "en/installations": () => import("../../messages/en/installations.json"),
  "en/bounties": () => import("../../messages/en/bounties.json"),
  "en/blogs": () => import("../../messages/en/blogs.json"),
  "en/errors": () => import("../../messages/en/errors.json"),
  "en/metadata": () => import("../../messages/en/metadata.json"),
  "pt-br/common": () => import("../../messages/pt-br/common.json"),
  "pt-br/nav": () => import("../../messages/pt-br/nav.json"),
  "pt-br/footer": () => import("../../messages/pt-br/footer.json"),
  "pt-br/wallet": () => import("../../messages/pt-br/wallet.json"),
  "pt-br/home": () => import("../../messages/pt-br/home.json"),
  "pt-br/about": () => import("../../messages/pt-br/about.json"),
  "pt-br/proposals": () => import("../../messages/pt-br/proposals.json"),
  "pt-br/propose": () => import("../../messages/pt-br/propose.json"),
  "pt-br/propdates": () => import("../../messages/pt-br/propdates.json"),
  "pt-br/auctions": () => import("../../messages/pt-br/auctions.json"),
  "pt-br/tv": () => import("../../messages/pt-br/tv.json"),
  "pt-br/members": () => import("../../messages/pt-br/members.json"),
  "pt-br/treasury": () => import("../../messages/pt-br/treasury.json"),
  "pt-br/feed": () => import("../../messages/pt-br/feed.json"),
  "pt-br/droposals": () => import("../../messages/pt-br/droposals.json"),
  "pt-br/swap": () => import("../../messages/pt-br/swap.json"),
  "pt-br/coinProposal": () => import("../../messages/pt-br/coinProposal.json"),
  "pt-br/createCoin": () => import("../../messages/pt-br/createCoin.json"),
  "pt-br/mural": () => import("../../messages/pt-br/mural.json"),
  "pt-br/map": () => import("../../messages/pt-br/map.json"),
  "pt-br/installations": () => import("../../messages/pt-br/installations.json"),
  "pt-br/bounties": () => import("../../messages/pt-br/bounties.json"),
  "pt-br/blogs": () => import("../../messages/pt-br/blogs.json"),
  "pt-br/errors": () => import("../../messages/pt-br/errors.json"),
  "pt-br/metadata": () => import("../../messages/pt-br/metadata.json"),
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const entries = await Promise.all(
    NAMESPACES.map(async (ns: Namespace) => {
      const key = `${locale}/${ns}`;
      const loader = loaders[key];
      if (!loader) return [ns, {}] as const;
      const mod = (await loader()) as { default: unknown };
      return [ns, mod.default] as const;
    }),
  );

  return {
    locale,
    messages: Object.fromEntries(entries),
  };
});
