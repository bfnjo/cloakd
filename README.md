<p align="center">
  <img src="./assets/images/logo.png" alt="CLOAKD Logo" width="300" />
</p>
<h1 align="center">CLOAKD</h1>
<p align="center"><em>Dress your best.</em></p>
 
## Milestone I Submission
 
**Team Name:** Cloakd
 
**Proposed Level of Achievement:** Apollo 11
 
---

## Proof of Concept
 
---
 
## Motivation
 
For most people, us included, getting dressed is stressful. You stand in front of a full wardrobe and somehow still feel like you have nothing to wear. Cloakd reframes that daily moment as something expressive and enjoyable instead of a chore and removes the anxiety from picking out an outfit.
 
Most people wear fewer than a third of the clothes they own. The average clothing item gets worn just 7 times before it's thrown away, and 40% of what we buy never gets worn at all. People keep buying new clothes and feeling like they constantly have nothing to wear not because they lack options, but because they can't see what they already have. Cloakd solves a **visibility problem, not a shopping problem.**
 
Fast fashion is one of the most polluting industries in the world, but telling people to "buy less" doesn't work. Cloakd takes a different approach by making it fun, social and rewarding to get more out of the clothes you already own. The cost-per-wear tracker and wardrobe utilisation score turn sustainability into a game rather than a guilt trip.
 
We also wanted to build something that brings people together around style in a way that feels real, and to learn how to take an idea from nothing and turn it into something real while picking up software engineering skills along the way by building something we actually care about.
 
---
 
## Vision
 
Cloakd will be a mobile app for iOS and Android, built with React Native and Expo. It lets users digitise their entire wardrobe and receive daily outfit suggestions built entirely from clothes they already own, filtered by real-time weather and occasion.
 
The app is designed around a simple daily loop: open the app, get a suggestion tailored to today's weather and occasion, log what you wore, and watch your wardrobe come alive through stats, streaks and community sharing.
 
Ultimately, we envision Cloakd as the app people reach for every morning, the one that changes how they relate to the clothes they already own, reduces mindless overconsumption and makes getting dressed something enjoyable.
 
---
 
## User Stories
 
1. As a person who wants to dress better and improve my style, I want to be able to visualise and plan my outfits.
2. As a person who struggles with deciding what to wear, I want to be able to receive outfit suggestions for the day.
3. I want to be able to dress well and look stylish no matter the weather, even if it is a blazing hot day or a rainy day with thunderstorms. I also want to be able to dress appropriately for the occasion, such as date nights, formal occasions or gym days.
4. I want to be able to take inspiration from others' outfits and share my own.
5. As a frugal person, I want to be able to track how much value and how many wears I am getting out of my clothes.
6. I want to keep track of the outfits I have worn each day so that I do not repeat outfits too frequently. 
---
 
## Scope of Project
 
Cloakd is a mobile app that lets users photograph and catalogue every clothing item they own, then suggests daily outfits built entirely from their existing wardrobe — filtered by real-time weather and occasion. Users log outfits to a calendar, track cost-per-wear statistics, build daily streaks, and optionally share looks to a community feed.
 
Cloakd's features are outlined in the following sections, organised by the following tags:
 
- **[Proposed]** — features targeted for completion
- **[Current Progress]** — what has been built so far
---
 
## Features
 
### Virtual Wardrobe
 
**[Proposed]**
 
Users add their clothes by uploading a photo of each item and tagging it with basic details such as colour, category, subcategory, material, brand and purchase price. The wardrobe screen displays all items at a glance, filterable by category, colour or occasion in one tap. Items that have not been worn for 30 or more days are surfaced automatically to encourage rediscovery.
 
**[Current Progress]**
 
Users can save clothing items with basic tags (category, subcategory, colour, material, brand and purchase price) to the database via Supabase. The wardrobe grid view is functional and displays all saved items. Filtering and the 30-day rediscovery nudge have not yet been implemented. Image capturing has also not yet been implemented.
 
---
 
### Outfit Builder
 
**[Proposed]**
 
The outfit builder suggests outfit combinations built entirely from clothes the user already owns. The user is presented with a top, bottom, outerwear, footwear and accessories slot. Each slot is independently swappable, meaning the user can keep what they like and shuffle individual pieces. Weather and occasion filters are applied before suggestions load. Finalised outfits can be saved and logged.
 
**[Current Progress]**
 
The outfit builder feature has not been made yet.
 
---
 
### Occasion and Weather Filter
 
**[Proposed]**
 
The filter asks the user where they are going and what they will be doing. It uses real-time weather data from the Open-Meteo API for the user's location and filters the wardrobe to suggest outfits suitable for the conditions and occasion. Supported occasions: casual, office, formal, outdoor, date night.
 
**[Current Progress]**
 
Open-Meteo API integration is complete and returning live weather data for the user's current location. The logic to filter wardrobe items by temperature range and occasion tag has not yet been connected to the outfit builder.
 
---
 
### Outfit Calendar
 
**[Proposed]**
 
The outfit calendar acts as a personal style diary. Every time a user logs an outfit, it is recorded against the specified date. Users can look back to see exactly what they wore and when. Logging an outfit automatically updates the wear count and cost-per-wear for every item in the outfit. The calendar also surfaces pieces that have not been worn in a while to encourage rediscovery. Users can also edit and delete outfits that have been logged previously.
 
**[Current Progress]**
 
The calendar has been created and can be navigated by month. Logging an outfit to a date is functional and stored in the database. Automatic updating of wear counts on log is complete. Visual indicators for logged days as well as current date are displayed on the calendar grid. Clothing items that have not been worn in a while have not been set to be suggested yet.
 
---
 
### Share Outfits
 
**[Proposed]**
 
Users can opt in to post outfits to the Cloakd community feed. Privacy is the default, meaining that a user's wardrobe stays invisible unless they choose to share the outfits they build from it. Shared posts display only garment categories and colours, never purchase prices or private tags. Other users can like and save posts to their inspiration board.
 
**[Current Progress]**
 
The community feed has not been built yet.
 
---
 
### Cost-Per-Wear Tracker
 
**[Proposed]**
 
When adding clothing items, users input the purchase price. Cost-per-wear is calculated as price divided by the number of wears and updated automatically each time the item is logged as part of an outfit. The wardrobe view surfaces this figure alongside wear count for each item, giving users a clear picture of the value they are getting out of their clothes.

**[Current Progress]**
 
The cost-per-wear tracker has been fully built. Users can easily see the number of times they worn each piece of clothing and the cost-per-wear of it in the wardrobe page. Adding a clothing item to an outfit and logging it in the calendar automatically updated the wear count and cost-per-wear of that specific clothing item. There is also a stats page which shows users their best value clothing item (the one with the lowest cost-per-wear) and other statistics like their average cost-per-wear and most worn item.

---

### Streak System

**[Proposed]**

Every day a user logs an outfit, their streak grows. Missing a day resets the counter. Badges unlock at 10-day, 50-day and 100-day milestones to keep users motivated to open the app daily.

**[Current Progress]**

A basic streak counter has been implemented when a user logs an outfit in the calendar. The streak counter on the home page is yet to be updated. The badges have not been made nor has the badges page been built.

---
 
### Trending Outfits
 
**[Proposed]**

A weekly feed surfaces the most popular community outfits, ranked by an algorithm combining recency, saves and wardrobe diversity. This gives users fresh inspiration and rewards creativity with existing clothes over purchasing new ones.

**[Current Progress]**
 
The trending outfits algorithm has not been built yet.

---
 
## Timeline and Development Plan
 
---
 
## Database Schema
 
---
 
## System Architecture

---
 
## Tech Stack
 
---
 
## Work Log
 
Refer to project log: *(link to be added)*
 
---
 
<p align="center"><em>Dress your best. &nbsp;·&nbsp; Team Cloakd</em></p>
<p align="center">Benjamin Jieming Phua &nbsp;·&nbsp; Phua Ching Liang, Marcus</p>