# Vectory3D

Cross-platform software for visualizing analytic geometry with modern 3D graphics

## How to install

You will need npm for this:
* Clone repository
* Make sure to update submodules (for the Jabaku-Engine dependency)
* npm install
* npm start

## How to use

Currently, you can do two things, both via the "console" at the bottom of the screen:
* Create objects:
	* `point(x, y, z, color, name)`: `color` is a CSS color constant, `name` is a string, e.g. "P1", both can be omitted
	* `line2Points(p1, p2, color, name)`: `p1` can be either `[x, y, z]` OR a reference to an existing point by name, e.g. `P1`
	* `plane3Points(p1, p2, p3, color, name)`
	* `sphere(p, radius, color, name)`
* Update objects: use "object name".update(...), e.g. `P1.update(1, 2, 3)`
