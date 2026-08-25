# Systems Index

| # | System | Slug | GDD | Status | Dependencies |
|---|--------|------|-----|--------|--------------|
| 1 | 战斗系统 | combat-system | [combat-system.md](combat-system.md) | ✅ Designed | generals-system, skills-system, team-builder-system |
| 2 | 武将系统 | generals-system | — | 🔧 Code Only | — |
| 3 | 战法系统 | skills-system | — | 🔧 Code Only | generals-system |
| 4 | 组队系统 | team-builder-system | — | 🔧 Code Only | generals-system, skills-system |
| 5 | 战斗结果 | battle-result-system | — | 🔧 Code Only | combat-system |
| 6 | 抽卡系统 | gacha-system | — | 🔧 Code Only | generals-system |
| 7 | 图鉴系统 | encyclopedia-system | — | 🔧 Code Only | generals-system |

## Design Order (Recommended)

1. combat-system ✅
2. generals-system
3. skills-system
4. team-builder-system
5. battle-result-system
6. gacha-system
7. encyclopedia-system
