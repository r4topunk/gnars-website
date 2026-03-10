---
layout: post
title: ENS Domains - DNS of Web3.0?
description: 
date: 2022-01-28 00:00:00 +0000
permalink: /ens-domains/
author: gami
image: /images/ENS-domains.jpeg
image_caption:
video_embed: 
tags: [research]
featured: 
---

What is yours but your friends use more than you? Your name!

Sorry for this extremely cringy riddle, but hey, “Names” are one of the most fundamental, intangible things almost everyone has. While unique names are coveted, what makes a name no longer a name?

Perhaps if your name is unreadable or unrecognizable, there’s no point in having one. For example, I had to copy-paste the name of Elon Musk’s newborn son, “[X Æ A-12 Musk](https://www.washingtonpost.com/technology/2020/05/08/musk-grimes-baby-name/)”. Truly, I’d rather give baby Musk the nickname “X” rather than deal with his tongue-twister of a name.

Beyond naming for convenience’s sake, can names serve a greater purpose? Could it be part of your identity, a label that is unique to you? In this article, we’ll be talking about naming — more specifically, domain naming. Get ready to be wow-ed, for names aren’t just names in this internet of blockchains.

## What Is A Domain Name?

A domain name is a text which directs viewers to access a specific website. In other words, this is the link you type in a browser (like Google) to reach a website. For us, [gnars.com](https://gnars.com/) is our domain name.

However, domain names aren’t the real addresses of websites. Instead, these websites are all tied to an IP address (e.g. 64.233.160.0), using a technology called DNS to bridge the gap between computers and humans.

DNS, also known as Domain Name Service, converts domain names into IP addresses. Computers communicate with Internet Protocol addresses, and since each website has its own unique IP, DNS can find the IP of a website with its domain name. For this reason, DNS is commonly called “The phonebook of the internet”.

Domain names are managed by domain registrars, such as Bluehost or GoDaddy. Without a domain name, you cannot set up a website. Be wary when choosing domain registrars, you should pick plans from reputable ones to avoid paying for an expired domain name or getting scammed.

In case some of you are wondering, URLs and Domain Names are slightly different. Domain names are simply generic texts that direct browsers to the website, while URLs include the domain name and other details which typically link to a specific page of a website.

## What Is [ENS](https://ens.domains/)?

ENS (Ethereum Name Service) is basically the blockchain version of DNS… with way more integrations and use cases!

Just like DNS, ENS looks up the real address of stuff that is residing on the blockchain, and it just needs an Ethereum-compatible name to do the trick. With ENS, you won’t need to remember any more strings of numbers (or code in the case of blockchains), everything is compiled into one Ethereum Name.

### ENS’s Main Purpose

At the moment, ENS is primarily focused on making wallet addresses shorter and neater, enabling easier transfers of cryptocurrencies within the blockchain.

As you should know, all crypto wallets have at least one public address and one private key. Public keys identify your wallet, while private keys are the passwords to your wallet. Pro tip: Never, under any circumstance, reveal your private keys to strangers! If you’re interested in the security aspects of crypto, have a look at this [article](/are-hardware-wallets-worth-it/).

Now, public keys are what others type in to send crypto and other digital assets to you. Here’s the public key of an Ethereum wallet created just for this article: *0x72F024d71A705A39a65a0f631654c364488878FA*

Boasting a grand total of 42 hexadecimals, I doubt many people can memorize this by heart. To send crypto to wallets like mine, you would have to copy-paste the address.

On the other hand, addresses like Arthaus.eth (Gami’s ENS) contain multiple wallet addresses with this hexadecimal. The catch is that ENS allows us to give our wallets a nickname, allowing others to transfer digital assets by keying in this name.

With ENS, wallet addresses become names, allowing everyone to transact seamlessly without fear of mistyping that one pesky hexadecimal. By combining all of your addresses under this Ethereum name, you won’t have to keep track of multiple wallet keys anymore, a great convenience to disorganized people like myself.

### How Does ENS Work?

Before we get into the tech side of things, it’s good to note that ENS is decentralized. Since ENS (as an organization) is open-source and run by a [DAO](/daos-revolutionary-or-crypto-chats/), there is no single point of failure for the service. Truly, made on and run through the blockchain!

ENS relies on two Ethereum smart contracts; namely, the ENS Registry and Resolver.

#### ENS Registry

The ENS Registry manages a list of all the domains and subdomains in their ecosystem, containing core data about them. This includes…

- Owner of Domain
- Resolver of Domain
- Records of Caching Times for Domains

The registrars here are smart contracts that own domains and distribute subdomains to users. In traditional DNS, this would be a centralized company as we mentioned earlier, but in the world of ENS, this is automated by smart contracts of the blockchain.

Users usually start out with a domain, buying it off ENS or at auctions, all hosted and managed by smart contracts. Subdomains are still rather “useless” at this point, but some DApps are recognizing their potential as a login code to complement the domain. For now, we can say ENS Domains are like Domain names, while subdomains are the web3 equivalents of URLs.

Back to the ENS Registry, its main purpose is to put the domain name and the resolver together, a smart contract map. You can check out ENS’ own [documentation](https://docs.ens.domains/contract-api-reference/ens) for a deeper dig into the ENS Registry.

#### Resolver

The resolver is the smart contract that does the heavy lifting, or what we call converting the domain names into crypto addresses. As long as the contract meets the requirements for the relevant EIP standard, it can play the role of a resolver.

The process of a transaction goes through the ENS registry to seek for the resolver responsible for the domain name, and then to the resolver for it to de-code (or en-code) the address.

This way, everything is automated through the use of smart contracts, making the transaction process simple for non-techies. Just think of the resolver as a matchmaker, connecting your domain name to your wallet address, website, etc.

Dive in [here](https://docs.ens.domains/contract-api-reference/publicresolver) for greater detail on how resolvers work with ENS.

### Is ENS Really Necessary?

Okay… the process of transacting with an ENS domain looks cool, but is it truly necessary? After all, can’t we just copy-paste the address of our recipients?

Truth be told, ENS is helpful, but not necessary, at least at this point in time. While ENS could save on copy-pasting, compiling all your addresses, and making your domain look more professional in general, the cost may outweigh the benefits.

However, ENS domains are good in the sense that they help prevent malware attacks on your wallet. A few years back, a [notorious computer malware](https://techcrunch.com/2018/07/03/new-malware-highjacks-your-windows-clipboard-to-change-crypto-addresses/) targeting crypto wallet addresses was on the rise.

Instead of trying to crack the almost infinitely impossible to break private keys, scheming hackers ran malware to change the copied wallet address in infected computers. Upon copying and pasting what you thought were the recipient’s public keys, the malware would secretly change this address to the hackers’ own.

With ENS domains, this hack is virtually ineffective. But hey, you should still be wary every time you exchange crypto funds!

## Utility of ENS Domains

We’ve been talking so much about wallet management and consolidation of addresses, so is this all to ENS? While still a project in its infancy, ENS Domains actually have more use cases than meets the eye.

Here are some already existing and possible future implementations of ENS Domains.

### ENS Domain X .Com Domains

With this insane announcement back in late August 2021, the hype was on for ENS.

The update allowed ENS Domains to be fully compatible with namespace DNS domains, which meant that .eth addresses could be incorporated into .com websites. While this may seem like a blow on web3, the ENS organization has never been about replacing DNS, but instead, helping accelerate the naming service in the web3 world.

By importing your web2 website into ENS, records for ENS services like accepting payments in cryptocurrencies would be enabled on your site. Through this implementation, ENS domains received a well-deserved push, attracting thousands of website owners to the web3 community.

### Building DApps

ENS smart contracts also support developers to build DApps (Decentralized Apps) which understand and accept ENS domain names.

ENS crafted a [document](https://docs.ens.domains/dapp-developer-guide/ens-enabling-your-dapp), detailing a step-by-step guide on how DApp programmers should integrate ENS domain names into their DApp. Features include tracking ENS Domain names, allowing users to register their names and corresponding addresses, etc.

### NFT Flipping

Perhaps one of the most exciting prospects for the future, we foresee ENS Domain names being flipped as NFTs. It’s no secret: NFTs are in their prime. With billions of dollars worth of crypto flowing in and out of the NFT market, there are lots of opportunities to make a cash horde from them.

ENS Domains use ERC-721 NFTs to display an address, storing the wallet information which is managed by the registrar (.eth contract). Since NFTs are tradeable assets, we can technically buy and sell domain name NFTs in the marketplace!

Initially, popular domain names were auctioned off and the owners could do whatever they wanted with them. Creating subdomains, integrating DApps, heck, even renting it out to others! Nowadays, you can rent domain names from ENS, bidding on them if they’re especially popular.

### $ENS, DAO, Partnerships

This section is dedicated to some features of ENS, rather than the utility of ENS Domains.

When the ENS token and DAO were first announced back on November 8, 2021, the entire Ethereum community went wild. Well, perhaps not the entire community, but certainly early adopters of ENS Domains.

This was due to their $ENS airdrop announcement, the native governance token planned for ENS DAO. An airdrop of 25% of $ENS tokens was prime for the taking but only awarded to those who have used the service before 31st October 2021.

While the ENS protocol is largely decentralized, a governing body was still needed to manage the funds and way forward for the project. Voting for what’s known as the ENS Constitution, members of the DAO would vote for .eth domain prices, governing protocol parameters, and especially how funds from the treasury will be used.

If you’re wondering how to participate in the ENS DAO, here’s a helpful [mirror post](https://ens.mirror.xyz/-eaqMv7XPikvXhvjbjzzPNLS4wzcQ8vdOgi9eNXeUuY) by ENS detailing their current scope.

Also, ENS has been hard at work on building relationships with different web3 parties. With 475 available integrations including wallets like Metamask and Trust Wallet, apps such as Uniswap and Etherscan, as well as browsers Brave and Cloudflare, the ENS solution has truly pervaded the web3 community.

## How to Get Your ENS Domain + Price Guide

To those who have set their minds on purchasing an ENS domain, here’s a quick guide.

- **Navigate to the site + Type In Your Domain Name**

Click this [link](https://app.ens.domains/) to reach the ENS App Registration page. Alternatively, you can type <https://app.ens.domains/> in your browser. The ENS App will prompt you to connect the wallet you’re using for payment.

Then, type in your ideal domain name.

- **Request To Register Your Domain**

You will be directed to a page showing the availability of your domain name. If someone else already owns it, you cannot register with that name. Go back to step 1 and type in another name.

If the domain name is still available, then lucky you! Toggle the slider to choose the number of years you wish to own the domain name; it’s invalid once your rent expires. Take note of the Ethereum gas fees as well — Domain names only cost $5 a year, but gas fees can reach highs of a hundred bucks!

Finally, make sure you have enough funds in your wallet before pressing the “Request to Register” button.

- **Confirm registration and wait**

After doing so, your wallet will open and request your confirmation. Check all the details once again, and if everything is good, confirm the transaction. You’ll have to wait a while before the transaction is confirmed, it takes 2 blocks for ENS to acknowledge receipt.

- **Complete!**

Click the “Register” widget and your wallet will re-open. Then once the transaction is confirmed, your registration is officially complete. Congrats on getting your very own ENS domain!

## ENS vs Competitors

Up till now, we have been focusing specifically on ENS. But just like any successful service, copycats will follow. With potentially cheaper domain registrars than ENS’ .eth smart contract, which project should you follow?

### [Unstoppable Domains](https://unstoppabledomains.com/)

Unstoppable Domains is an up-and-coming domain name registrar in the web3 industry, with one advantage over ENS. Domains on their platform are owned: for life. The lifetime ownership, accompanied with potentially cheaper plans, make pick Unstoppable Domains over ENS.

While both services are similar in various aspects, one difference is Unstoppable Domains’ TLD. They own what’s called Top Level Domains, basically extensions like “.crypto”, “.bitcoin”, you get the gist. When you register for a domain, you will get the name with these extensions.

Unlike Unstoppable Domains which is seemingly “hogging” these top-tier TLDs, ENS chooses to stick to their trademark .eth extension. For reasons like social coordination, expanding the namespace on ENS, and just sticking to the native ENS extension, they focus more on vertical than horizontal integration.

Here’s an in-depth [read](https://medium.com/the-ethereum-name-service/why-ens-doesnt-create-more-tlds-responsible-citizenship-in-the-global-namespace-7e66658fe2b1) on ENS’s decision to stop at .eth.

### [Handshake](https://handshake.org/)

Handshake is taking a slightly different route from ENS. Unlike ENS, Handshake doesn’t depend on another blockchain (such as Ethereum) but instead is focusing on becoming the root server for domain names.

It is a decentralized P2P naming protocol where users authenticate the root zone of the DNS, which sets it apart from the centralization of TLDs in some naming providers. So I guess if you could call Unstoppable Domains a CEX, Handshake would be a DEX.

## Summary

Wow, this has certainly been a pretty long read! At the end of the day, all I can say is that domain naming services like ENS are here to stay. If .com can be so powerful, why not .eth?

Hope you learned more about ENS from this article… after all, who knows if it will be the DNS of web3.0?