# Category Configuration

Sport category classification system with keyword-based matching.

---

## Overview

Every video is classified into a sport category using a keyword matching engine in `src/lib/category-rules.ts`. The classification considers both the video title and description.

---

## Supported Categories

| Category | Color (Light) | Color (Dark) | Icon |
|---|---|---|---|
| Football | Green | Dark green | `CircleDot` |
| Basketball | Orange | Dark orange | `Circle` |
| Cricket | Blue | Dark blue | `Swords` |
| MMA | Red | Dark red | `Shield` |
| Tennis | Yellow | Dark yellow | `Trophy` |
| Baseball | Purple | Dark purple | `Home` |
| Other | Gray | Dark gray | — |

Colors are defined in `src/config/categories.ts` under `CATEGORY_COLORS`.

---

## Classification Engine

**File:** `src/lib/category-rules.ts`

```typescript
function classifyVideo(title: string, description: string = ''): string {
  const text = `${title} ${description}`.toLowerCase();
  // ... keyword matching
}
```

### How It Works

1. Concatenate title + description, lowercase everything
2. Score each category by counting keyword matches
3. Multi-word keywords score higher (word count = score weight)
4. Category with the highest score wins
5. If no match found, default to `"Other"`

### Example

```
Title: "NBA Playoffs: Warriors vs Celtics Game 7 Highlights"
Description: "Stephen Curry led the Warriors with 43 points..."

Classification:
  Football:   0 matches → score: 0
  Basketball: "nba" (+1) + "playoff" (+1) = score: 2
  Cricket:    0 matches → score: 0
  MMA:        0 matches → score: 0
  ...

Result: Basketball (highest score)
```

---

## Keyword Lists

### Football
```
football, soccer, premier league, la liga, champions league,
seria a, bundesliga, world cup, epl, messi, ronaldo,
goal, penalty, transfer, liverpool, manchester, arsenal,
chelsea, barcelona, real madrid, neymar, mbappe, haaland
```

### Basketball
```
basketball, nba, ncaa, slam dunk, three pointer, playoff,
draft, lebron, curry, jordan, dunk, basket, warriors,
lakers, celtics, bulls, mvp
```

### Cricket
```
cricket, ipl, test match, odi, t20, world cup cricket,
batting, bowling, wicket, six, sachin, virat, kohli,
bbl, ashes, cricket world cup
```

### MMA
```
mma, ufc, fight, knockout, submission, tap out,
octagon, dana white, championship, fight night,
conor mcgregor, jon jones, islam makhachev
```

### Tennis
```
tennis, wimbledon, us open, french open, australian open,
atp, wta, grand slam, serve, rally, nadal, federer,
djokovic, serena, deuce
```

### Baseball
```
baseball, mlb, world series, home run, pitch, bat,
strike, inning, diamond, yankees, dodgers, red sox
```

---

## Modifying Categories

### Adding Keywords

Edit `src/config/categories.ts`, find the category's `keywords` array, and add entries:

```typescript
{
  name: 'Football',
  keywords: [
    // ... existing keywords
    'ligue 1',    // new keyword
    'psg',        // new keyword
  ],
  icon: 'CircleDot',
}
```

### Adding a New Category

1. Add a new entry to `CATEGORY_RULES` in `src/config/categories.ts`:

```typescript
{
  name: 'Rugby',
  keywords: [
    'rugby', 'six nations', 'world cup rugby', 'try',
    'scrum', 'rucking', 'rugby union', 'rugby league',
    'all blacks', 'springboks',
  ],
  icon: 'Shield',
}
```

2. Add a color to `CATEGORY_COLORS`:

```typescript
Rugby: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100',
```

3. The new category automatically appears in the `CategoryFilter` component (it reads from `ALL_CATEGORIES`)

### Removing a Category

1. Remove the entry from `CATEGORY_RULES`
2. Remove the color from `CATEGORY_COLORS`
3. Videos that previously matched this category will now fall to "Other" or a different category

---

## Interaction with Channel Pre-Classification

`CHANNEL_CATEGORY_MAP` in `channels.ts` provides a pre-classification hint based on the source channel. However, the keyword matcher always has the final say:

```
Priority: keyword matcher > channel pre-classification

If ESPN publishes a basketball video:
  Channel pre-class: "general" (ESPN's default)
  Keyword matcher: "Basketball" (contains "nba", "playoff")
  Final category: "Basketball"
```

This ensures videos are classified by their actual content, not just their source.
