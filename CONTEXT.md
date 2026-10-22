# Node Kitchen

A single-player browser cooking game where the kitchen is a Node.js process. A level is cleared by producing output in the exact order real Node would.

## The kitchen

**Kitchen**:
One Node process. Everything inside it shares one Stove.
_Avoid_: Restaurant (except for the process exiting: "the restaurant closes")

**Stove**:
The call stack on the main thread. One burner: only one Dish cooks at a time.
_Avoid_: Burner, CPU

**Head Chef**:
The player, and the only one who cooks at the Stove. Stands for the main JavaScript thread.
_Avoid_: Player character, main chef

**Rail**:
A queue beside the Stove that is cleared after every Dish. The orange rail holds nextTick Tickets; the purple rail holds microtask Tickets.

**Ring**:
The loop's phases laid out as Counters in a fixed clockwise order: Oven → Pending shelf → Poll pass → Check counter → Close hatch.
_Avoid_: Loop, circle

**Counter**:
One phase station on the Ring. The Oven is the timers phase; the Check counter is the check phase (setImmediate).

**Lap**:
One full walk around the Ring, i.e. one event-loop iteration.
_Avoid_: Tick, iteration

## Work

**Ticket**:
One scheduled callback, waiting at a Counter or on a Rail. Every Ticket has a Ticket kind.
_Avoid_: Order, task, job

**Ticket kind**:
The colour, shape and icon of a Ticket, which says where it waits: grey sync, orange nextTick, purple microtask, blue timer, teal I/O, amber immediate, rose close, lime event bell.

**Dish**:
One Ticket being cooked on the Stove, from pick-up to finish. A Dish may print Receipt lines and create new Tickets.
_Avoid_: Meal, plate

**Opening dish**:
The Dish that runs the program's top-level code. It is always cooked first, one line at a time.

**Route**:
To carry a new Ticket from the Stove to where it waits. A station refuses a Ticket of the wrong Ticket kind; a refusal is a routing mistake, not a broken Kitchen rule.
_Avoid_: Send, dispatch, throw

**Plate**:
One nested call on the Head Chef's tray (a stack frame). Too many Plates tip the tray (stack overflow).
_Avoid_: Dish

**Order**:
A customer's request, with a patience limit (a request timeout). Arrives with socket levels.
_Avoid_: Ticket

## Judging

**Receipt**:
The console. It prints Receipt lines as Dishes print them, shown beside real Node's output.

**Receipt line**:
One line of program output. A Dish prints zero or more; Receipt lines, not Dishes, are what gets compared with real Node.
_Avoid_: Served dish, plate

**Accepted outputs**:
The set of Receipt-line orders that real Node can produce for a program. Usually one; more when Node itself can't promise an order (e.g. a top-level timer vs setImmediate).

**Kitchen rules**:
The three rules a Dish follows: (1) one Dish at a time, to the end; (2) after every Dish, clear the orange then the purple Rail until both are empty; (3) then walk the Ring. Rule 1 is a wall the Head Chef cannot break; rules 2 and 3 can be broken, and a broken rule shows up on the Receipt and in the Replay.

**Replay**:
The player's Shift played back beside the program's code, highlighting the line that made each Ticket. It pauses at the first Receipt line outside Accepted outputs, names the broken Kitchen rule, and shows what real Node did instead.

**Prediction**:
The Receipt lines the player puts in order on the predict board before service. A correct Prediction earns the bonus star.

**X-ray**:
A toggle that swaps kitchen names for real Node names ("Oven" becomes "timers phase").

## Progression

**Shift**:
One level, built around one program.
_Avoid_: Level (in player-facing text), stage

**World**:
A group of about five Shifts that teaches one learning outcome and ends in a boss Shift.
