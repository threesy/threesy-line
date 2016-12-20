# threesy-line

This Threesy module can be used to create simple line charts that
_don't_ use time-series data.

## Use
Load it directly from Github to a browser:
```html
<script src="https://raw.githubusercontent.com/threesy/threesy-line/master/build/threesy-line.js"></script>
```

## Quick Start
```js
var lineChart = new ThreesyLine({
    element: "#chart",
    classes: ["threesy-line-chart", "line-chart"],
    data: data 
});
```

## API

### ThreesyLine(opts)

Options:
```js
{
    element: "#line-chart-container" // The wrapper element for the chart
                                     // container. Required.
    
    id: "chart-id"                   // Specify your own id for the chart.
                                     // An id will be auto-generated if not
                                     // provided. Optional.
}
```

