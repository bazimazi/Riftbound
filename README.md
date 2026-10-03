# Riftbound — Spellcraft

Version 9 adds three progression-gated spell slots, 72 class spells and 72 mechanical mastery talents. All twelve outcasts now have 396 connected permanent talents (33 per class), alongside 30 run evolution recipes and 44 Codex pages. Each specialty gains two spells: a utility technique and an advanced battlefield tool. Talent pages switch between Roots and Spells; the new spellbook lets players build a three-spell loadout with keys 1–3. Existing purchases and saves are preserved.

Version 8 introduced Vesper the warlock, Fen the beastwarden, Solace the cleric, Orin the totemcaller, Kestrel the wind monk, and Morrow the grave knight. [Class research, mechanics and unlocks](docs/CLASS-DESIGN.md) document those original classes, based on Blizzard's primary class-design sources. [Sprite assets and exact ImageGen prompts](assets/ARCHETYPE-ART.md) document the locally bundled artwork.

Warlocks start with an imp and guardian and harvest souls for temporary demon pacts. Beastwardens coordinate crossbow marks with a bonded wolf. Clerics convert landed radiant attacks into faith and gated healing. Totemcallers place short-lived fire, storm and tide circles. Monks build qi through a three-strike melee combo; grave knights spend combat-earned runes on a grip and sustain. Companions have health, recovery time and population limits. Late pressure and Reaper immunities remain active. Each new class also has independent research, exclusive Codex pages, legacy milestones, 20/40 skill transformations and 100/200 class forms with R/F abilities.

Class levels persist across expeditions; run ranks reset. Skills evolve at permanent training levels 20 and 40. Rare map catalysts and increasing spark costs gate stronger skills, with further training continuing after the second evolution. Class forms unlock at 100 and 200 and add hero-specific active skills on R and F. Banked version-six mastery seeds class XP without granting free purchases or forms. [Combat art and generation prompts](assets/COMBAT-ART.md) document the existing animated art.

## New outcasts and panels

**Rook** unlocks after banking **three Warden defeats** across expeditions. His Runestone hammer sweeps nearby foes; standing builds poise for a crushing shockwave, and every fifth kill restores a small shield. Bastion Slam grants shield and briefly stuns nearby enemies. His three paths develop hammer reach, shield defense, or retaliation. He is slower and must fight close to enemies.

**Lumen** unlocks after banking **four unique Ancestral memories** across heroes and a **four-minute survival record**. Her Crescent bow fires piercing arrows; standing charges a stronger volley that consumes focus. Moonfall launches an arrow storm. Her three paths develop charged shots, piercing critical volleys, or mobility and moon fields. Her low health makes positioning essential.

All twelve heroes have thirty-three permanent talents, two evolution recipes, three exclusive Codex pages, independent mastery/research, and unique legacy milestones. Locked portraits are selectable previews with progress meters; they cannot start expeditions until every condition is met. Achievement progress persists on death or banking. Existing achievement totals immediately count toward unlocks.

Dialogs use page arrows for collections, a mobile section selector, and a help overlay that returns focus when closed. Desktop talent pages show three connected paths; phones use a path selector. Build tabs separate stats, artifacts and damage sources. No options are removed by pagination; 1–3 still selects the numbered level/artifact offers. The phone sanctuary remains a normal single scrolling page without nested panels.

## Play

Requires Node.js 20 or newer. No installation or build step is needed to play.

```powershell
cd C:\dev\games\riftbound
npm start
```

Open **http://localhost:4186**. If the previous game is already running, **refresh the browser** to load the update. The existing local save is migrated automatically. Do not open index.html through `file:`; ES modules require HTTP. The server binds only to the local machine. Set `PORT` to use another port.

| Action                    | Controls                        |
| ------------------------- | ------------------------------- |
| Move                      | WASD / arrow keys / touch stick |
| Dash                      | Space / Dash button             |
| Hero skill                | Q / skill button                |
| Permanent class talents   | T / Talents button              |
| Progression workshop      | V / Progress button             |
| Evolved class skill       | R / unlocked ability button     |
| Final-form ultimate       | F / unlocked ability button     |
| Equipped class spells     | 1 / 2 / 3 / spell buttons       |
| Inspect build             | B / Build button                |
| World map and waypoints   | M / Map button                  |
| Run evolution recipes     | Progress → Run recipes          |
| Commune with nearby altar | E / altar button                |
| Pause                     | Escape / pause button           |
| Choose level upgrade      | 1 / 2 / 3 / click               |

Weapons attack automatically. Sound can be enabled with the music button. Menus pause the expedition. Gold edge markers lead to caches; violet markers lead to altars; cyan markers lead to reliquaries. The minimap shows nearby threats and objectives. Presentation settings in the lobby or pause menu control motion and shake, critical damage numbers, and the minimap.

## Spellcraft progression

Open Progress → Spells. Click a locked slot to see its milestones and exact catalyst cost; unlocked slots can hold any learned spell from that class. Click a spell, then Equip 1/2/3. Clicking its checked equip button removes it. Loadouts are fixed when an expedition starts: changes during a paused run configure the next expedition and never reset live cooldowns.

| Slot | Class level | Banked Wardens | Sparks | Cores | Runes | Sigils |
| ---- | ----------- | -------------- | ------ | ----- | ----- | ------ |
| 1    | 30          | 2              | 8      | 4     | 2     | 0      |
| 2    | 75          | 6              | 18     | 8     | 4     | 0      |
| 3    | 150         | 12             | 36     | 12    | 8     | 1      |

The first spell in each specialty requires class LV25, four invested path points and two ranks in its root; learning costs two talent points. Three mastery ranks start at LV45, require six invested points and cost one point each. Advanced spells require LV85, ten invested points and two ranks in the first spell's mastery, costing three points; their three mastery ranks start at LV110 after thirteen invested points. These use the existing scarce permanent talent budget—there are no free spell points.

Cinder plants combustion seals, dashes through burning wakes and calls falling suns. Briar grows rooting gardens and moving venom barrages. Nyx combines piercing knife fans, teleport strikes and faster living echoes. Volta chains lightning through pylons and controls prey with gravity wells. Rook charges through crowds and builds seismic pillars; Lumen pierces packs with comet beams and creates lunar refuges. Vesper calls temporary demons through gates, curses crowds and detonates soul lances. Fen coordinates marked prey with alpha wolves, spectral stampedes and snares. Solace uses landed smites to power healing springs and holy processions. Orin renews specialized totems and calls an elemental council. Kestrel combines flowing charges, crane allies and moving palm barrages; Morrow grips packs into blood fields and calls plague ghouls.

Mastery changes projectile counts, piercing, reach, exposure, meteor impacts, field pulse count, travel distance and ally strength/lifetime. Build skill power, area, duration and cooldown bonuses apply. Spell cooldowns cannot fall below half their authored base; global flat and percentage skill refunds affect them too. Shields cap at 90; healing/resource generation requires landed non-Reaper attacks and is gated per spell. Friendly ground glyphs show exact areas and approaching meteor impacts. Spells have windups, class-specific higher-tier visuals and release sounds, freeze in menus and cancel on lethal damage. Eight persistent fields, eight companions, five imps and three echoes bound the new systems. Reapers retain their damage resistance and control immunity.

`npm test` covers spell progression, migration, all 72 combat behaviors, mastery changes, recovery, healing gates and Reaper immunity. `npm run test:spells` audits the new UI across five desktop/phone sizes, purchases all slots through the real UI, equips spells and casts through keyboard/touch controls.

## Exploration and permanent memories

Each expedition rolls fourteen landmarks with a new mix of item types and new positions. Every type appears, with two to four distant Ancestral memories and up to three of each temporary treasure; Elder seals are less common. Treasures are spread across the realm, inside its boundaries and away from the starting point. War idols grant +8% damage; Moon springs grant +8% skill recovery; Wind shrines grant +6% movement and 25 pickup range; Stone hearts grant 30 shield and heal 15; Elder seals enable evolutions. Seals and memories have guardian ambushes. Walk over a landmark to collect it. Its location stays fixed for that expedition, and it does not despawn when you travel. The minimap shows nearby threats, boundaries, treasure directions and a waypoint; open M and click a destination for a route.

Each realm has four unique Ancestral memories per hero, twelve per hero total; a random two to four appear in each expedition, in new locations. Existing collections keep the same memory identities. Bank the run to keep discoveries. Each adds 0.5% weapon and 0.75% skill potency; every three adds 3 health. At 4, 8 and 12 memories, heroes unlock their own small permanent trait, skill technique and legacy milestone: heat retention/fire trails, longer seedlings/living shields, faster momentum/shadow echoes, or overload shields/cooldown feedback. Codex → Memories records each hero's collection. Revisited memories give eight embers without adding more permanent power.

## Beacon encounters and artifacts

A cyan reliquary appears from 90 seconds into a run. Approach and press **E** (or tap the prompt) to start an optional defense. Stay within its 110-unit ring to charge it for 18 seconds within a 38-second deadline. Leaving drains progress; guardian waves arrive every seven seconds. The normal horde continues attacking. Unused beacons expire, and failed defenses offer another chance later.

Success grants embers and a choice of three artifacts. Bind up to **four artifacts per run**, each with **three ranks**, or salvage the offer for 25 embers. Once all four are mastered, successful defenses instead grant two Ruin ranks and a shard (or Soul skill ranks when passive slots are full and Ruin is unbound). Choices and banking are atomic. Discoveries are recorded in **Codex → Artifacts** only when the expedition is banked.

| Artifact          | Effect per rank                                                |
| ----------------- | -------------------------------------------------------------- |
| Borrowed time     | 12% faster active recovery, diminishing returns                |
| Bloodglass crown  | +22% damage, −8% max HP                                        |
| Windborne         | +15% arsenal speed for four seconds after a dash               |
| Obsidian heart    | +12% max HP, −3% movement speed                                |
| Astral grimoire   | +12% XP and an extra reroll on claiming                        |
| Worldseed         | Active skills plant one attacking seedling                     |
| Echo of the veil  | Skills create a knife-throwing shadow lasting 3 + rank seconds |
| Pocket sun        | Eight-second pulse dealing (24 + 3 × level) × rank damage      |
| Storm in a bottle | Dash emits eight bolts dealing (18 + 3 × level) × rank damage  |

## Expedition contracts

Select a contract before entering: defeat a horde, defeat Wardens, or survive. Each has its own escalating tier and rewards. Goals are locked for the current run; completion pays extra embers and sometimes shards when banking, then unlocks the next tier. Failed contracts have no penalty. The compact HUD tracks the selected goal.

Press **B** to inspect current combat stats, equipped artifacts, and the actual damage dealt by each source. The inspector pauses the game and returns correctly to either play or the pause menu. Damage totals exclude overkill.

## Twelve heroes, thirty-six talent branches

Each hero has three connected permanent talent trees with seven nodes each: five-rank roots, three-rank side specializations, one-rank branch mechanics and a final ultimate. Earn one permanent point at every fifth class level, every ten banked Warden kills for that hero, and every four unique memories. Prerequisites, class-level gates and points invested in the same branch enforce specialization. Click an icon to compare its current and next-rank effects, then Learn to spend points. Inspector values and tooltips update immediately after purchases and respecs, including armor curves, pierce counts and free affinities. Purchased talents persist across expeditions and affect actual hero mechanics. Paid respecs return every invested point; later respecs cost more embers, and large resets require runes.

Seventy-two side talents add reactive combat mechanics: five-hit impact bursts, critical echoes, weapon-hit skill recovery, piercing skill volleys, lingering skill fields, dash knives, dash wards, low-health counterblasts and exposing tough enemies. Each rank increases its actual effect. Basic side bonuses now grant 5% weapon power, 6% skill power, 6% max health, 4% movement speed or 1.5% critical chance per rank. Scarce points buy meaningful build decisions; point earning rates and prerequisites are unchanged.

Every branch ends in one of **36 class-specific ultimates**, requiring class level 75, twelve points in that branch and its preceding capstone. Learn for two points, then **Equip** one learned ultimate; the gold icon identifies the equipped choice. Press **Q** or tap the existing skill button to cast it alongside the normal class skill when ready. Ultimates last six to twelve seconds and share a forty-second cooldown, which freezes in menus and cannot be reset by switching branches. Examples include a mobile seedling garden, a lightning storm, overlapping earthquakes, temporary infernal guardians, an alpha-wolf pack and a moving totem council. Existing learned final talents automatically gain their new ultimate, and saves keep the equipped choice. Class-form skills R and F remain separate.

Run upgrades still come from collecting XP and choosing one of three offers. All twelve heroes awaken their signature at rank five during that run, adding distinct combat mechanics. Talent capstones, build recipes and permanent training stages provide further specialization. Pets gain damage from early signature upgrades, pursue targets and keep pace with movement upgrades; permanent pets recover after eight seconds and can be mended or revived by their class skill. Wolves cleave from the start and gain wider awakening/command cleaves; guardians hit bounded groups and each imp bolt bursts independently once, including piercing bolts. Pack command revives the whole pack, prioritizes marked prey and pounces in broad areas without stacking overlapping pounce damage. Its commanded cleaves strike up to seven additional foes; Beast cleave adds reach and splash potency. Demon pact ruptures close threats and a distant crowd, empowers guardian cleaves and enlarges each imp's curse-spreading blast. Implosion sends expiring imps' final blasts toward nearby prey. Pet areas inherit area upgrades and show their actual reach. Temporary ultimate pets are stronger, visibly marked and expire; companion and projectile limits remain. [The pet AoE review](docs/PET-AOE-REVIEW.md) records the existing kits, gaps and balance probes. Existing Elder-seal recipes remain available through Progress → Run recipes at run level twelve and three minutes. Run weapon ranks remain unlimited and are separate from permanent skill training.

| Hero    | Paths                                            | Branch mechanics                                                               |
| ------- | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| Cinder  | Ash alchemist, Sun herald, Undying flame         | Burning death explosions, heat-powered sun pulses, one-time rebirth            |
| Briar   | Wild gardener, Thorn sovereign, Lifebinder       | Triple-shot garden, strangling vines, shields and healing from spent seedlings |
| Nyx     | Crimson oath, Veil dancer, Silent verdict        | Healing from bleeding kills, shadow allies, low-health executions              |
| Volta   | Storm architect, Living circuit, Gravity heretic | Lightning storms, skill-cooldown feedback, damaging gravity vortex             |
| Rook    | Stonebreaker, Bulwark, Oathkeeper                | Stone shards, brief invulnerability, conditional last-stand healing            |
| Lumen   | Moonwatch, Fletching, Night runner               | Heavy arrows, repeated volleys, lingering moon fields                          |
| Vesper  | Affliction, Demonbinding, Ruin                   | Spreading curses, additional pact imps, expiring-imp explosions                |
| Fen     | Bond, Tracking, Traps                            | Beast cleave, stronger marked prey damage, additional snares                   |
| Solace  | Grace, Discipline, Judgement                     | Overflow shields, full-faith protection, radial dawn bolts                     |
| Orin    | Embers, Tempest, Tides                           | Extra fire bolts, multi-target storm pulses, tide elementals                   |
| Kestrel | Wind, Mist, Iron                                 | Wind bolts, empowered combo windows, full-qi protection                        |
| Morrow  | Blood, Rime, Grave                               | Rune-spent healing, frost lances, temporary grave ghouls                       |

Up to three of the six secondary relics—Astral blades, Hollow bell, Wisp lantern, Winterglass, Falling star, and Gravewind—can combine with hero talents. Four passive slots force build decisions; owned upgrades remain claimable after filling slots. All thirty evolution recipes appear in Codex → Recipes, and Progress → Run recipes crafts eligible ones using a recovered seal. Four automatic synergy recipes are listed in the codex. Rank 10 unlocks stronger critical orbit strikes, slowing bell pulses, piercing wisps/scythes, freezing frost and meteor fire patches. Active skills gain power and faster recovery each rank; rank 5 adds hero-specific fire, healing garden, slowing veil, or gravity fields. At run level 20, the Skills panel can invest spare run resonance for +3% damage per point. Run resonance is earned every eight run levels, every twenty weapon ranks, and from Wardens/altar tributes. It is separate from permanent talent points. Enemy XP drops remain stable throughout a run. XP requirements grow as 10 + 4.8 × level^1.3. Common damage, haste, critical and XP bonuses are smaller than earlier editions. General run upgrades remain uncapped; speed, armor, and cooldown improvements have diminishing returns.

## Skills, catalysts and class forms

Training sparks are earned on banking: one per two run levels (up to thirty) plus one per Warden (up to three). Permanent class XP comes from kills, elites, Wardens and survival; its increasing thresholds are independent of run-XP multipliers. Early skill training costs one to three sparks per level. At level twenty, evolve with sparks and the skill's required catalysts. Evolved ranks cost at least four sparks and a specific catalyst per rank. A second evolution at skill level forty requires class level one hundred and a rare sigil. Mythic ranks continue with logarithmic power gains and accelerating costs; later milestones also require sigils. Trained relics apply only when that relic is drafted, preserving the three-relic limit.

Every skill's description reflects its current base, evolved or mythic stage. The Evolve button previews the next stage in its tooltip. All twelve classes have authored signature and active descriptions; the six shared relics also describe their actual training-stage effects.

Heart cores, Ancient runes and Sovereign sigils appear randomly from about a minute into an expedition, at distant reachable positions inside the realm. A maximum of four are active, guarded and marked on the minimap/world map. They expire after roughly two minutes. M offers direct tracking buttons. Sigils can appear after four minutes and are much rarer. After four banked expeditions of at least four minutes without collecting a sigil, one is guaranteed to appear in the next qualifying expedition; its location is still random, guarded and expiring. Walk over an item to collect it; death or banking keeps collected materials, while abandoning the page loses unfinished-run rewards.

First class form: class level one hundred, evolved signature and active skills, six banked Warden victories, thirty sparks, eight cores, four runes and one sigil. Final form: class level two hundred, mythic signature and active skills, twenty Wardens, sixty sparks, sixteen cores, ten runes and three sigils. Form II unlocks R; Form III unlocks F. All 24 evolved appearances change the outfit palette and add class-specific regalia: phoenix wings, living antlers, void blades, electric coils, titan armor, moon wings, demon horns, beast mantles, seraph feathers, spirit stones, crane wings and rime crowns. These follow every walking, attacking and casting pose, and appear in the roster, sanctuary portrait and class previews. Sprite alpha and foot anchors are preserved; the appearance also works with reduced motion.

Form II grants +25% weapon power, +35% skill power, +20% health, +10% attack speed and 8% damage reduction. Final form grants +55% / +75% / +40% / +20% and 14% reduction instead. Each class gains a recurring combat trait that strengthens at the final tier: fire eruptions, guardian seedlings, veil echoes, lightning circuits, runic shockwaves, astral volleys, soul ruptures, pack cleaves, healing dawn pulses, totem renewal, jade flurries or grave pulses. Heals require nearby landed attacks. Vesper's evolved court has two then three permanent imps plus the guardian; Fen gains two then three permanent wolves; Orin and Morrow gain one then two permanent elementals or ghouls. Evolved companions and totems also deal +25% / +55% damage, and pets cleave larger groups.

R and F have stronger, wider class-specific effects and base cooldowns of 20s and 52s, reduced by permanent active training to floors of 10s and 30s. R grants +20% all damage for 8s and restores 2s of Q cooldown; F grants +35% for 12s and restores 4s. Their surges do not stack, and R cannot extend F's stronger power. Infernal retinues, primal packs, elemental councils and grave legions summon empowered temporary allies. Orin's F empowers totems for 16s, surviving their renewal without stacking indefinitely. Additional actives charge before release, freeze in menus and cancel on death. Reaper resistance, bounded entity counts and exponential late pressure remain.

Skill recovery now applies across Q, R, F and equipped talent ultimates. Forge Focus, run Focus, active ranks, map Flow and Hourglass all enter the same recovery calculation; codex cooldown penalties apply consistently too. Q retains a 2.5s floor, R 10s, F 30s and talent ultimates 20s. Recurring transformation traits can recover up to twice as fast; reactive defensive talents retain a 5s minimum gate. Global hit/kill/overload/dash refunds reduce all four cast timers, while transformation releases explicitly restore Q only. Recalculation never clears an existing cooldown and specialization changes cannot bypass it. Sustained damage ticks and short anti-recursion gates keep their authored cadence. Ability tooltips show actual buffed recovery in runs and base recovery in the sanctuary.

Active releases have twelve class-specific visual themes, with increasingly powerful evolved and ultimate tiers: fire columns, rising roots, void blades, storm pillars, seismic shards, moon lances, soul portals, pack claws, radiant beams, elemental circuits, jade winds and rime crystals. Ground seals render below actors while rising energy renders above them. Talent ultimates retain visible class glyphs throughout their active fields; defensive wards and summoned retinues have distinct shields and portals. Spell projectiles gain brighter trails, and hunts use piercing lances rather than generic lightning. Cached pixel seals and light textures keep these effects bounded; reduced motion uses static patterns and fading light. Class-specific cast chords and deeper ultimate sounds accompany release when sound is enabled.

Four additional run passives provide area, duration, shield recovery and elite damage. They share the existing four passive slots and use diminishing gains.

With a representative strong expedition earning about one thousand class XP, class one hundred takes roughly forty-eight banked expeditions and class two hundred about one hundred seventy-six. These are mathematical estimates, not measured player completion times; catalyst collection and skill investments add separate constraints.

## Persistent progression

**The forge:** 24 upgrades across Arsenal, Survival, Wayfinding, and Occult. These affect damage, criticals, attack speed, blast radius, knockback, health, armor, regeneration, level-up healing, starting shields, revival, experience, dash recovery, speed, pickup reach, rerolls, banishes, currency, healing pickups, skill cooldown, effect duration, codex bindings, and starting run resonance. Standard crafts have 20 ranks with diminishing stat gains and escalating prices. Rare crafts have a few ranks and require forge investment, Warden milestones, and/or rift shards. Numeric bonuses are bounded to preserve difficulty.

**Hero research:** a fifth forge tab offers Signature, Soul skill, Reliccraft and Insight. Gains use rate × log2(1 + rank), with rates of 4%, 6%, 4% and 2%. Each rank still adds power, with diminishing returns instead of large linear permanent bonuses. Every hero has independent research with no gameplay rank cap. Ember prices rise as 1.4 × base × (rank + 1)^1.5, and every fifth purchase requires Warden shards. Defensive forge bonuses stay bounded; offensive research lets you prepare for higher oaths.

**The codex:** 26 inscriptions, including three exclusive pages per hero and eight universal pages. Unlock them through actual completed-run achievements. Bind a page to change how a hero plays: fire trails on dashes, mobile seedlings, shadow allies, extra lightning chains, overload dashes, and other bonuses with tradeoffs. Start with one slot; craft up to two more. Each hero keeps a separate loadout. The codex also contains the bestiary, relic collection, synergy recipes, and hero mastery records.

**Hero mastery:** earned from kills, elapsed survival, levels, and Wardens. Milestones unlock a selectable starting talent affinity at mastery 3, an extra reroll at 5, and +3% critical chance at 12. Later ranks continue as legacy records and titles.

**Rift Oaths:** defeat a Warden to unlock Oath 1. At higher oaths, survive three minutes and defeat a Warden to unlock the next (up to 99). Oaths are optional, selected before entering. Each oath multiplies enemy health and damage, increases spawn pressure, and adds +25% ember rewards. Higher oaths also increase shard drops. This provides a difficulty ladder as the forge grows.

Death or **End run & bank** saves embers, shards, mastery, discoveries, and records. Closing an unfinished run does not bank it. Saves live in this browser’s localStorage; clearing that storage removes them. Version-one through version-six saves migrate to version seven while preserving currencies, records, research, loadouts, and hero progress. Standard forge ranks are capped at the new maximum of 20 during migration. When browser storage is unavailable, progress lasts only in the current page session.

## The world and its threats

Choose a realm before entering: Hollow Wilds (9,600 × 8,000), Ashen March (12,000 × 7,600), or Starless Vale (10,000 × 11,000). Each keeps its environment for the run. Stone boundaries constrain movement and dashes; enemy spawns avoid appearing directly on a player at the perimeter. Marked ground eruptions punish standing still. The enemy roster adds circling Veil moths, charging Ash revenants, and healing Fungal oracles. Fast hounds remain in the late-game mix, and hunting packs arrive each night after the second.

Three Warden forms rotate: the Hollow Warden uses radial fire and charges, the Ashen Executioner adds fast aimed volleys and attacks more often, and the Spore Matriarch summons moths and marks ground hazards. The first arrives after 70 seconds; another arrives every 85 seconds. Defeating one grants a shard and one run resonance point. This temporary balance is visible in Progress → Skills at any run level; spending unlocks at run level 20. Separately, every ten banked Warden kills grant one permanent talent point for that hero.

Forgotten altars appear during a run. Accept one of three random pacts, or walk away: sacrifice health for damage, trade enemy health for experience, purchase a full heal, summon dangerous reinforcements for rewards, or obtain a relic at a cost. These are optional encounters.

Health grows as 1.34^minutes × 1.72^max(0, minutes − 6). Damage grows as 1.12^minutes × 1.36^max(0, minutes − 6). Late health therefore more than doubles each minute. Reapers arrive at 10:00 in the Wilds, 09:30 in the March, and 09:00 in the Vale, with a 30-second warning and two seconds of grace on materializing. They resist 92% damage, ignore stuns/slows/DoT/knockback and execution talents, and gain speed, damage and reinforcements over time. At most eight are alive; an exceptional kill earns 100 embers and three shards. Runs are intended to end even as account progression continues. Enemy, projectile, effect, pickup, garden, and boss counts have practical limits; capped boss populations receive stronger attacks instead of unbounded new bosses. Automated balance probes are regression tools, not a substitute for human playtesting.

## Art and implementation

Seven locally bundled art images supply actor sprites, six-frame walk cycles for the original four heroes, movement sway for the new two heroes, environment props, terrain, sanctuary scenery, and the illustrated treasure atlas. The Canvas renderer uses full screen resolution (up to 1.5× on high-density displays) with smooth asset downsampling; portraits use up to 2× density. Quieter terrain, larger player sprites, a mint player marker, red hostile projectile outlines, and restrained friendly ground effects improve readability. Pixel emblems and illustrated cards replace dense text; expandable details keep mechanics accessible. Enemies sway, react to hits, turn toward their target and wind up before charging. Dash echoes, casting seals, brief death silhouettes, drifting beacon lights, animated artifact reveals, smooth health/shield bars, and ability recharge bars add feedback. Small sprite rasters are cached to avoid repeatedly resampling large atlases. Ambient particles, lighting, critical-hit numbers, ground telegraphs, and hit effects remain. Generated art, source prompts, and asset paths are documented in **assets/ART-DIRECTION.md**, **assets/RELIQUARY-ART.md**, **assets/WAYFARER-ART.md**, and **assets/ARCHETYPE-ART.md**. The local Outfit font uses the SIL Open Font License in **assets/OFL.txt**. Sound effects are synthesized with Web Audio.

- `src/reliquary.js`: contracts, beacon defense, artifact choices and effects.
- `src/expedition-ui.js`: contract, artifact, inspector, and presentation screens.
- `src/atmosphere.js`: animated beacons and minimap integration.
- `src/combat-motion.js`: aimed action phases and skill-release timing.
- `src/combat-vfx.js`: weapon trails, airborne projectiles, impacts and hero-specific skill effects.
- `src/ability-vfx.js`: layered class spell releases, ultimate fields and cached pixel seals/lights.
- `src/skill-recovery.js`: shared cast cooldown scaling and global combat refunds.
- `src/realms.js`: realm boundaries, exploration loot, permanent memories and Reaper scheduling.
- `src/class-forms.js`: all 24 class forms, recurring combat traits, permanent companion teams and temporary surges.
- `src/form-art.js`: cached outfit recoloring and class regalia shared by portraits and every animated pose.
- `src/cartography.js`, `src/realm-ui.js`: minimap, full map, waypoints, realm selection and evolution menus.
- `src/evolutions.js`: build slots, recipes and distinct evolved combat effects.
- `nocturne.css`, `wayfarer.css`: stone-and-brass game interface and bounded panels.
- `src/champions.js`: achievement unlocks, new hero data and combat mechanics.
- `src/panel-layout.js`: adaptive collection pages, build sections and contextual help.
- `src/ascension.js`: unlimited rank potency and hero research economy.
- `src/icons.js`, `src/power-preview.js`: scalable emblems and concise upgrade previews.
- `src/core.js`: simulation, combat, encounters, migration, and banking.
- `src/progression.js`: authored talent trees, forge definitions, codex unlocks, mastery, synergies.
- `src/specializations.js`, `src/talent-combat.js`: equipped specialization ultimates and reactive talent combat effects.
- `src/skill-descriptions.js`: complete stage-specific skill descriptions for every class and shared relic.
- `src/progression-ui.js`: forge, talent, codex, bestiary, and mastery screens.
- `src/pixel-art.js`: image loading and sprite atlas regions.
- `src/render.js`: pixel renderer, environment, effects, and animation.
- `src/app.js`: menus, input, HUD, local persistence, and game loop.

## Verification

```powershell
npm install
npm test
npm run test:browser
npm run balance
npm run balance -- --pet-aoe
npm run format:check
```

Browser checks start their own servers on ports 4187–4193 and 4195–4196 and require Playwright Chromium (`npx playwright install chromium` if needed). 161 unit tests plus ten desktop/touch browser suites cover progression, encounters, saves, bounded panels and combat, including every class's rank-five awakening, pet area damage/support, all 36 talent ultimates, equipped-choice persistence, reactive talents and the separate run-resonance/permanent-talent rewards. Pet AoE regression tests exercise real projectile collisions, simultaneous imp blasts, piercing limits, area upgrades, entire-pack commands, overlapping casts, summon spells, expiration damage and Reaper immunity. Treasure generation checks sample 600 seeded expeditions across all three realms for varied item mixes, spacing, boundaries, travel distance and preserved memory identities; browser checks verify new-run rolls and exact map waypoints. The progression suite audits 1,915 desktop/phone layouts, including all 288 class/skill/training-stage descriptions, every equipped ultimate and keyboard/touch casts. The class-form suite adds 180 layouts with real transformation purchases and 648 sprite samples across all classes, tiers and walk/attack/cast poses, checking distinct appearance and clipping. Unit checks exercise all 24 combat traits and crowded transformed fights, permanent teams, save/reload, surge expiry, active summon protection and Reaper immunity. Skill-data checks also cover base descriptions, run awakenings, class forms, upgrade summaries, evolution recipes and safe missing-data fallbacks. Animation checks include all 72 action poses and 36 stride poses, single skill releases, frozen visual state, sound, reduced motion and a 270-enemy high-rank crowd scene with all Cinder talents and an active ultimate. Screenshots and frame measurements are written to `tests/screenshots/`. `?test=1` explicitly enables the browser test interface; normal play has no debug controls. `npm run test:forms` runs the dedicated form audit and writes `tests/screenshots/class-form-gallery.png`. `npm run test:abilities` audits 216 class/tier/motion spell samples and 72 real Q/R/F/talent casts, including buffed recovery, frozen pause, touch, reduced motion and all class cast sounds; it writes `tests/screenshots/ability-effects-gallery.png` and gameplay captures. Recovery unit checks exercise every class against each modifier, late floors, global refunds, anti-recursion and cooldown penalties.
