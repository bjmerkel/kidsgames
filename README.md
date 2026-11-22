# Kids Games

Two games live here. From the first screen, pick one.

Emery is awesome.

## Woodland Grand Prix

A top-down kart race with 10 woodland racers. Woody the Wood Duck is the balanced racer. The others are a rabbit, squirrel, raccoon, fox, owl, deer, hedgehog, chipmunk, and beaver. Each one feels a little different: some are fast, some turn quicker, some take longer to get going.

There are 5 tracks, three laps each: Lily Pond, Acorn Bend, Fern Switchbacks, Beaver Dam, and Starlit Hollow. The later tracks are narrower and the other racers drive faster. Stay on the road, drive over the green leaf pads to go faster, and avoid the blue puddles. Yellow boxes give an acorn, a leaf, or honey. Throw the acorn, use the leaf for a boost, or drop honey behind you.

Hold Left or Right to steer. The kart rolls on its own. Brake slows you down for a sharp turn. After all 5 races, the cup shows who scored the most points.

## Hermit Crab Crossing

A Frogger-style crossing game. You play a hermit crab. Five backyards stand between the crab and the burrow, and every one of them ends in a tunnel.

Emery is awesome.

## Play

```bash
npm install
npm run dev
```

Then open the local address Vite prints. `npm test` runs the rules. `npm run build` typechecks and bundles the game.

## Controls

- Arrow keys or WASD, or the on-screen pad: hop one step. Hold a direction to keep hopping. The picture and the pad fit the phone screen, in portrait or landscape.
- In Woodland Grand Prix, Left and Right steer, Down or Brake slows the kart, and Use spends the item from a yellow box.
- Space, or Tuck: pull into the shell. A tucked crab is harder to clip. You cannot hop while tucked, and the tuck has to cool down.
- Esc, or Pause: pause. Enter, a tap on the picture, or the big button: start, skip the intro, and continue.
- Up is toward the burrow.

## Levels

1. Emery's Driveway. The safe path is up the middle while you learn the toys.
2. Emery's Backyard. Stones drift, holds blink, and a Hot Wheels car owns the first lane until you wait.
3. Emery's Playground. Faster cars and swings that cross the middle.
4. Emery's Obstacle Course. Shorter time, quicker drift, a denser tunnel.
5. Emery's Tunnel. The tunnel is the longest part of the yard, and the last chamber runs every challenge at once.

Each level is a curb, a Hot Wheels road, stepping stones over water, swings, a climbing wall, and then the tunnel. The tunnel chambers, from the entrance to the burrow, are Hot Wheels, stepping stones, swings, climbing holds, and one combined chamber with all four. Reaching the lit burrow shows **You finished the level!** Finishing level 5 also tells you that you finished all 5 levels.

You get 4 lives, shown as shells. A hit returns you to the last safe entrance and says "Try again. Emery is awesome." The timer running out does the same. Lives refill at the next level. The score carries until a new game.

## Manual check

1. The title says Hermit Crab Crossing and Emery is awesome. The page header says it too.
2. Play level 1 by holding Up. The crab reaches the burrow without losing a life, and the banner says you finished the level.
3. On level 2, hop straight into the first lane and lose a life. Wait and cross after the car passes.
4. Tuck next to a car that only clips the legs. The shell saves you.
5. Stand on a drifting stone until it sinks, then hop off before it does.
6. Finish level 5. The banner congratulates the level and all 5 levels, and it says Emery is awesome.