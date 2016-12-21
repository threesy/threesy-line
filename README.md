# threesy-line

This Threesy module can be used to create simple line charts that
_don't_ use time-series data.

## Get Started

First, load the threesy-line script and the very basic CSS 
directly from Github.

```html
<script src="https://raw.githubusercontent.com/threesy/threesy-line/master/build/threesy-line.js"></script>
<link rel="stylesheet" href="https://raw.githubusercontent.com/threesy/threesy-line/master/build/threesy-line.css"> 
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

## Reference

### ThreesyLine([opts])

The ThreesyLine instance can be created by passing in an object
to the constructor or without any arguments. You can always set
the instance properties after it's been create.

opts.**element**

`string` The id of the HTML element that will wrap the chart.

opts.**id**

`string` Value for the chart id. If not provided, one will be
 generated automatically. Although, it's helpful to specify your
 own so you can use to track charts when there several.
 
opts.**classes**
 
`array` The array of CSS class names that you want to add to your
 chart. This should be used if you're planning on using your own styles
 for the charts.
 
opts.**height**

`number` Sets the height of the chart.

opts.**width**

`number` Sets the width of the chart.

opts.**margin**

`object` Sets the margins of the chart
 
opts.**data**
 
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

opts.**accessorY**

`function` | `string` Use this property to set the accessor function
or string valuer for the y values in the data.

Use the accessor properties if the entries fields in data are other
than `"x"` and `"y"`.

opts.**domainX**

Use this property to explicitly set the domain of the x scale.

opts.**domainY**

Use this property to explicity set the domain of the y scale.
