# Pet class AoE review

The review covered all twelve signatures and Q skills, companion species and AI, run-rank awakenings, permanent talent branches and ultimates, all 72 equipped spells, training stages, seal recipes, 100/200 class forms, damage attribution, recovery, combat visuals and existing regression coverage before changing combat.

## Existing coverage

| Classes          | Starting crowd tools                                                             | Later tools already implemented                                                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cinder / Volta   | Exploding embers; chain lightning and overloads; broad Q pulses                  | Burning fields, chaos volleys, storms and vortices                                                                                                               |
| Briar / Nyx      | Orbiting thorns and seedlings; piercing knife fans and a radial Q                | Moving gardens, rooting fields, echoes and stronger volleys                                                                                                      |
| Rook / Lumen     | Hammer sweeps and slams; piercing arrows and arrow storms                        | Fault fields, seismic pillars, lunar fields and comet beams                                                                                                      |
| Vesper           | Piercing hex bolts, curses, imp splash, guardian cleaves and a close Q burst     | Plague, Infernal covenant, Chaos dominion; Hex beacon, Soul implosion, Imp gate, Demon sentinel, Chaos fan and Nether crossroads; demon courts and soul ruptures |
| Fen              | Piercing marked bolts, a small wolf cleave, one commanded area pounce and snares | Primal pack, Wild hunt, Thornwild; Pack rally, Alpha hunt, Scatter trap, Stampede, Trail snare and Pack refuge; permanent packs and recurring pack bursts        |
| Solace / Orin    | Piercing radiant/spirit bolts, holy Q damage, fire/storm totems                  | Holy processions, elemental councils, healing fields and radiant pulses                                                                                          |
| Kestrel / Morrow | Melee sweeps, a wide kick, rune cleaves, plague and grip                         | Palm barrages, crane/ghoul allies, blood fields and grave legions                                                                                                |

Vesper and Fen already had AoE, but their accessible crowd coverage was inconsistent. Spell slots start at permanent class level 30 and require purchases; talent ultimates require level 75 and branch investment; forms require levels 100/200. Those tools do not fix the starting pet loop.

## Findings and changes

- All imps shared a 0.4-second splash gate. Additional imps often lost their splash, especially during a pact. Splash now belongs to an individual projectile, fires once even when piercing, selects nearby targets and applies a lesser curse. Baseline bolts splash up to three additional foes at 40% damage; pact bolts reach 135 units and splash five at 45%. Form/ultimate empowerment reaches seven at 70%. Area bonuses apply to these radii.
- Wolf, guardian, elemental and ghoul cleaves ignored area bonuses. Cleave checks and visible sweeps now use the scaled radius. Awakened wolves gain actual wider reach, matching their existing description.
- Ordinary Pack command still used the baseline two-target wolf splash unless an expensive capstone or form was learned. Every commanded wolf now cleaves seven additional foes within 165 units at 75% of its strike damage. Beast cleave increases reach to 195 and splash to 90%.
- Pack command mended and moved only the first wolf, even after forms or spells added a pack. It now mends/revives every unexpired wolf and prioritizes the latest marked prey before other marks and close targets. Pounces reach 185 units, mark lesser prey and hit each enemy only once per cast across overlapping wolves.
- Demon pact's opening damage only surrounded the player, despite imps fighting at range. It retains the close 240-unit defense and adds a 210-unit rupture around prey within 650 units. Overlapping areas hit once. Pact guardians also gain wider, stronger cleaves.
- Implosion exploded at an imp's ranged firing position and recorded damage outside the companion channel. Expiring living imps now send a final 160-unit blast toward nearby prey, hit at most eight targets and credit companion damage.

Existing soul/bond spending, cooldowns, gates, pet health and recovery, eight-companion/five-imp limits and Reaper resistance/control immunity remain in force. Summoning spells, ultimates and forms use the same companion attacks, so the fixes carry through the existing builds. Descriptions and impact visuals expose the changed behavior.

## Balance and verification

Before changes, all 151 unit tests passed. Existing tests mostly established that pets could hit a small clustered group; they did not exercise simultaneous real imp projectiles, area scaling or full-pack commands. Ten additional regression tests now cover those behaviors, overlapping damage, spell summons, expiry, menu freezing and lethal cast cancellation.

`npm run balance` retains the seeded idle and moving survival probes. The initial seed's moving Fen run went from 168 seconds / 241 kills to 213 seconds / 346 kills. Vesper went from 188 seconds / 328 kills to 181 seconds / 335 kills. Changed kills also change drops and upgrade choices, so these are observations, not guarantees of comparative class balance.

`npm run balance -- --pet-aoe` compares all twelve kits at signature ranks 1, 5 and 10 against one enemy and a 16-enemy grid. It uses twelve simulated seconds, active rank one, one full-resource Q, no permanent progression, deterministic non-critical attacks and immobile high-health enemies. It reports total DPS, companion DPS and target coverage. Its geometry favors ranged kits and measures crowd coverage rather than survival or a class ranking. Real movement, pet deaths and resource buildup still need playtesting.

The first implementation made pact splash too strong in a dense crowd. Reducing ordinary pact splash to five secondary targets at 45% retained reliable multi-imp AoE without granting the late form/ultimate splash to every starting pact.

Final verification passed all 161 unit tests, both balance probes and Prettier checks. Four browser suites passed using installed Chrome: class/unlock/awakening UI at four desktop/phone sizes; 216 ability visual samples and 72 actual casts; 1,165 spell layouts and all 72 spells/masteries; 648 form animation samples and 180 form layouts. The bundled Chromium crashed during startup on this machine. The ability audit now waits for the final simulated cast to reach the canvas before asserting that a paused frame stays identical.
