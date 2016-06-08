# Vectory3D

Cross-platform software for visualizing analytic geometry with modern 3D graphics

## How to install

You will need npm for this:
* Clone repository
* Make sure to update submodules (for the Jabaku-Engine dependency)
* npm install
* npm start

## How to use

Currently, you have to use the "console" at the bottom of the screen to create or manipulate objects.

### Create objects:
* `point(x, y, z, color, name)`: `color` is a CSS color constant, `name` is a string, e.g. "P1", both can be omitted
* `line2Points(p1, p2, color, name)`: `p1` can be either `[x, y, z]` OR a reference to an existing point by name, e.g. `P1`
* `plane3Points(p1, p2, p3, color, name)`
* `sphere(p, radius, color, name)`

### Update objects
Use "object name".update(...), e.g. `P1.update(1, 2, 3)`

### Variables
You can use variables in expressions, e.g. `point(x, 0, 0)`. In this example a variable named `x` will be created automatically for you and given the value `0`. You can change the variable value by typing e.g. `x = 10`.

### Expressions
Vectory uses math.js to parse and evaluate expressions. Thus, you can use elaborate mathematical expressions in any place where a simple value could go. E.g. you can type `point(sqrt(3), x + 2, x^2 + 2 * x - 1)`

## History
This is actually an attempt to redesign Vectory from scratch. The first time, I have written it in 2004 using Delphi and GLScene (a 3D graphics library). It turned out not to be very maintainable, but it is still available for free (in German): http://matheplanet.com/matheplanet/nuke/html/dl.php?id=963
The old version has a lot of features but lacks the potential of further development, due to spaghetti code and overall lack of architecture.
