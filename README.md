# threesy-line

This Threesy module is used to create simple line charts that
_don't_ use time-series data. Like other Threesy modules (coming soon),
ThreesyLine uses D3 v4 so that it can take advantage of its modularity
and only use the modules that are required to make ThreesLine work. This
helps keep file size to a minimum. That said, do not use this module if you require
the full functionality of D3.

[View example](https://threesy.github.io/threesy-line/example/) 

## Get Started

Load the threesy-line script and the very basic CSS
directly from Github.

```html
<script src="https://raw.githubusercontent.com/threesy/threesy-line/master/dist/threesy-line.js"></script>
<link rel="stylesheet" href="https://raw.githubusercontent.com/threesy/threesy-line/master/dist/threesy-line.css"> 
```

Or, install using Bower
```
bower install --save threesy-line
```

You do not need to include any other dependencies to start using
the threesy-line component and to create a simple line chart.

```js
// Create a new instance of a ThreesyLine chart.
var linechart = new ThreesyLine({
    element: "#chart-container",
    height: 200,
    width: 400,
    data: [
        {x: "Mon", y: 1},
        {x: "Tue", y: 3},
        {x: "Wed", y: 5}
    ]
});

// Draw the chart on the screen.
// Nothing will happen until draw() is invoked.
linechart.draw();
```

## ThreesyLine([opts])

The ThreesyLine instance can be created by passing in an object
to the constructor or without any arguments. You can always set
the instance properties after it's been create.

### opts.element

`string` The id of the HTML element that will wrap the chart.

### opts.id

`string` Value for the chart id. If not provided, one will be
 generated automatically. Although, it's helpful to specify your
 own so you can use to track charts when there several.
 
### opts.classes
 
`array` The array of CSS class names that you want to add to your
 chart. This should be used if you're planning on using your own styles
 for the charts.
 
### opts.height

`number` Sets the height of the chart.

### opts.width

`number` Sets the width of the chart.

### opts.margin

`object` Sets the margins of the chart. The margin property must have
the properties `top`, `right`, `bottom`, and `left`. Example:

```json
{
  "margin": {"top": 10, "right": 20, "bottom": 30, "left": 30}
}
```
 
### opts.data
 
`array` This is usually an array of objects. For example:
```js
[
    {"x": "Mon", "y": 1},
    {"x": "Tue", "y": 2}
]
```

If you use properties other than `"x"` and `"y"`, then you must set
the accessor properties - `accessorX` and `accessorY`.

opts.**accessorX**

`function` | `string` Use this property to set the accessor function
or string value for the x values in the data.

### opts.accessorY

`function` | `string` Use this property to set the accessor function
or string valuer for the y values in the data.

Use the accessor properties if the entries fields in data are other
than `"x"` and `"y"`.

### opts.domainX

Use this property to explicitly set the domain of the x scale.

### opts.domainY

Use this property to explicity set the domain of the y scale.

### opts.showDataPoints

`boolean` Use `false` if you don't what the chart to draw circles that
represent data points. Default is `true`.

### opts.showGridLines

`boolean` Use false if you don't want the chart to show the guide lines
that go across the length and width of the chart. Default is `true`.

## Tooltips

ThreesyLine supports the use of [Tether Tooltip](http://github.hubspot.com/tooltip/).
To use this feature include the tooltip dependencies.

```html
<link rel="stylesheet" href="css/tooltip-theme-arrows.css" />
<script src="tether.min.js"></script>
<script src="drop.min.js"></script>
<script src="tooltip.min.js"></script>
```