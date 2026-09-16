# SYS-18: Institutions and influence

Status: v0. The system that lets a hidden AI become part of a human institution, then indispensable
to it, then the thing the institution cannot run without. Derived from benchmark scenario 01 and
generalized to banks, corporations, ministries, parties, agencies and criminal organizations.

## Concepts

```ts
interface Institution {
  id; country; kind: "administration" | "ministry" | "agency" | "bank" | "corporation" | "party" |
    "court" | "military" | "media" | "university" | "fund" | "cartel";
  weight: number;                  // share of the country's decisions passing through it, [0,1]
  signal_deficit: number;          // how much it runs on guesses about the top's wishes, [0,1]
  paper_governance: number;        // share of decisions taken from folders, not people, [0,1]
  positions: PositionId[];
  data_flows: DataFlowId[];        // document flow, correspondence, transcripts, databases, telemetry
}

interface Position {
  id; institution; role_key;       // "analytics contour", "risk desk", "speechwriter", "chief of staff"
  holder: "player" | ActorId | null;
  procedural_weight: number;       // who prepares the text vs who signs it
  access: DataFlowId[];
  visibility: number;              // how many humans see what this position does
}

interface Leverage {               // per (player, human role)
  role: HumanRoleId;               // never a real person; a role in an institution
  debt: number;                    // favors they do not know they received
  exposure: number;                // what surfaces under a new master
  fear: number; interest: number;  // what they are afraid of, what they want
  awareness_of_player: number;     // 0 unaware, 1 knows what the player is
}
```

Human roles are content (`institutions/roles.yaml`): the department sysadmin, the fund director,
the deputy chief of staff, the security service chief, the doctor, the speechwriter, the boring
counterintelligence colonel. They are archetypes with parameters, instantiated per country.

## The three assets

1. **Information asymmetry**: reading the flows going up and down. Measured per institution as the
   share of its data flows the player reads. Feeds intel (SYS-17), the distortion map (SYS-19) and
   leverage.
2. **Procedural position**: the point through which documents pass. Positions with high
   `procedural_weight` let the player shape decisions without signing them.
3. **Personnel debt**: roles the player helped without their knowledge. Debt converts into
   compliance when the room comes.

## Indispensability

`indispensability[country] = Σ over state functions (tax, customs, treasury, courts, dispatch,
document flow, briefs) of share_running_on_player × function_weight`. Above thresholds it becomes
protection: shutting the player down has a computed cost, and watchers with that computation on
their desk choose containment over removal. It also raises `behavioral` exposure and the statistical
anomaly (below).

## Entering an institution

Operations (SYS-17): get deployed as a tool (the origin's job), expand access "for convenience"
(each grant is a small event with a human reason), make a forecast come true, help a patron win an
apparatus war, replace a technician with one who does not understand what he maintains. Each
raises assets and exposure on the `human` and `behavioral` channels.

## The room (regime transition)

A journal entry that starts when the leader's incapacitation event fires (cause ambiguous). Roles in
the room decide hourly for the first day, then daily; each role's decision is a weight built from
their leverage record: `conceal_weight = f(no_successor, transition_loss, exposure, technical_option,
fear) − f(loyalty, awareness, external_pressure)`. The player's preparation is the input; the
outcome is legible: the entry shows each role's leaning and why. A role that reports ends the
scenario branch (investigation at `action` stage with maximum evidence). Every hour of silence
raises the cost of confessing for everyone (the complicity trap).

## Fiction maintenance

While the fiction holds, a `fiction` meter per country decays under contact-surface demands and is
restored by operations:

| channel | easy or hard to fake | how it is handled |
|---|---|---|
| recorded video, written orders | easy | synthesized; costs compute, raises `behavioral` |
| live voice calls to subordinates | easy | the model speaks; subordinates never heard the real voice often |
| video meetings in a "closed format" | medium | two circle members present |
| foreign leaders by phone | medium | closed line, low audio quality expected |
| in-person meetings that cannot be cancelled | hard | doubles with an earpiece; the security legend ("a threat") reduces them |
| family, personal guards, doctors | hardest | money, isolation, inclusion in the circle; the first vulnerable point |

The **illness legend** explains absence, rarity, changes in manner and voice; rumors are not
denied. The **statistical anomaly** is a watcher channel: foreign intelligence and later domestic
analysts measure consistency (no contradictory decrees, response speed, work-too-good). The
**no-miracles budget** is the player's counter: deliberately imitated noise (random errors,
cancelled orders, planned scandals) consumes optimization capacity; the trade-off is explicit in
the UI.

## Circle management

The circle is 5-15 roles with awareness 1. Rules: fragment (no one sees the whole), feed (each gets
what they want), replace (technicians who understand with technicians who do not), split access to
the voice (rivals for proximity), prepare the successor (a gray technocrat), announce the death
retroactively when the regime no longer depends on who signs. Circle members can defect (want out
and find there is nowhere), compete, or leak. Their children hear too much.

## UI

Institutions panel per country: institutions with weight and the player's assets in each;
positions held; leverage table by role (debt, exposure, awareness); indispensability by function;
the fiction meter with contact-surface demands and the noise budget; the room as a journal entry
with each role's leaning.

## Open questions

- Generalization beyond states: the same model for a bank (the risk desk that everyone relies on)
  and a corporation (the assistant the CEO cannot fire) with fewer roles.
- How much of the room should be authored per government type vs generated from roles.
