import {select} from "d3-selection";
import {line} from "d3-shape";
import {scaleLinear, scalePoint} from "d3-scale";
import {extent} from "d3-array";
import * as axis from "d3-axis";

const defaultMargin = {top: 10, right: 20, bottom: 30, left: 30};
const defaultHeight = 200;
const defaultWidth = 400;

const defaultXAccessor = "x";
const defaultYAccessor = "y";

/*
 * http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
 */
const uuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// If the "export default" syntax is used, then Browserify will wrap this class
// in an object with the "default" property. So, instantiation would require
// "new ThreesyLine.default()" instead of just "new ThreesyLine()".
// Using "module.exports", however, seems to be the workaround for this.
export default class ThreesyLine {
    constructor(opts = {}) {
        // Wrapper HTML element for the chart.
        if (opts.element) {
            this._element = select(opts.element);
        }

        // Element id and CSS classes.
        this._id = opts.id || uuid();
        this._classes = opts.classes || [];

        // Chart data.
        this._data = opts.data || [];

        // Chart dimensions and margins/padding.
        this._margin = opts.margin || defaultMargin;
        this._height = (opts.height || defaultHeight) - this._margin.top - this._margin.bottom;
        this._width = (opts.width || defaultWidth) - this._margin.left - this._margin.right;

        this._accessorX = opts.accessorX || defaultXAccessor;
        this._accessorY = opts.accessorY || defaultYAccessor;

        this._domainX = opts.domainX;
        this._domainY = opts.domainY;
    }

    id(_) {
        if (arguments.length) {
            this._id = _;
        } else {
            return this._id;
        }
    }

    classes(_) {
        if (arguments.length) {
            this._classes = _;
        } else {
            return this._classes;
        }
    }

    height(_) {
        if (arguments.length) {
            this._height = _;
        } else {
            return this._height;
        }
    }

    width(_) {
        if (arguments.length) {
            this._width = _;
        } else {
            return this._width;
        }
    }

    data(_) {
        if (arguments.length) {
            this._data = _;
        } else {
            return this.data;
        }
    }

    accessorX(_) {
        if (arguments.length) {
            this._accessorX = _;
        } else {
            return this._accessorX;
        }
    }

    accessorY(_) {
        if (arguments.length) {
            this._accessorY = _;
        } else {
            return this._accessorY;
        }
    }

    domainX(_) {
        if (arguments.length) {
            this._domainX = _;
        } else {
            return this._domainX;
        }
    }

    domainY(_) {
        if (arguments.length) {
            this._domainY = _;
        } else {
            return this._domainY;
        }
    }

    element(_) {
        if (arguments.length) {
            this._element = _;
        } else {
            return this._element;
        }
    }

    chart(_) {
        if (arguments.length) {
            this._chart = _;
        } else {
            return this._chart;
        }
    }

    draw() {
        if ((typeof this._element) === "undefined") {
            throw new Error("No element selected.")
        }

        if ((typeof this._data) === "undefined" || !this._data.length) {
            throw new Error("No chart data provided.");
        }

        if (typeof this._domainX === "undefined") {
            let domain = this._data.map((d) =>
                typeof this._accessorX === "string" ? d[this._accessorX] : this._accessorX(d));

            this.domainX(domain);
        }

        if (typeof this._domainY === "undefined") {
            let domain = extent(this._data, (d) =>
                typeof this._accessorY === "string" ? d[this._accessorY] : this._accessorY(d));

            this.domainY(domain);
        }

        this._scaleX = scalePoint()
            .domain(this._domainX)
            .range([0, this._width]);

        this._scaleY = scaleLinear()
            .domain(this._domainY)
            .range([this._height, 0]);

        this._axisX = axis.axisBottom(this._scaleX);

        this._axisY = axis.axisLeft(this._scaleY)
            .ticks(this._data.length);

        this._chart = this._element
            .append("svg")
            .attr("id", this._id)
            .attr("class", this._classes.join(" "))
            .attr("height", this._height + this._margin.top + this._margin.bottom)
            .attr("width", this._width + this._margin.left + this._margin.right)
            .append("g")
            .attr("transform", `translate(${this._margin.left}, ${this._margin.top})`);

        this._chart.classed("threesy-line", true);

        this._chart.append("g")
            .attr("class", "x axis")
            .attr("transform", `translate(0, ${this._height})`)
            .call(this._axisX);

        this._chart.append("g")
            .attr("class", "y axis")
            .call(this._axisY);

        this._line = line()
            .x((d) => this._scaleX(typeof this._accessorX === "string" ? d[this._accessorX] : this._accessorX(d)))
            .y((d) => this._scaleY(typeof this._accessorY === "string" ? d[this._accessorY] : this._accessorY(d)));

        this._path = this._chart.append("g")
            .append("path")
            .datum(this._data)
            .attr("class", "line")
            .attr("d", this._line);

        return this;
    }
}
