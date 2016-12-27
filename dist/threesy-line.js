var ThreesyLine = (function () {
    'use strict';

    var xhtml = "http://www.w3.org/1999/xhtml";

    var namespaces = {
      svg: "http://www.w3.org/2000/svg",
      xhtml: xhtml,
      xlink: "http://www.w3.org/1999/xlink",
      xml: "http://www.w3.org/XML/1998/namespace",
      xmlns: "http://www.w3.org/2000/xmlns/"
    };

    var namespace = function (name) {
      var prefix = name += "",
          i = prefix.indexOf(":");
      if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
      return namespaces.hasOwnProperty(prefix) ? { space: namespaces[prefix], local: name } : name;
    };

    function creatorInherit(name) {
      return function () {
        var document = this.ownerDocument,
            uri = this.namespaceURI;
        return uri === xhtml && document.documentElement.namespaceURI === xhtml ? document.createElement(name) : document.createElementNS(uri, name);
      };
    }

    function creatorFixed(fullname) {
      return function () {
        return this.ownerDocument.createElementNS(fullname.space, fullname.local);
      };
    }

    var creator = function (name) {
      var fullname = namespace(name);
      return (fullname.local ? creatorFixed : creatorInherit)(fullname);
    };

    var nextId = 0;

    var matcher = function matcher(selector) {
      return function () {
        return this.matches(selector);
      };
    };

    if (typeof document !== "undefined") {
      var element = document.documentElement;
      if (!element.matches) {
        var vendorMatches = element.webkitMatchesSelector || element.msMatchesSelector || element.mozMatchesSelector || element.oMatchesSelector;
        matcher = function matcher(selector) {
          return function () {
            return vendorMatches.call(this, selector);
          };
        };
      }
    }

    var matcher$1 = matcher;

    var filterEvents = {};

    var event = null;

    if (typeof document !== "undefined") {
      var element$1 = document.documentElement;
      if (!("onmouseenter" in element$1)) {
        filterEvents = { mouseenter: "mouseover", mouseleave: "mouseout" };
      }
    }

    function filterContextListener(listener, index, group) {
      listener = contextListener(listener, index, group);
      return function (event) {
        var related = event.relatedTarget;
        if (!related || related !== this && !(related.compareDocumentPosition(this) & 8)) {
          listener.call(this, event);
        }
      };
    }

    function contextListener(listener, index, group) {
      return function (event1) {
        var event0 = event; // Events can be reentrant (e.g., focus).
        event = event1;
        try {
          listener.call(this, this.__data__, index, group);
        } finally {
          event = event0;
        }
      };
    }

    function parseTypenames(typenames) {
      return typenames.trim().split(/^|\s+/).map(function (t) {
        var name = "",
            i = t.indexOf(".");
        if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
        return { type: t, name: name };
      });
    }

    function onRemove(typename) {
      return function () {
        var on = this.__on;
        if (!on) return;
        for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
          if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
            this.removeEventListener(o.type, o.listener, o.capture);
          } else {
            on[++i] = o;
          }
        }
        if (++i) on.length = i;else delete this.__on;
      };
    }

    function onAdd(typename, value, capture) {
      var wrap = filterEvents.hasOwnProperty(typename.type) ? filterContextListener : contextListener;
      return function (d, i, group) {
        var on = this.__on,
            o,
            listener = wrap(value, i, group);
        if (on) for (var j = 0, m = on.length; j < m; ++j) {
          if ((o = on[j]).type === typename.type && o.name === typename.name) {
            this.removeEventListener(o.type, o.listener, o.capture);
            this.addEventListener(o.type, o.listener = listener, o.capture = capture);
            o.value = value;
            return;
          }
        }
        this.addEventListener(typename.type, listener, capture);
        o = { type: typename.type, name: typename.name, value: value, listener: listener, capture: capture };
        if (!on) this.__on = [o];else on.push(o);
      };
    }

    var selection_on = function (typename, value, capture) {
      var typenames = parseTypenames(typename + ""),
          i,
          n = typenames.length,
          t;

      if (arguments.length < 2) {
        var on = this.node().__on;
        if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
          for (i = 0, o = on[j]; i < n; ++i) {
            if ((t = typenames[i]).type === o.type && t.name === o.name) {
              return o.value;
            }
          }
        }
        return;
      }

      on = value ? onAdd : onRemove;
      if (capture == null) capture = false;
      for (i = 0; i < n; ++i) {
        this.each(on(typenames[i], value, capture));
      }return this;
    };

    var sourceEvent = function () {
      var current = event,
          source;
      while (source = current.sourceEvent) {
        current = source;
      }return current;
    };

    var point$1 = function (node, event) {
      var svg = node.ownerSVGElement || node;

      if (svg.createSVGPoint) {
        var point = svg.createSVGPoint();
        point.x = event.clientX, point.y = event.clientY;
        point = point.matrixTransform(node.getScreenCTM().inverse());
        return [point.x, point.y];
      }

      var rect = node.getBoundingClientRect();
      return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
    };

    function none() {}

    var selector = function (selector) {
      return selector == null ? none : function () {
        return this.querySelector(selector);
      };
    };

    var selection_select = function (select) {
      if (typeof select !== "function") select = selector(select);

      for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
          if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
            if ("__data__" in node) subnode.__data__ = node.__data__;
            subgroup[i] = subnode;
          }
        }
      }

      return new Selection(subgroups, this._parents);
    };

    function empty$1() {
      return [];
    }

    var selectorAll = function (selector) {
      return selector == null ? empty$1 : function () {
        return this.querySelectorAll(selector);
      };
    };

    var selection_selectAll = function (select) {
      if (typeof select !== "function") select = selectorAll(select);

      for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
          if (node = group[i]) {
            subgroups.push(select.call(node, node.__data__, i, group));
            parents.push(node);
          }
        }
      }

      return new Selection(subgroups, parents);
    };

    var selection_filter = function (match) {
      if (typeof match !== "function") match = matcher$1(match);

      for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
          if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
            subgroup.push(node);
          }
        }
      }

      return new Selection(subgroups, this._parents);
    };

    var sparse = function (update) {
      return new Array(update.length);
    };

    var selection_enter = function () {
      return new Selection(this._enter || this._groups.map(sparse), this._parents);
    };

    function EnterNode(parent, datum) {
      this.ownerDocument = parent.ownerDocument;
      this.namespaceURI = parent.namespaceURI;
      this._next = null;
      this._parent = parent;
      this.__data__ = datum;
    }

    EnterNode.prototype = {
      constructor: EnterNode,
      appendChild: function appendChild(child) {
        return this._parent.insertBefore(child, this._next);
      },
      insertBefore: function insertBefore(child, next) {
        return this._parent.insertBefore(child, next);
      },
      querySelector: function querySelector(selector) {
        return this._parent.querySelector(selector);
      },
      querySelectorAll: function querySelectorAll(selector) {
        return this._parent.querySelectorAll(selector);
      }
    };

    var constant$1 = function (x) {
      return function () {
        return x;
      };
    };

    var keyPrefix = "$"; // Protect against keys like “__proto__”.

    function bindIndex(parent, group, enter, update, exit, data) {
      var i = 0,
          node,
          groupLength = group.length,
          dataLength = data.length;

      // Put any non-null nodes that fit into update.
      // Put any null nodes into enter.
      // Put any remaining data into enter.
      for (; i < dataLength; ++i) {
        if (node = group[i]) {
          node.__data__ = data[i];
          update[i] = node;
        } else {
          enter[i] = new EnterNode(parent, data[i]);
        }
      }

      // Put any non-null nodes that don’t fit into exit.
      for (; i < groupLength; ++i) {
        if (node = group[i]) {
          exit[i] = node;
        }
      }
    }

    function bindKey(parent, group, enter, update, exit, data, key) {
      var i,
          node,
          nodeByKeyValue = {},
          groupLength = group.length,
          dataLength = data.length,
          keyValues = new Array(groupLength),
          keyValue;

      // Compute the key for each node.
      // If multiple nodes have the same key, the duplicates are added to exit.
      for (i = 0; i < groupLength; ++i) {
        if (node = group[i]) {
          keyValues[i] = keyValue = keyPrefix + key.call(node, node.__data__, i, group);
          if (keyValue in nodeByKeyValue) {
            exit[i] = node;
          } else {
            nodeByKeyValue[keyValue] = node;
          }
        }
      }

      // Compute the key for each datum.
      // If there a node associated with this key, join and add it to update.
      // If there is not (or the key is a duplicate), add it to enter.
      for (i = 0; i < dataLength; ++i) {
        keyValue = keyPrefix + key.call(parent, data[i], i, data);
        if (node = nodeByKeyValue[keyValue]) {
          update[i] = node;
          node.__data__ = data[i];
          nodeByKeyValue[keyValue] = null;
        } else {
          enter[i] = new EnterNode(parent, data[i]);
        }
      }

      // Add any remaining nodes that were not bound to data to exit.
      for (i = 0; i < groupLength; ++i) {
        if ((node = group[i]) && nodeByKeyValue[keyValues[i]] === node) {
          exit[i] = node;
        }
      }
    }

    var selection_data = function (value, key) {
      if (!value) {
        data = new Array(this.size()), j = -1;
        this.each(function (d) {
          data[++j] = d;
        });
        return data;
      }

      var bind = key ? bindKey : bindIndex,
          parents = this._parents,
          groups = this._groups;

      if (typeof value !== "function") value = constant$1(value);

      for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
        var parent = parents[j],
            group = groups[j],
            groupLength = group.length,
            data = value.call(parent, parent && parent.__data__, j, parents),
            dataLength = data.length,
            enterGroup = enter[j] = new Array(dataLength),
            updateGroup = update[j] = new Array(dataLength),
            exitGroup = exit[j] = new Array(groupLength);

        bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

        // Now connect the enter nodes to their following update node, such that
        // appendChild can insert the materialized enter node before this node,
        // rather than at the end of the parent node.
        for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
          if (previous = enterGroup[i0]) {
            if (i0 >= i1) i1 = i0 + 1;
            while (!(next = updateGroup[i1]) && ++i1 < dataLength) {}
            previous._next = next || null;
          }
        }
      }

      update = new Selection(update, parents);
      update._enter = enter;
      update._exit = exit;
      return update;
    };

    var selection_exit = function () {
      return new Selection(this._exit || this._groups.map(sparse), this._parents);
    };

    var selection_merge = function (selection) {

      for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
        for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
          if (node = group0[i] || group1[i]) {
            merge[i] = node;
          }
        }
      }

      for (; j < m0; ++j) {
        merges[j] = groups0[j];
      }

      return new Selection(merges, this._parents);
    };

    var selection_order = function () {

      for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
        for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
          if (node = group[i]) {
            if (next && next !== node.nextSibling) next.parentNode.insertBefore(node, next);
            next = node;
          }
        }
      }

      return this;
    };

    var selection_sort = function (compare) {
      if (!compare) compare = ascending;

      function compareNode(a, b) {
        return a && b ? compare(a.__data__, b.__data__) : !a - !b;
      }

      for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
          if (node = group[i]) {
            sortgroup[i] = node;
          }
        }
        sortgroup.sort(compareNode);
      }

      return new Selection(sortgroups, this._parents).order();
    };

    function ascending(a, b) {
      return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
    }

    var selection_call = function () {
      var callback = arguments[0];
      arguments[0] = this;
      callback.apply(null, arguments);
      return this;
    };

    var selection_nodes = function () {
      var nodes = new Array(this.size()),
          i = -1;
      this.each(function () {
        nodes[++i] = this;
      });
      return nodes;
    };

    var selection_node = function () {

      for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
        for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
          var node = group[i];
          if (node) return node;
        }
      }

      return null;
    };

    var selection_size = function () {
      var size = 0;
      this.each(function () {
        ++size;
      });
      return size;
    };

    var selection_empty = function () {
      return !this.node();
    };

    var selection_each = function (callback) {

      for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
        for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
          if (node = group[i]) callback.call(node, node.__data__, i, group);
        }
      }

      return this;
    };

    function attrRemove(name) {
      return function () {
        this.removeAttribute(name);
      };
    }

    function attrRemoveNS(fullname) {
      return function () {
        this.removeAttributeNS(fullname.space, fullname.local);
      };
    }

    function attrConstant(name, value) {
      return function () {
        this.setAttribute(name, value);
      };
    }

    function attrConstantNS(fullname, value) {
      return function () {
        this.setAttributeNS(fullname.space, fullname.local, value);
      };
    }

    function attrFunction(name, value) {
      return function () {
        var v = value.apply(this, arguments);
        if (v == null) this.removeAttribute(name);else this.setAttribute(name, v);
      };
    }

    function attrFunctionNS(fullname, value) {
      return function () {
        var v = value.apply(this, arguments);
        if (v == null) this.removeAttributeNS(fullname.space, fullname.local);else this.setAttributeNS(fullname.space, fullname.local, v);
      };
    }

    var selection_attr = function (name, value) {
      var fullname = namespace(name);

      if (arguments.length < 2) {
        var node = this.node();
        return fullname.local ? node.getAttributeNS(fullname.space, fullname.local) : node.getAttribute(fullname);
      }

      return this.each((value == null ? fullname.local ? attrRemoveNS : attrRemove : typeof value === "function" ? fullname.local ? attrFunctionNS : attrFunction : fullname.local ? attrConstantNS : attrConstant)(fullname, value));
    };

    var defaultView = function (node) {
        return node.ownerDocument && node.ownerDocument.defaultView || // node is a Node
        node.document && node // node is a Window
        || node.defaultView; // node is a Document
    };

    function styleRemove(name) {
      return function () {
        this.style.removeProperty(name);
      };
    }

    function styleConstant(name, value, priority) {
      return function () {
        this.style.setProperty(name, value, priority);
      };
    }

    function styleFunction(name, value, priority) {
      return function () {
        var v = value.apply(this, arguments);
        if (v == null) this.style.removeProperty(name);else this.style.setProperty(name, v, priority);
      };
    }

    var selection_style = function (name, value, priority) {
      var node;
      return arguments.length > 1 ? this.each((value == null ? styleRemove : typeof value === "function" ? styleFunction : styleConstant)(name, value, priority == null ? "" : priority)) : defaultView(node = this.node()).getComputedStyle(node, null).getPropertyValue(name);
    };

    function propertyRemove(name) {
      return function () {
        delete this[name];
      };
    }

    function propertyConstant(name, value) {
      return function () {
        this[name] = value;
      };
    }

    function propertyFunction(name, value) {
      return function () {
        var v = value.apply(this, arguments);
        if (v == null) delete this[name];else this[name] = v;
      };
    }

    var selection_property = function (name, value) {
      return arguments.length > 1 ? this.each((value == null ? propertyRemove : typeof value === "function" ? propertyFunction : propertyConstant)(name, value)) : this.node()[name];
    };

    function classArray(string) {
      return string.trim().split(/^|\s+/);
    }

    function classList(node) {
      return node.classList || new ClassList(node);
    }

    function ClassList(node) {
      this._node = node;
      this._names = classArray(node.getAttribute("class") || "");
    }

    ClassList.prototype = {
      add: function add(name) {
        var i = this._names.indexOf(name);
        if (i < 0) {
          this._names.push(name);
          this._node.setAttribute("class", this._names.join(" "));
        }
      },
      remove: function remove(name) {
        var i = this._names.indexOf(name);
        if (i >= 0) {
          this._names.splice(i, 1);
          this._node.setAttribute("class", this._names.join(" "));
        }
      },
      contains: function contains(name) {
        return this._names.indexOf(name) >= 0;
      }
    };

    function classedAdd(node, names) {
      var list = classList(node),
          i = -1,
          n = names.length;
      while (++i < n) {
        list.add(names[i]);
      }
    }

    function classedRemove(node, names) {
      var list = classList(node),
          i = -1,
          n = names.length;
      while (++i < n) {
        list.remove(names[i]);
      }
    }

    function classedTrue(names) {
      return function () {
        classedAdd(this, names);
      };
    }

    function classedFalse(names) {
      return function () {
        classedRemove(this, names);
      };
    }

    function classedFunction(names, value) {
      return function () {
        (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
      };
    }

    var selection_classed = function (name, value) {
      var names = classArray(name + "");

      if (arguments.length < 2) {
        var list = classList(this.node()),
            i = -1,
            n = names.length;
        while (++i < n) {
          if (!list.contains(names[i])) return false;
        }return true;
      }

      return this.each((typeof value === "function" ? classedFunction : value ? classedTrue : classedFalse)(names, value));
    };

    function textRemove() {
      this.textContent = "";
    }

    function textConstant(value) {
      return function () {
        this.textContent = value;
      };
    }

    function textFunction(value) {
      return function () {
        var v = value.apply(this, arguments);
        this.textContent = v == null ? "" : v;
      };
    }

    var selection_text = function (value) {
      return arguments.length ? this.each(value == null ? textRemove : (typeof value === "function" ? textFunction : textConstant)(value)) : this.node().textContent;
    };

    function htmlRemove() {
      this.innerHTML = "";
    }

    function htmlConstant(value) {
      return function () {
        this.innerHTML = value;
      };
    }

    function htmlFunction(value) {
      return function () {
        var v = value.apply(this, arguments);
        this.innerHTML = v == null ? "" : v;
      };
    }

    var selection_html = function (value) {
      return arguments.length ? this.each(value == null ? htmlRemove : (typeof value === "function" ? htmlFunction : htmlConstant)(value)) : this.node().innerHTML;
    };

    function raise() {
      if (this.nextSibling) this.parentNode.appendChild(this);
    }

    var selection_raise = function () {
      return this.each(raise);
    };

    function lower() {
      if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
    }

    var selection_lower = function () {
      return this.each(lower);
    };

    var selection_append = function (name) {
      var create = typeof name === "function" ? name : creator(name);
      return this.select(function () {
        return this.appendChild(create.apply(this, arguments));
      });
    };

    function constantNull() {
      return null;
    }

    var selection_insert = function (name, before) {
      var create = typeof name === "function" ? name : creator(name),
          select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
      return this.select(function () {
        return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
      });
    };

    function remove$1() {
      var parent = this.parentNode;
      if (parent) parent.removeChild(this);
    }

    var selection_remove = function () {
      return this.each(remove$1);
    };

    var selection_datum = function (value) {
        return arguments.length ? this.property("__data__", value) : this.node().__data__;
    };

    function dispatchEvent(node, type, params) {
      var window = defaultView(node),
          event = window.CustomEvent;

      if (event) {
        event = new event(type, params);
      } else {
        event = window.document.createEvent("Event");
        if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;else event.initEvent(type, false, false);
      }

      node.dispatchEvent(event);
    }

    function dispatchConstant(type, params) {
      return function () {
        return dispatchEvent(this, type, params);
      };
    }

    function dispatchFunction(type, params) {
      return function () {
        return dispatchEvent(this, type, params.apply(this, arguments));
      };
    }

    var selection_dispatch = function (type, params) {
      return this.each((typeof params === "function" ? dispatchFunction : dispatchConstant)(type, params));
    };

    var root = [null];

    function Selection(groups, parents) {
      this._groups = groups;
      this._parents = parents;
    }

    function selection() {
      return new Selection([[document.documentElement]], root);
    }

    Selection.prototype = selection.prototype = {
      constructor: Selection,
      select: selection_select,
      selectAll: selection_selectAll,
      filter: selection_filter,
      data: selection_data,
      enter: selection_enter,
      exit: selection_exit,
      merge: selection_merge,
      order: selection_order,
      sort: selection_sort,
      call: selection_call,
      nodes: selection_nodes,
      node: selection_node,
      size: selection_size,
      empty: selection_empty,
      each: selection_each,
      attr: selection_attr,
      style: selection_style,
      property: selection_property,
      classed: selection_classed,
      text: selection_text,
      html: selection_html,
      raise: selection_raise,
      lower: selection_lower,
      append: selection_append,
      insert: selection_insert,
      remove: selection_remove,
      datum: selection_datum,
      on: selection_on,
      dispatch: selection_dispatch
    };

    var select = function (selector) {
        return typeof selector === "string" ? new Selection([[document.querySelector(selector)]], [document.documentElement]) : new Selection([[selector]], root);
    };

    var pi = Math.PI;
    var tau = 2 * pi;
    var epsilon = 1e-6;
    var tauEpsilon = tau - epsilon;

    function Path() {
      this._x0 = this._y0 = // start of current subpath
      this._x1 = this._y1 = null; // end of current subpath
      this._ = "";
    }

    function path() {
      return new Path();
    }

    Path.prototype = path.prototype = {
      constructor: Path,
      moveTo: function moveTo(x, y) {
        this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y);
      },
      closePath: function closePath() {
        if (this._x1 !== null) {
          this._x1 = this._x0, this._y1 = this._y0;
          this._ += "Z";
        }
      },
      lineTo: function lineTo(x, y) {
        this._ += "L" + (this._x1 = +x) + "," + (this._y1 = +y);
      },
      quadraticCurveTo: function quadraticCurveTo(x1, y1, x, y) {
        this._ += "Q" + +x1 + "," + +y1 + "," + (this._x1 = +x) + "," + (this._y1 = +y);
      },
      bezierCurveTo: function bezierCurveTo(x1, y1, x2, y2, x, y) {
        this._ += "C" + +x1 + "," + +y1 + "," + +x2 + "," + +y2 + "," + (this._x1 = +x) + "," + (this._y1 = +y);
      },
      arcTo: function arcTo(x1, y1, x2, y2, r) {
        x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
        var x0 = this._x1,
            y0 = this._y1,
            x21 = x2 - x1,
            y21 = y2 - y1,
            x01 = x0 - x1,
            y01 = y0 - y1,
            l01_2 = x01 * x01 + y01 * y01;

        // Is the radius negative? Error.
        if (r < 0) throw new Error("negative radius: " + r);

        // Is this path empty? Move to (x1,y1).
        if (this._x1 === null) {
          this._ += "M" + (this._x1 = x1) + "," + (this._y1 = y1);
        }

        // Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
        else if (!(l01_2 > epsilon)) {}

          // Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
          // Equivalently, is (x1,y1) coincident with (x2,y2)?
          // Or, is the radius zero? Line to (x1,y1).
          else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
              this._ += "L" + (this._x1 = x1) + "," + (this._y1 = y1);
            }

            // Otherwise, draw an arc!
            else {
                var x20 = x2 - x0,
                    y20 = y2 - y0,
                    l21_2 = x21 * x21 + y21 * y21,
                    l20_2 = x20 * x20 + y20 * y20,
                    l21 = Math.sqrt(l21_2),
                    l01 = Math.sqrt(l01_2),
                    l = r * Math.tan((pi - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2),
                    t01 = l / l01,
                    t21 = l / l21;

                // If the start tangent is not coincident with (x0,y0), line to.
                if (Math.abs(t01 - 1) > epsilon) {
                  this._ += "L" + (x1 + t01 * x01) + "," + (y1 + t01 * y01);
                }

                this._ += "A" + r + "," + r + ",0,0," + +(y01 * x20 > x01 * y20) + "," + (this._x1 = x1 + t21 * x21) + "," + (this._y1 = y1 + t21 * y21);
              }
      },
      arc: function arc(x, y, r, a0, a1, ccw) {
        x = +x, y = +y, r = +r;
        var dx = r * Math.cos(a0),
            dy = r * Math.sin(a0),
            x0 = x + dx,
            y0 = y + dy,
            cw = 1 ^ ccw,
            da = ccw ? a0 - a1 : a1 - a0;

        // Is the radius negative? Error.
        if (r < 0) throw new Error("negative radius: " + r);

        // Is this path empty? Move to (x0,y0).
        if (this._x1 === null) {
          this._ += "M" + x0 + "," + y0;
        }

        // Or, is (x0,y0) not coincident with the previous point? Line to (x0,y0).
        else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) {
            this._ += "L" + x0 + "," + y0;
          }

        // Is this arc empty? We’re done.
        if (!r) return;

        // Is this a complete circle? Draw two arcs to complete the circle.
        if (da > tauEpsilon) {
          this._ += "A" + r + "," + r + ",0,1," + cw + "," + (x - dx) + "," + (y - dy) + "A" + r + "," + r + ",0,1," + cw + "," + (this._x1 = x0) + "," + (this._y1 = y0);
        }

        // Otherwise, draw an arc!
        else {
            if (da < 0) da = da % tau + tau;
            this._ += "A" + r + "," + r + ",0," + +(da >= pi) + "," + cw + "," + (this._x1 = x + r * Math.cos(a1)) + "," + (this._y1 = y + r * Math.sin(a1));
          }
      },
      rect: function rect(x, y, w, h) {
        this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y) + "h" + +w + "v" + +h + "h" + -w + "Z";
      },
      toString: function toString() {
        return this._;
      }
    };

    var constant$2 = function (x) {
      return function constant() {
        return x;
      };
    };

    var epsilon$1 = 1e-12;
    var pi$1 = Math.PI;
    var halfPi = pi$1 / 2;
    var tau$1 = 2 * pi$1;

    function arcInnerRadius(d) {
      return d.innerRadius;
    }

    function arcOuterRadius(d) {
      return d.outerRadius;
    }

    function arcStartAngle(d) {
      return d.startAngle;
    }

    function arcEndAngle(d) {
      return d.endAngle;
    }

    function arcPadAngle(d) {
      return d && d.padAngle; // Note: optional!
    }

    function asin(x) {
      return x >= 1 ? halfPi : x <= -1 ? -halfPi : Math.asin(x);
    }

    function intersect(x0, y0, x1, y1, x2, y2, x3, y3) {
      var x10 = x1 - x0,
          y10 = y1 - y0,
          x32 = x3 - x2,
          y32 = y3 - y2,
          t = (x32 * (y0 - y2) - y32 * (x0 - x2)) / (y32 * x10 - x32 * y10);
      return [x0 + t * x10, y0 + t * y10];
    }

    // Compute perpendicular offset line of length rc.
    // http://mathworld.wolfram.com/Circle-LineIntersection.html
    function cornerTangents(x0, y0, x1, y1, r1, rc, cw) {
      var x01 = x0 - x1,
          y01 = y0 - y1,
          lo = (cw ? rc : -rc) / Math.sqrt(x01 * x01 + y01 * y01),
          ox = lo * y01,
          oy = -lo * x01,
          x11 = x0 + ox,
          y11 = y0 + oy,
          x10 = x1 + ox,
          y10 = y1 + oy,
          x00 = (x11 + x10) / 2,
          y00 = (y11 + y10) / 2,
          dx = x10 - x11,
          dy = y10 - y11,
          d2 = dx * dx + dy * dy,
          r = r1 - rc,
          D = x11 * y10 - x10 * y11,
          d = (dy < 0 ? -1 : 1) * Math.sqrt(Math.max(0, r * r * d2 - D * D)),
          cx0 = (D * dy - dx * d) / d2,
          cy0 = (-D * dx - dy * d) / d2,
          cx1 = (D * dy + dx * d) / d2,
          cy1 = (-D * dx + dy * d) / d2,
          dx0 = cx0 - x00,
          dy0 = cy0 - y00,
          dx1 = cx1 - x00,
          dy1 = cy1 - y00;

      // Pick the closer of the two intersection points.
      // TODO Is there a faster way to determine which intersection to use?
      if (dx0 * dx0 + dy0 * dy0 > dx1 * dx1 + dy1 * dy1) cx0 = cx1, cy0 = cy1;

      return {
        cx: cx0,
        cy: cy0,
        x01: -ox,
        y01: -oy,
        x11: cx0 * (r1 / r - 1),
        y11: cy0 * (r1 / r - 1)
      };
    }

    function Linear(context) {
      this._context = context;
    }

    Linear.prototype = {
      areaStart: function areaStart() {
        this._line = 0;
      },
      areaEnd: function areaEnd() {
        this._line = NaN;
      },
      lineStart: function lineStart() {
        this._point = 0;
      },
      lineEnd: function lineEnd() {
        if (this._line || this._line !== 0 && this._point === 1) this._context.closePath();
        this._line = 1 - this._line;
      },
      point: function point(x, y) {
        x = +x, y = +y;
        switch (this._point) {
          case 0:
            this._point = 1;this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y);break;
          case 1:
            this._point = 2; // proceed
          default:
            this._context.lineTo(x, y);break;
        }
      }
    };

    var curveLinear = function (context) {
      return new Linear(context);
    };

    function x$1(p) {
      return p[0];
    }

    function y(p) {
      return p[1];
    }

    var line = function () {
      var x$$1 = x$1,
          y$$1 = y,
          defined = constant$2(true),
          context = null,
          curve = curveLinear,
          output = null;

      function line(data) {
        var i,
            n = data.length,
            d,
            defined0 = false,
            buffer;

        if (context == null) output = curve(buffer = path());

        for (i = 0; i <= n; ++i) {
          if (!(i < n && defined(d = data[i], i, data)) === defined0) {
            if (defined0 = !defined0) output.lineStart();else output.lineEnd();
          }
          if (defined0) output.point(+x$$1(d, i, data), +y$$1(d, i, data));
        }

        if (buffer) return output = null, buffer + "" || null;
      }

      line.x = function (_) {
        return arguments.length ? (x$$1 = typeof _ === "function" ? _ : constant$2(+_), line) : x$$1;
      };

      line.y = function (_) {
        return arguments.length ? (y$$1 = typeof _ === "function" ? _ : constant$2(+_), line) : y$$1;
      };

      line.defined = function (_) {
        return arguments.length ? (defined = typeof _ === "function" ? _ : constant$2(!!_), line) : defined;
      };

      line.curve = function (_) {
        return arguments.length ? (curve = _, context != null && (output = curve(context)), line) : curve;
      };

      line.context = function (_) {
        return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), line) : context;
      };

      return line;
    };

    var area = function () {
      var x0 = x$1,
          x1 = null,
          y0 = constant$2(0),
          y1 = y,
          defined = constant$2(true),
          context = null,
          curve = curveLinear,
          output = null;

      function area(data) {
        var i,
            j,
            k,
            n = data.length,
            d,
            defined0 = false,
            buffer,
            x0z = new Array(n),
            y0z = new Array(n);

        if (context == null) output = curve(buffer = path());

        for (i = 0; i <= n; ++i) {
          if (!(i < n && defined(d = data[i], i, data)) === defined0) {
            if (defined0 = !defined0) {
              j = i;
              output.areaStart();
              output.lineStart();
            } else {
              output.lineEnd();
              output.lineStart();
              for (k = i - 1; k >= j; --k) {
                output.point(x0z[k], y0z[k]);
              }
              output.lineEnd();
              output.areaEnd();
            }
          }
          if (defined0) {
            x0z[i] = +x0(d, i, data), y0z[i] = +y0(d, i, data);
            output.point(x1 ? +x1(d, i, data) : x0z[i], y1 ? +y1(d, i, data) : y0z[i]);
          }
        }

        if (buffer) return output = null, buffer + "" || null;
      }

      function arealine() {
        return line().defined(defined).curve(curve).context(context);
      }

      area.x = function (_) {
        return arguments.length ? (x0 = typeof _ === "function" ? _ : constant$2(+_), x1 = null, area) : x0;
      };

      area.x0 = function (_) {
        return arguments.length ? (x0 = typeof _ === "function" ? _ : constant$2(+_), area) : x0;
      };

      area.x1 = function (_) {
        return arguments.length ? (x1 = _ == null ? null : typeof _ === "function" ? _ : constant$2(+_), area) : x1;
      };

      area.y = function (_) {
        return arguments.length ? (y0 = typeof _ === "function" ? _ : constant$2(+_), y1 = null, area) : y0;
      };

      area.y0 = function (_) {
        return arguments.length ? (y0 = typeof _ === "function" ? _ : constant$2(+_), area) : y0;
      };

      area.y1 = function (_) {
        return arguments.length ? (y1 = _ == null ? null : typeof _ === "function" ? _ : constant$2(+_), area) : y1;
      };

      area.lineX0 = area.lineY0 = function () {
        return arealine().x(x0).y(y0);
      };

      area.lineY1 = function () {
        return arealine().x(x0).y(y1);
      };

      area.lineX1 = function () {
        return arealine().x(x1).y(y0);
      };

      area.defined = function (_) {
        return arguments.length ? (defined = typeof _ === "function" ? _ : constant$2(!!_), area) : defined;
      };

      area.curve = function (_) {
        return arguments.length ? (curve = _, context != null && (output = curve(context)), area) : curve;
      };

      area.context = function (_) {
        return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), area) : context;
      };

      return area;
    };

    var descending = function (a, b) {
      return b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
    };

    var identity = function (d) {
      return d;
    };

    var curveRadialLinear = curveRadial(curveLinear);

    function Radial(curve) {
      this._curve = curve;
    }

    Radial.prototype = {
      areaStart: function areaStart() {
        this._curve.areaStart();
      },
      areaEnd: function areaEnd() {
        this._curve.areaEnd();
      },
      lineStart: function lineStart() {
        this._curve.lineStart();
      },
      lineEnd: function lineEnd() {
        this._curve.lineEnd();
      },
      point: function point(a, r) {
        this._curve.point(r * Math.sin(a), r * -Math.cos(a));
      }
    };

    function curveRadial(curve) {

      function radial(context) {
        return new Radial(curve(context));
      }

      radial._curve = curve;

      return radial;
    }

    function radialLine(l) {
      var c = l.curve;

      l.angle = l.x, delete l.x;
      l.radius = l.y, delete l.y;

      l.curve = function (_) {
        return arguments.length ? c(curveRadial(_)) : c()._curve;
      };

      return l;
    }

    var circle = {
      draw: function draw(context, size) {
        var r = Math.sqrt(size / pi$1);
        context.moveTo(r, 0);
        context.arc(0, 0, r, 0, tau$1);
      }
    };

    function _point(that, x, y) {
      that._context.bezierCurveTo((2 * that._x0 + that._x1) / 3, (2 * that._y0 + that._y1) / 3, (that._x0 + 2 * that._x1) / 3, (that._y0 + 2 * that._y1) / 3, (that._x0 + 4 * that._x1 + x) / 6, (that._y0 + 4 * that._y1 + y) / 6);
    }

    function Basis(context) {
      this._context = context;
    }

    Basis.prototype = {
      areaStart: function areaStart() {
        this._line = 0;
      },
      areaEnd: function areaEnd() {
        this._line = NaN;
      },
      lineStart: function lineStart() {
        this._x0 = this._x1 = this._y0 = this._y1 = NaN;
        this._point = 0;
      },
      lineEnd: function lineEnd() {
        switch (this._point) {
          case 3:
            _point(this, this._x1, this._y1); // proceed
          case 2:
            this._context.lineTo(this._x1, this._y1);break;
        }
        if (this._line || this._line !== 0 && this._point === 1) this._context.closePath();
        this._line = 1 - this._line;
      },
      point: function point(x, y) {
        x = +x, y = +y;
        switch (this._point) {
          case 0:
            this._point = 1;this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y);break;
          case 1:
            this._point = 2;break;
          case 2:
            this._point = 3;this._context.lineTo((5 * this._x0 + this._x1) / 6, (5 * this._y0 + this._y1) / 6); // proceed
          default:
            _point(this, x, y);break;
        }
        this._x0 = this._x1, this._x1 = x;
        this._y0 = this._y1, this._y1 = y;
      }
    };

    function _point$1(that, x, y) {
      that._context.bezierCurveTo(that._x1 + that._k * (that._x2 - that._x0), that._y1 + that._k * (that._y2 - that._y0), that._x2 + that._k * (that._x1 - x), that._y2 + that._k * (that._y1 - y), that._x2, that._y2);
    }

    function _point$2(that, x, y) {
      var x1 = that._x1,
          y1 = that._y1,
          x2 = that._x2,
          y2 = that._y2;

      if (that._l01_a > epsilon$1) {
        var a = 2 * that._l01_2a + 3 * that._l01_a * that._l12_a + that._l12_2a,
            n = 3 * that._l01_a * (that._l01_a + that._l12_a);
        x1 = (x1 * a - that._x0 * that._l12_2a + that._x2 * that._l01_2a) / n;
        y1 = (y1 * a - that._y0 * that._l12_2a + that._y2 * that._l01_2a) / n;
      }

      if (that._l23_a > epsilon$1) {
        var b = 2 * that._l23_2a + 3 * that._l23_a * that._l12_a + that._l12_2a,
            m = 3 * that._l23_a * (that._l23_a + that._l12_a);
        x2 = (x2 * b + that._x1 * that._l23_2a - x * that._l12_2a) / m;
        y2 = (y2 * b + that._y1 * that._l23_2a - y * that._l12_2a) / m;
      }

      that._context.bezierCurveTo(x1, y1, x2, y2, that._x2, that._y2);
    }

    function sign(x) {
      return x < 0 ? -1 : 1;
    }

    // Calculate the slopes of the tangents (Hermite-type interpolation) based on
    // the following paper: Steffen, M. 1990. A Simple Method for Monotonic
    // Interpolation in One Dimension. Astronomy and Astrophysics, Vol. 239, NO.
    // NOV(II), P. 443, 1990.
    function slope3(that, x2, y2) {
      var h0 = that._x1 - that._x0,
          h1 = x2 - that._x1,
          s0 = (that._y1 - that._y0) / (h0 || h1 < 0 && -0),
          s1 = (y2 - that._y1) / (h1 || h0 < 0 && -0),
          p = (s0 * h1 + s1 * h0) / (h0 + h1);
      return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
    }

    // Calculate a one-sided slope.
    function slope2(that, t) {
      var h = that._x1 - that._x0;
      return h ? (3 * (that._y1 - that._y0) / h - t) / 2 : t;
    }

    // According to https://en.wikipedia.org/wiki/Cubic_Hermite_spline#Representations
    // "you can express cubic Hermite interpolation in terms of cubic Bézier curves
    // with respect to the four values p0, p0 + m0 / 3, p1 - m1 / 3, p1".
    function _point$3(that, t0, t1) {
      var x0 = that._x0,
          y0 = that._y0,
          x1 = that._x1,
          y1 = that._y1,
          dx = (x1 - x0) / 3;
      that._context.bezierCurveTo(x0 + dx, y0 + dx * t0, x1 - dx, y1 - dx * t1, x1, y1);
    }

    function MonotoneX(context) {
      this._context = context;
    }

    MonotoneX.prototype = {
      areaStart: function areaStart() {
        this._line = 0;
      },
      areaEnd: function areaEnd() {
        this._line = NaN;
      },
      lineStart: function lineStart() {
        this._x0 = this._x1 = this._y0 = this._y1 = this._t0 = NaN;
        this._point = 0;
      },
      lineEnd: function lineEnd() {
        switch (this._point) {
          case 2:
            this._context.lineTo(this._x1, this._y1);break;
          case 3:
            _point$3(this, this._t0, slope2(this, this._t0));break;
        }
        if (this._line || this._line !== 0 && this._point === 1) this._context.closePath();
        this._line = 1 - this._line;
      },
      point: function point(x, y) {
        var t1 = NaN;

        x = +x, y = +y;
        if (x === this._x1 && y === this._y1) return; // Ignore coincident points.
        switch (this._point) {
          case 0:
            this._point = 1;this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y);break;
          case 1:
            this._point = 2;break;
          case 2:
            this._point = 3;_point$3(this, slope2(this, t1 = slope3(this, x, y)), t1);break;
          default:
            _point$3(this, this._t0, t1 = slope3(this, x, y));break;
        }

        this._x0 = this._x1, this._x1 = x;
        this._y0 = this._y1, this._y1 = y;
        this._t0 = t1;
      }
    };

    function MonotoneY(context) {
      this._context = new ReflectContext(context);
    }

    (MonotoneY.prototype = Object.create(MonotoneX.prototype)).point = function (x, y) {
      MonotoneX.prototype.point.call(this, y, x);
    };

    function ReflectContext(context) {
      this._context = context;
    }

    ReflectContext.prototype = {
      moveTo: function moveTo(x, y) {
        this._context.moveTo(y, x);
      },
      closePath: function closePath() {
        this._context.closePath();
      },
      lineTo: function lineTo(x, y) {
        this._context.lineTo(y, x);
      },
      bezierCurveTo: function bezierCurveTo(x1, y1, x2, y2, x, y) {
        this._context.bezierCurveTo(y1, x1, y2, x2, y, x);
      }
    };

    // See https://www.particleincell.com/2012/bezier-splines/ for derivation.
    function controlPoints(x) {
      var i,
          n = x.length - 1,
          m,
          a = new Array(n),
          b = new Array(n),
          r = new Array(n);
      a[0] = 0, b[0] = 2, r[0] = x[0] + 2 * x[1];
      for (i = 1; i < n - 1; ++i) {
        a[i] = 1, b[i] = 4, r[i] = 4 * x[i] + 2 * x[i + 1];
      }a[n - 1] = 2, b[n - 1] = 7, r[n - 1] = 8 * x[n - 1] + x[n];
      for (i = 1; i < n; ++i) {
        m = a[i] / b[i - 1], b[i] -= m, r[i] -= m * r[i - 1];
      }a[n - 1] = r[n - 1] / b[n - 1];
      for (i = n - 2; i >= 0; --i) {
        a[i] = (r[i] - a[i + 1]) / b[i];
      }b[n - 1] = (x[n] + a[n - 1]) / 2;
      for (i = 0; i < n - 1; ++i) {
        b[i] = 2 * x[i + 1] - a[i + 1];
      }return [a, b];
    }

    var slice = Array.prototype.slice;

    var none$1 = function (series, order) {
      if (!((n = series.length) > 1)) return;
      for (var i = 1, s0, s1 = series[order[0]], n, m = s1.length; i < n; ++i) {
        s0 = s1, s1 = series[order[i]];
        for (var j = 0; j < m; ++j) {
          s1[j][1] += s1[j][0] = isNaN(s0[j][1]) ? s0[j][0] : s0[j][1];
        }
      }
    };

    var none$2 = function (series) {
      var n = series.length,
          o = new Array(n);
      while (--n >= 0) {
        o[n] = n;
      }return o;
    };

    function stackValue(d, key) {
      return d[key];
    }

    function sum(series) {
      var s = 0,
          i = -1,
          n = series.length,
          v;
      while (++i < n) {
        if (v = +series[i][1]) s += v;
      }return s;
    }

    var ascending$2 = function (a, b) {
      return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
    };

    var bisector = function (compare) {
      if (compare.length === 1) compare = ascendingComparator(compare);
      return {
        left: function left(a, x, lo, hi) {
          if (lo == null) lo = 0;
          if (hi == null) hi = a.length;
          while (lo < hi) {
            var mid = lo + hi >>> 1;
            if (compare(a[mid], x) < 0) lo = mid + 1;else hi = mid;
          }
          return lo;
        },
        right: function right(a, x, lo, hi) {
          if (lo == null) lo = 0;
          if (hi == null) hi = a.length;
          while (lo < hi) {
            var mid = lo + hi >>> 1;
            if (compare(a[mid], x) > 0) hi = mid;else lo = mid + 1;
          }
          return lo;
        }
      };
    };

    function ascendingComparator(f) {
      return function (d, x) {
        return ascending$2(f(d), x);
      };
    }

    var ascendingBisect = bisector(ascending$2);
    var bisectRight = ascendingBisect.right;

    var number = function (x) {
      return x === null ? NaN : +x;
    };

    var extent = function (array, f) {
      var i = -1,
          n = array.length,
          a,
          b,
          c;

      if (f == null) {
        while (++i < n) {
          if ((b = array[i]) != null && b >= b) {
            a = c = b;break;
          }
        }while (++i < n) {
          if ((b = array[i]) != null) {
            if (a > b) a = b;
            if (c < b) c = b;
          }
        }
      } else {
        while (++i < n) {
          if ((b = f(array[i], i, array)) != null && b >= b) {
            a = c = b;break;
          }
        }while (++i < n) {
          if ((b = f(array[i], i, array)) != null) {
            if (a > b) a = b;
            if (c < b) c = b;
          }
        }
      }

      return [a, c];
    };

    var array = Array.prototype;

    var slice$1 = array.slice;
    var map = array.map;

    var constant$3 = function (x) {
      return function () {
        return x;
      };
    };

    var identity$1 = function (x) {
      return x;
    };

    var range = function (start, stop, step) {
      start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;

      var i = -1,
          n = Math.max(0, Math.ceil((stop - start) / step)) | 0,
          range = new Array(n);

      while (++i < n) {
        range[i] = start + i * step;
      }

      return range;
    };

    var e10 = Math.sqrt(50);
    var e5 = Math.sqrt(10);
    var e2 = Math.sqrt(2);

    var ticks = function (start, stop, count) {
      var step = tickStep(start, stop, count);
      return range(Math.ceil(start / step) * step, Math.floor(stop / step) * step + step / 2, // inclusive
      step);
    };

    function tickStep(start, stop, count) {
      var step0 = Math.abs(stop - start) / Math.max(0, count),
          step1 = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10)),
          error = step0 / step1;
      if (error >= e10) step1 *= 10;else if (error >= e5) step1 *= 5;else if (error >= e2) step1 *= 2;
      return stop < start ? -step1 : step1;
    }

    var sturges = function (values) {
      return Math.ceil(Math.log(values.length) / Math.LN2) + 1;
    };

    var threshold = function (array, p, f) {
      if (f == null) f = number;
      if (!(n = array.length)) return;
      if ((p = +p) <= 0 || n < 2) return +f(array[0], 0, array);
      if (p >= 1) return +f(array[n - 1], n - 1, array);
      var n,
          h = (n - 1) * p,
          i = Math.floor(h),
          a = +f(array[i], i, array),
          b = +f(array[i + 1], i + 1, array);
      return a + (b - a) * (h - i);
    };

    var min = function (array, f) {
      var i = -1,
          n = array.length,
          a,
          b;

      if (f == null) {
        while (++i < n) {
          if ((b = array[i]) != null && b >= b) {
            a = b;break;
          }
        }while (++i < n) {
          if ((b = array[i]) != null && a > b) a = b;
        }
      } else {
        while (++i < n) {
          if ((b = f(array[i], i, array)) != null && b >= b) {
            a = b;break;
          }
        }while (++i < n) {
          if ((b = f(array[i], i, array)) != null && a > b) a = b;
        }
      }

      return a;
    };

    function length(d) {
      return d.length;
    }

    var prefix = "$";

    function Map() {}

    Map.prototype = map$1.prototype = {
      constructor: Map,
      has: function has(key) {
        return prefix + key in this;
      },
      get: function get(key) {
        return this[prefix + key];
      },
      set: function set(key, value) {
        this[prefix + key] = value;
        return this;
      },
      remove: function remove(key) {
        var property = prefix + key;
        return property in this && delete this[property];
      },
      clear: function clear() {
        for (var property in this) {
          if (property[0] === prefix) delete this[property];
        }
      },
      keys: function keys() {
        var keys = [];
        for (var property in this) {
          if (property[0] === prefix) keys.push(property.slice(1));
        }return keys;
      },
      values: function values() {
        var values = [];
        for (var property in this) {
          if (property[0] === prefix) values.push(this[property]);
        }return values;
      },
      entries: function entries() {
        var entries = [];
        for (var property in this) {
          if (property[0] === prefix) entries.push({ key: property.slice(1), value: this[property] });
        }return entries;
      },
      size: function size() {
        var size = 0;
        for (var property in this) {
          if (property[0] === prefix) ++size;
        }return size;
      },
      empty: function empty() {
        for (var property in this) {
          if (property[0] === prefix) return false;
        }return true;
      },
      each: function each(f) {
        for (var property in this) {
          if (property[0] === prefix) f(this[property], property.slice(1), this);
        }
      }
    };

    function map$1(object, f) {
      var map = new Map();

      // Copy constructor.
      if (object instanceof Map) object.each(function (value, key) {
        map.set(key, value);
      });

      // Index array by numeric index or specified key function.
      else if (Array.isArray(object)) {
          var i = -1,
              n = object.length,
              o;

          if (f == null) while (++i < n) {
            map.set(i, object[i]);
          } else while (++i < n) {
            map.set(f(o = object[i], i, object), o);
          }
        }

        // Convert object to map.
        else if (object) for (var key in object) {
            map.set(key, object[key]);
          }return map;
    }

    function createObject() {
      return {};
    }

    function setObject(object, key, value) {
      object[key] = value;
    }

    function createMap() {
      return map$1();
    }

    function setMap(map, key, value) {
      map.set(key, value);
    }

    function Set() {}

    var proto = map$1.prototype;

    Set.prototype = set$1.prototype = {
      constructor: Set,
      has: proto.has,
      add: function add(value) {
        value += "";
        this[prefix + value] = value;
        return this;
      },
      remove: proto.remove,
      clear: proto.clear,
      values: proto.keys,
      size: proto.size,
      empty: proto.empty,
      each: proto.each
    };

    function set$1(object, f) {
      var set = new Set();

      // Copy constructor.
      if (object instanceof Set) object.each(function (value) {
        set.add(value);
      });

      // Otherwise, assume it’s an array.
      else if (object) {
          var i = -1,
              n = object.length;
          if (f == null) while (++i < n) {
            set.add(object[i]);
          } else while (++i < n) {
            set.add(f(object[i], i, object));
          }
        }

      return set;
    }

    var array$1 = Array.prototype;

    var map$3 = array$1.map;
    var slice$2 = array$1.slice;

    var implicit = { name: "implicit" };

    function ordinal(range) {
      var index = map$1(),
          domain = [],
          unknown = implicit;

      range = range == null ? [] : slice$2.call(range);

      function scale(d) {
        var key = d + "",
            i = index.get(key);
        if (!i) {
          if (unknown !== implicit) return unknown;
          index.set(key, i = domain.push(d));
        }
        return range[(i - 1) % range.length];
      }

      scale.domain = function (_) {
        if (!arguments.length) return domain.slice();
        domain = [], index = map$1();
        var i = -1,
            n = _.length,
            d,
            key;
        while (++i < n) {
          if (!index.has(key = (d = _[i]) + "")) index.set(key, domain.push(d));
        }return scale;
      };

      scale.range = function (_) {
        return arguments.length ? (range = slice$2.call(_), scale) : range.slice();
      };

      scale.unknown = function (_) {
        return arguments.length ? (unknown = _, scale) : unknown;
      };

      scale.copy = function () {
        return ordinal().domain(domain).range(range).unknown(unknown);
      };

      return scale;
    }

    function band() {
      var scale = ordinal().unknown(undefined),
          domain = scale.domain,
          ordinalRange = scale.range,
          range$$1 = [0, 1],
          step,
          bandwidth,
          round = false,
          paddingInner = 0,
          paddingOuter = 0,
          align = 0.5;

      delete scale.unknown;

      function rescale() {
        var n = domain().length,
            reverse = range$$1[1] < range$$1[0],
            start = range$$1[reverse - 0],
            stop = range$$1[1 - reverse];
        step = (stop - start) / Math.max(1, n - paddingInner + paddingOuter * 2);
        if (round) step = Math.floor(step);
        start += (stop - start - step * (n - paddingInner)) * align;
        bandwidth = step * (1 - paddingInner);
        if (round) start = Math.round(start), bandwidth = Math.round(bandwidth);
        var values = range(n).map(function (i) {
          return start + step * i;
        });
        return ordinalRange(reverse ? values.reverse() : values);
      }

      scale.domain = function (_) {
        return arguments.length ? (domain(_), rescale()) : domain();
      };

      scale.range = function (_) {
        return arguments.length ? (range$$1 = [+_[0], +_[1]], rescale()) : range$$1.slice();
      };

      scale.rangeRound = function (_) {
        return range$$1 = [+_[0], +_[1]], round = true, rescale();
      };

      scale.bandwidth = function () {
        return bandwidth;
      };

      scale.step = function () {
        return step;
      };

      scale.round = function (_) {
        return arguments.length ? (round = !!_, rescale()) : round;
      };

      scale.padding = function (_) {
        return arguments.length ? (paddingInner = paddingOuter = Math.max(0, Math.min(1, _)), rescale()) : paddingInner;
      };

      scale.paddingInner = function (_) {
        return arguments.length ? (paddingInner = Math.max(0, Math.min(1, _)), rescale()) : paddingInner;
      };

      scale.paddingOuter = function (_) {
        return arguments.length ? (paddingOuter = Math.max(0, Math.min(1, _)), rescale()) : paddingOuter;
      };

      scale.align = function (_) {
        return arguments.length ? (align = Math.max(0, Math.min(1, _)), rescale()) : align;
      };

      scale.copy = function () {
        return band().domain(domain()).range(range$$1).round(round).paddingInner(paddingInner).paddingOuter(paddingOuter).align(align);
      };

      return rescale();
    }

    function pointish(scale) {
      var copy = scale.copy;

      scale.padding = scale.paddingOuter;
      delete scale.paddingInner;
      delete scale.paddingOuter;

      scale.copy = function () {
        return pointish(copy());
      };

      return scale;
    }

    function point$2() {
      return pointish(band().paddingInner(1));
    }

    var define = function (constructor, factory, prototype) {
      constructor.prototype = factory.prototype = prototype;
      prototype.constructor = constructor;
    };

    function extend(parent, definition) {
      var prototype = Object.create(parent.prototype);
      for (var key in definition) {
        prototype[key] = definition[key];
      }return prototype;
    }

    function Color() {}

    var _darker = 0.7;
    var _brighter = 1 / _darker;

    var reI = "\\s*([+-]?\\d+)\\s*";
    var reN = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*";
    var reP = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*";
    var reHex3 = /^#([0-9a-f]{3})$/;
    var reHex6 = /^#([0-9a-f]{6})$/;
    var reRgbInteger = new RegExp("^rgb\\(" + [reI, reI, reI] + "\\)$");
    var reRgbPercent = new RegExp("^rgb\\(" + [reP, reP, reP] + "\\)$");
    var reRgbaInteger = new RegExp("^rgba\\(" + [reI, reI, reI, reN] + "\\)$");
    var reRgbaPercent = new RegExp("^rgba\\(" + [reP, reP, reP, reN] + "\\)$");
    var reHslPercent = new RegExp("^hsl\\(" + [reN, reP, reP] + "\\)$");
    var reHslaPercent = new RegExp("^hsla\\(" + [reN, reP, reP, reN] + "\\)$");

    var named = {
      aliceblue: 0xf0f8ff,
      antiquewhite: 0xfaebd7,
      aqua: 0x00ffff,
      aquamarine: 0x7fffd4,
      azure: 0xf0ffff,
      beige: 0xf5f5dc,
      bisque: 0xffe4c4,
      black: 0x000000,
      blanchedalmond: 0xffebcd,
      blue: 0x0000ff,
      blueviolet: 0x8a2be2,
      brown: 0xa52a2a,
      burlywood: 0xdeb887,
      cadetblue: 0x5f9ea0,
      chartreuse: 0x7fff00,
      chocolate: 0xd2691e,
      coral: 0xff7f50,
      cornflowerblue: 0x6495ed,
      cornsilk: 0xfff8dc,
      crimson: 0xdc143c,
      cyan: 0x00ffff,
      darkblue: 0x00008b,
      darkcyan: 0x008b8b,
      darkgoldenrod: 0xb8860b,
      darkgray: 0xa9a9a9,
      darkgreen: 0x006400,
      darkgrey: 0xa9a9a9,
      darkkhaki: 0xbdb76b,
      darkmagenta: 0x8b008b,
      darkolivegreen: 0x556b2f,
      darkorange: 0xff8c00,
      darkorchid: 0x9932cc,
      darkred: 0x8b0000,
      darksalmon: 0xe9967a,
      darkseagreen: 0x8fbc8f,
      darkslateblue: 0x483d8b,
      darkslategray: 0x2f4f4f,
      darkslategrey: 0x2f4f4f,
      darkturquoise: 0x00ced1,
      darkviolet: 0x9400d3,
      deeppink: 0xff1493,
      deepskyblue: 0x00bfff,
      dimgray: 0x696969,
      dimgrey: 0x696969,
      dodgerblue: 0x1e90ff,
      firebrick: 0xb22222,
      floralwhite: 0xfffaf0,
      forestgreen: 0x228b22,
      fuchsia: 0xff00ff,
      gainsboro: 0xdcdcdc,
      ghostwhite: 0xf8f8ff,
      gold: 0xffd700,
      goldenrod: 0xdaa520,
      gray: 0x808080,
      green: 0x008000,
      greenyellow: 0xadff2f,
      grey: 0x808080,
      honeydew: 0xf0fff0,
      hotpink: 0xff69b4,
      indianred: 0xcd5c5c,
      indigo: 0x4b0082,
      ivory: 0xfffff0,
      khaki: 0xf0e68c,
      lavender: 0xe6e6fa,
      lavenderblush: 0xfff0f5,
      lawngreen: 0x7cfc00,
      lemonchiffon: 0xfffacd,
      lightblue: 0xadd8e6,
      lightcoral: 0xf08080,
      lightcyan: 0xe0ffff,
      lightgoldenrodyellow: 0xfafad2,
      lightgray: 0xd3d3d3,
      lightgreen: 0x90ee90,
      lightgrey: 0xd3d3d3,
      lightpink: 0xffb6c1,
      lightsalmon: 0xffa07a,
      lightseagreen: 0x20b2aa,
      lightskyblue: 0x87cefa,
      lightslategray: 0x778899,
      lightslategrey: 0x778899,
      lightsteelblue: 0xb0c4de,
      lightyellow: 0xffffe0,
      lime: 0x00ff00,
      limegreen: 0x32cd32,
      linen: 0xfaf0e6,
      magenta: 0xff00ff,
      maroon: 0x800000,
      mediumaquamarine: 0x66cdaa,
      mediumblue: 0x0000cd,
      mediumorchid: 0xba55d3,
      mediumpurple: 0x9370db,
      mediumseagreen: 0x3cb371,
      mediumslateblue: 0x7b68ee,
      mediumspringgreen: 0x00fa9a,
      mediumturquoise: 0x48d1cc,
      mediumvioletred: 0xc71585,
      midnightblue: 0x191970,
      mintcream: 0xf5fffa,
      mistyrose: 0xffe4e1,
      moccasin: 0xffe4b5,
      navajowhite: 0xffdead,
      navy: 0x000080,
      oldlace: 0xfdf5e6,
      olive: 0x808000,
      olivedrab: 0x6b8e23,
      orange: 0xffa500,
      orangered: 0xff4500,
      orchid: 0xda70d6,
      palegoldenrod: 0xeee8aa,
      palegreen: 0x98fb98,
      paleturquoise: 0xafeeee,
      palevioletred: 0xdb7093,
      papayawhip: 0xffefd5,
      peachpuff: 0xffdab9,
      peru: 0xcd853f,
      pink: 0xffc0cb,
      plum: 0xdda0dd,
      powderblue: 0xb0e0e6,
      purple: 0x800080,
      rebeccapurple: 0x663399,
      red: 0xff0000,
      rosybrown: 0xbc8f8f,
      royalblue: 0x4169e1,
      saddlebrown: 0x8b4513,
      salmon: 0xfa8072,
      sandybrown: 0xf4a460,
      seagreen: 0x2e8b57,
      seashell: 0xfff5ee,
      sienna: 0xa0522d,
      silver: 0xc0c0c0,
      skyblue: 0x87ceeb,
      slateblue: 0x6a5acd,
      slategray: 0x708090,
      slategrey: 0x708090,
      snow: 0xfffafa,
      springgreen: 0x00ff7f,
      steelblue: 0x4682b4,
      tan: 0xd2b48c,
      teal: 0x008080,
      thistle: 0xd8bfd8,
      tomato: 0xff6347,
      turquoise: 0x40e0d0,
      violet: 0xee82ee,
      wheat: 0xf5deb3,
      white: 0xffffff,
      whitesmoke: 0xf5f5f5,
      yellow: 0xffff00,
      yellowgreen: 0x9acd32
    };

    define(Color, color, {
      displayable: function displayable() {
        return this.rgb().displayable();
      },
      toString: function toString() {
        return this.rgb() + "";
      }
    });

    function color(format) {
      var m;
      format = (format + "").trim().toLowerCase();
      return (m = reHex3.exec(format)) ? (m = parseInt(m[1], 16), new Rgb(m >> 8 & 0xf | m >> 4 & 0x0f0, m >> 4 & 0xf | m & 0xf0, (m & 0xf) << 4 | m & 0xf, 1) // #f00
      ) : (m = reHex6.exec(format)) ? rgbn(parseInt(m[1], 16)) // #ff0000
      : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
      : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
      : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
      : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
      : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
      : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
      : named.hasOwnProperty(format) ? rgbn(named[format]) : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0) : null;
    }

    function rgbn(n) {
      return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
    }

    function rgba(r, g, b, a) {
      if (a <= 0) r = g = b = NaN;
      return new Rgb(r, g, b, a);
    }

    function rgbConvert(o) {
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Rgb();
      o = o.rgb();
      return new Rgb(o.r, o.g, o.b, o.opacity);
    }

    function rgb$1(r, g, b, opacity) {
      return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
    }

    function Rgb(r, g, b, opacity) {
      this.r = +r;
      this.g = +g;
      this.b = +b;
      this.opacity = +opacity;
    }

    define(Rgb, rgb$1, extend(Color, {
      brighter: function brighter(k) {
        k = k == null ? _brighter : Math.pow(_brighter, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      darker: function darker(k) {
        k = k == null ? _darker : Math.pow(_darker, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      rgb: function rgb$1() {
        return this;
      },
      displayable: function displayable() {
        return 0 <= this.r && this.r <= 255 && 0 <= this.g && this.g <= 255 && 0 <= this.b && this.b <= 255 && 0 <= this.opacity && this.opacity <= 1;
      },
      toString: function toString() {
        var a = this.opacity;a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
        return (a === 1 ? "rgb(" : "rgba(") + Math.max(0, Math.min(255, Math.round(this.r) || 0)) + ", " + Math.max(0, Math.min(255, Math.round(this.g) || 0)) + ", " + Math.max(0, Math.min(255, Math.round(this.b) || 0)) + (a === 1 ? ")" : ", " + a + ")");
      }
    }));

    function hsla(h, s, l, a) {
      if (a <= 0) h = s = l = NaN;else if (l <= 0 || l >= 1) h = s = NaN;else if (s <= 0) h = NaN;
      return new Hsl(h, s, l, a);
    }

    function hslConvert(o) {
      if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Hsl();
      if (o instanceof Hsl) return o;
      o = o.rgb();
      var r = o.r / 255,
          g = o.g / 255,
          b = o.b / 255,
          min = Math.min(r, g, b),
          max = Math.max(r, g, b),
          h = NaN,
          s = max - min,
          l = (max + min) / 2;
      if (s) {
        if (r === max) h = (g - b) / s + (g < b) * 6;else if (g === max) h = (b - r) / s + 2;else h = (r - g) / s + 4;
        s /= l < 0.5 ? max + min : 2 - max - min;
        h *= 60;
      } else {
        s = l > 0 && l < 1 ? 0 : h;
      }
      return new Hsl(h, s, l, o.opacity);
    }

    function hsl(h, s, l, opacity) {
      return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
    }

    function Hsl(h, s, l, opacity) {
      this.h = +h;
      this.s = +s;
      this.l = +l;
      this.opacity = +opacity;
    }

    define(Hsl, hsl, extend(Color, {
      brighter: function brighter(k) {
        k = k == null ? _brighter : Math.pow(_brighter, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      darker: function darker(k) {
        k = k == null ? _darker : Math.pow(_darker, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      rgb: function rgb$1() {
        var h = this.h % 360 + (this.h < 0) * 360,
            s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
            l = this.l,
            m2 = l + (l < 0.5 ? l : 1 - l) * s,
            m1 = 2 * l - m2;
        return new Rgb(hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2), hsl2rgb(h, m1, m2), hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2), this.opacity);
      },
      displayable: function displayable() {
        return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
      }
    }));

    /* From FvD 13.37, CSS Color Module Level 3 */
    function hsl2rgb(h, m1, m2) {
      return (h < 60 ? m1 + (m2 - m1) * h / 60 : h < 180 ? m2 : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60 : m1) * 255;
    }

    var deg2rad = Math.PI / 180;
    var rad2deg = 180 / Math.PI;

    var Kn = 18;
    var Xn = 0.950470;
    var Yn = 1;
    var Zn = 1.088830;
    var t0 = 4 / 29;
    var t1 = 6 / 29;
    var t2 = 3 * t1 * t1;
    var t3 = t1 * t1 * t1;

    function labConvert(o) {
      if (o instanceof Lab) return new Lab(o.l, o.a, o.b, o.opacity);
      if (o instanceof Hcl) {
        var h = o.h * deg2rad;
        return new Lab(o.l, Math.cos(h) * o.c, Math.sin(h) * o.c, o.opacity);
      }
      if (!(o instanceof Rgb)) o = rgbConvert(o);
      var b = rgb2xyz(o.r),
          a = rgb2xyz(o.g),
          l = rgb2xyz(o.b),
          x = xyz2lab((0.4124564 * b + 0.3575761 * a + 0.1804375 * l) / Xn),
          y = xyz2lab((0.2126729 * b + 0.7151522 * a + 0.0721750 * l) / Yn),
          z = xyz2lab((0.0193339 * b + 0.1191920 * a + 0.9503041 * l) / Zn);
      return new Lab(116 * y - 16, 500 * (x - y), 200 * (y - z), o.opacity);
    }

    function lab(l, a, b, opacity) {
      return arguments.length === 1 ? labConvert(l) : new Lab(l, a, b, opacity == null ? 1 : opacity);
    }

    function Lab(l, a, b, opacity) {
      this.l = +l;
      this.a = +a;
      this.b = +b;
      this.opacity = +opacity;
    }

    define(Lab, lab, extend(Color, {
      brighter: function brighter(k) {
        return new Lab(this.l + Kn * (k == null ? 1 : k), this.a, this.b, this.opacity);
      },
      darker: function darker(k) {
        return new Lab(this.l - Kn * (k == null ? 1 : k), this.a, this.b, this.opacity);
      },
      rgb: function rgb() {
        var y = (this.l + 16) / 116,
            x = isNaN(this.a) ? y : y + this.a / 500,
            z = isNaN(this.b) ? y : y - this.b / 200;
        y = Yn * lab2xyz(y);
        x = Xn * lab2xyz(x);
        z = Zn * lab2xyz(z);
        return new Rgb(xyz2rgb(3.2404542 * x - 1.5371385 * y - 0.4985314 * z), // D65 -> sRGB
        xyz2rgb(-0.9692660 * x + 1.8760108 * y + 0.0415560 * z), xyz2rgb(0.0556434 * x - 0.2040259 * y + 1.0572252 * z), this.opacity);
      }
    }));

    function xyz2lab(t) {
      return t > t3 ? Math.pow(t, 1 / 3) : t / t2 + t0;
    }

    function lab2xyz(t) {
      return t > t1 ? t * t * t : t2 * (t - t0);
    }

    function xyz2rgb(x) {
      return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
    }

    function rgb2xyz(x) {
      return (x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    }

    function hclConvert(o) {
      if (o instanceof Hcl) return new Hcl(o.h, o.c, o.l, o.opacity);
      if (!(o instanceof Lab)) o = labConvert(o);
      var h = Math.atan2(o.b, o.a) * rad2deg;
      return new Hcl(h < 0 ? h + 360 : h, Math.sqrt(o.a * o.a + o.b * o.b), o.l, o.opacity);
    }

    function hcl(h, c, l, opacity) {
      return arguments.length === 1 ? hclConvert(h) : new Hcl(h, c, l, opacity == null ? 1 : opacity);
    }

    function Hcl(h, c, l, opacity) {
      this.h = +h;
      this.c = +c;
      this.l = +l;
      this.opacity = +opacity;
    }

    define(Hcl, hcl, extend(Color, {
      brighter: function brighter(k) {
        return new Hcl(this.h, this.c, this.l + Kn * (k == null ? 1 : k), this.opacity);
      },
      darker: function darker(k) {
        return new Hcl(this.h, this.c, this.l - Kn * (k == null ? 1 : k), this.opacity);
      },
      rgb: function rgb() {
        return labConvert(this).rgb();
      }
    }));

    var A = -0.14861;
    var B = +1.78277;
    var C = -0.29227;
    var D = -0.90649;
    var E = +1.97294;
    var ED = E * D;
    var EB = E * B;
    var BC_DA = B * C - D * A;

    function cubehelixConvert(o) {
      if (o instanceof Cubehelix) return new Cubehelix(o.h, o.s, o.l, o.opacity);
      if (!(o instanceof Rgb)) o = rgbConvert(o);
      var r = o.r / 255,
          g = o.g / 255,
          b = o.b / 255,
          l = (BC_DA * b + ED * r - EB * g) / (BC_DA + ED - EB),
          bl = b - l,
          k = (E * (g - l) - C * bl) / D,
          s = Math.sqrt(k * k + bl * bl) / (E * l * (1 - l)),
          // NaN if l=0 or l=1
      h = s ? Math.atan2(k, bl) * rad2deg - 120 : NaN;
      return new Cubehelix(h < 0 ? h + 360 : h, s, l, o.opacity);
    }

    function cubehelix(h, s, l, opacity) {
      return arguments.length === 1 ? cubehelixConvert(h) : new Cubehelix(h, s, l, opacity == null ? 1 : opacity);
    }

    function Cubehelix(h, s, l, opacity) {
      this.h = +h;
      this.s = +s;
      this.l = +l;
      this.opacity = +opacity;
    }

    define(Cubehelix, cubehelix, extend(Color, {
      brighter: function brighter(k) {
        k = k == null ? _brighter : Math.pow(_brighter, k);
        return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
      },
      darker: function darker(k) {
        k = k == null ? _darker : Math.pow(_darker, k);
        return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
      },
      rgb: function rgb() {
        var h = isNaN(this.h) ? 0 : (this.h + 120) * deg2rad,
            l = +this.l,
            a = isNaN(this.s) ? 0 : this.s * l * (1 - l),
            cosh = Math.cos(h),
            sinh = Math.sin(h);
        return new Rgb(255 * (l + a * (A * cosh + B * sinh)), 255 * (l + a * (C * cosh + D * sinh)), 255 * (l + a * (E * cosh)), this.opacity);
      }
    }));

    function basis$1(t1, v0, v1, v2, v3) {
      var t2 = t1 * t1,
          t3 = t2 * t1;
      return ((1 - 3 * t1 + 3 * t2 - t3) * v0 + (4 - 6 * t2 + 3 * t3) * v1 + (1 + 3 * t1 + 3 * t2 - 3 * t3) * v2 + t3 * v3) / 6;
    }

    var constant$4 = function (x) {
      return function () {
        return x;
      };
    };

    function linear$1(a, d) {
      return function (t) {
        return a + t * d;
      };
    }

    function exponential(a, b, y) {
      return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function (t) {
        return Math.pow(a + t * b, y);
      };
    }

    function hue(a, b) {
      var d = b - a;
      return d ? linear$1(a, d > 180 || d < -180 ? d - 360 * Math.round(d / 360) : d) : constant$4(isNaN(a) ? b : a);
    }

    function gamma(y) {
      return (y = +y) === 1 ? nogamma : function (a, b) {
        return b - a ? exponential(a, b, y) : constant$4(isNaN(a) ? b : a);
      };
    }

    function nogamma(a, b) {
      var d = b - a;
      return d ? linear$1(a, d) : constant$4(isNaN(a) ? b : a);
    }

    var rgb$2 = (function rgbGamma(y) {
      var color$$1 = gamma(y);

      function rgb$$1(start, end) {
        var r = color$$1((start = rgb$1(start)).r, (end = rgb$1(end)).r),
            g = color$$1(start.g, end.g),
            b = color$$1(start.b, end.b),
            opacity = color$$1(start.opacity, end.opacity);
        return function (t) {
          start.r = r(t);
          start.g = g(t);
          start.b = b(t);
          start.opacity = opacity(t);
          return start + "";
        };
      }

      rgb$$1.gamma = rgbGamma;

      return rgb$$1;
    })(1);

    var array$2 = function (a, b) {
      var nb = b ? b.length : 0,
          na = a ? Math.min(nb, a.length) : 0,
          x = new Array(nb),
          c = new Array(nb),
          i;

      for (i = 0; i < na; ++i) {
        x[i] = interpolateValue(a[i], b[i]);
      }for (; i < nb; ++i) {
        c[i] = b[i];
      }return function (t) {
        for (i = 0; i < na; ++i) {
          c[i] = x[i](t);
        }return c;
      };
    };

    var date = function (a, b) {
      var d = new Date();
      return a = +a, b -= a, function (t) {
        return d.setTime(a + b * t), d;
      };
    };

    var reinterpolate = function (a, b) {
      return a = +a, b -= a, function (t) {
        return a + b * t;
      };
    };

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
      return typeof obj;
    } : function (obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };











    var classCallCheck = function (instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    };

    var createClass = function () {
      function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
          var descriptor = props[i];
          descriptor.enumerable = descriptor.enumerable || false;
          descriptor.configurable = true;
          if ("value" in descriptor) descriptor.writable = true;
          Object.defineProperty(target, descriptor.key, descriptor);
        }
      }

      return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);
        if (staticProps) defineProperties(Constructor, staticProps);
        return Constructor;
      };
    }();







    var get$1 = function get$1(object, property, receiver) {
      if (object === null) object = Function.prototype;
      var desc = Object.getOwnPropertyDescriptor(object, property);

      if (desc === undefined) {
        var parent = Object.getPrototypeOf(object);

        if (parent === null) {
          return undefined;
        } else {
          return get$1(parent, property, receiver);
        }
      } else if ("value" in desc) {
        return desc.value;
      } else {
        var getter = desc.get;

        if (getter === undefined) {
          return undefined;
        }

        return getter.call(receiver);
      }
    };

















    var set$3 = function set$3(object, property, value, receiver) {
      var desc = Object.getOwnPropertyDescriptor(object, property);

      if (desc === undefined) {
        var parent = Object.getPrototypeOf(object);

        if (parent !== null) {
          set$3(parent, property, value, receiver);
        }
      } else if ("value" in desc && desc.writable) {
        desc.value = value;
      } else {
        var setter = desc.set;

        if (setter !== undefined) {
          setter.call(receiver, value);
        }
      }

      return value;
    };

    var object$1 = function (a, b) {
      var i = {},
          c = {},
          k;

      if (a === null || (typeof a === "undefined" ? "undefined" : _typeof(a)) !== "object") a = {};
      if (b === null || (typeof b === "undefined" ? "undefined" : _typeof(b)) !== "object") b = {};

      for (k in b) {
        if (k in a) {
          i[k] = interpolateValue(a[k], b[k]);
        } else {
          c[k] = b[k];
        }
      }

      return function (t) {
        for (k in i) {
          c[k] = i[k](t);
        }return c;
      };
    };

    var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;
    var reB = new RegExp(reA.source, "g");

    function zero(b) {
      return function () {
        return b;
      };
    }

    function one(b) {
      return function (t) {
        return b(t) + "";
      };
    }

    var string = function (a, b) {
      var bi = reA.lastIndex = reB.lastIndex = 0,
          // scan index for next number in b
      am,
          // current match in a
      bm,
          // current match in b
      bs,
          // string preceding current number in b, if any
      i = -1,
          // index in s
      s = [],
          // string constants and placeholders
      q = []; // number interpolators

      // Coerce inputs to strings.
      a = a + "", b = b + "";

      // Interpolate pairs of numbers in a & b.
      while ((am = reA.exec(a)) && (bm = reB.exec(b))) {
        if ((bs = bm.index) > bi) {
          // a string precedes the next number in b
          bs = b.slice(bi, bs);
          if (s[i]) s[i] += bs; // coalesce with previous string
          else s[++i] = bs;
        }
        if ((am = am[0]) === (bm = bm[0])) {
          // numbers in a & b match
          if (s[i]) s[i] += bm; // coalesce with previous string
          else s[++i] = bm;
        } else {
          // interpolate non-matching numbers
          s[++i] = null;
          q.push({ i: i, x: reinterpolate(am, bm) });
        }
        bi = reB.lastIndex;
      }

      // Add remains of b.
      if (bi < b.length) {
        bs = b.slice(bi);
        if (s[i]) s[i] += bs; // coalesce with previous string
        else s[++i] = bs;
      }

      // Special optimization for only a single match.
      // Otherwise, interpolate each of the numbers and rejoin the string.
      return s.length < 2 ? q[0] ? one(q[0].x) : zero(b) : (b = q.length, function (t) {
        for (var i = 0, o; i < b; ++i) {
          s[(o = q[i]).i] = o.x(t);
        }return s.join("");
      });
    };

    var interpolateValue = function (a, b) {
        var t = typeof b === "undefined" ? "undefined" : _typeof(b),
            c;
        return b == null || t === "boolean" ? constant$4(b) : (t === "number" ? reinterpolate : t === "string" ? (c = color(b)) ? (b = c, rgb$2) : string : b instanceof color ? rgb$2 : b instanceof Date ? date : Array.isArray(b) ? array$2 : isNaN(b) ? object$1 : reinterpolate)(a, b);
    };

    var interpolateRound = function (a, b) {
      return a = +a, b -= a, function (t) {
        return Math.round(a + b * t);
      };
    };

    var degrees = 180 / Math.PI;

    var identity$3 = {
      translateX: 0,
      translateY: 0,
      rotate: 0,
      skewX: 0,
      scaleX: 1,
      scaleY: 1
    };

    var decompose = function (a, b, c, d, e, f) {
      var scaleX, scaleY, skewX;
      if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
      if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
      if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
      if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
      return {
        translateX: e,
        translateY: f,
        rotate: Math.atan2(b, a) * degrees,
        skewX: Math.atan(skewX) * degrees,
        scaleX: scaleX,
        scaleY: scaleY
      };
    };

    var cssNode;
    var cssRoot;
    var cssView;
    var svgNode;

    var rho = Math.SQRT2;
    var rho2 = 2;
    var rho4 = 4;
    var epsilon2 = 1e-12;

    function cosh(x) {
      return ((x = Math.exp(x)) + 1 / x) / 2;
    }

    function sinh(x) {
      return ((x = Math.exp(x)) - 1 / x) / 2;
    }

    function tanh(x) {
      return ((x = Math.exp(2 * x)) - 1) / (x + 1);
    }

    // p0 = [ux0, uy0, w0]
    // p1 = [ux1, uy1, w1]

    function cubehelix$1(hue$$1) {
      return function cubehelixGamma(y) {
        y = +y;

        function cubehelix$$1(start, end) {
          var h = hue$$1((start = cubehelix(start)).h, (end = cubehelix(end)).h),
              s = nogamma(start.s, end.s),
              l = nogamma(start.l, end.l),
              opacity = nogamma(start.opacity, end.opacity);
          return function (t) {
            start.h = h(t);
            start.s = s(t);
            start.l = l(Math.pow(t, y));
            start.opacity = opacity(t);
            return start + "";
          };
        }

        cubehelix$$1.gamma = cubehelixGamma;

        return cubehelix$$1;
      }(1);
    }

    cubehelix$1(hue);
    var cubehelixLong = cubehelix$1(nogamma);

    var constant$5 = function (x) {
      return function () {
        return x;
      };
    };

    var number$1 = function (x) {
      return +x;
    };

    var unit = [0, 1];

    function deinterpolateLinear(a, b) {
      return (b -= a = +a) ? function (x) {
        return (x - a) / b;
      } : constant$5(b);
    }

    function deinterpolateClamp(deinterpolate) {
      return function (a, b) {
        var d = deinterpolate(a = +a, b = +b);
        return function (x) {
          return x <= a ? 0 : x >= b ? 1 : d(x);
        };
      };
    }

    function reinterpolateClamp(reinterpolate) {
      return function (a, b) {
        var r = reinterpolate(a = +a, b = +b);
        return function (t) {
          return t <= 0 ? a : t >= 1 ? b : r(t);
        };
      };
    }

    function bimap(domain, range$$1, deinterpolate, reinterpolate) {
      var d0 = domain[0],
          d1 = domain[1],
          r0 = range$$1[0],
          r1 = range$$1[1];
      if (d1 < d0) d0 = deinterpolate(d1, d0), r0 = reinterpolate(r1, r0);else d0 = deinterpolate(d0, d1), r0 = reinterpolate(r0, r1);
      return function (x) {
        return r0(d0(x));
      };
    }

    function polymap(domain, range$$1, deinterpolate, reinterpolate) {
      var j = Math.min(domain.length, range$$1.length) - 1,
          d = new Array(j),
          r = new Array(j),
          i = -1;

      // Reverse descending domains.
      if (domain[j] < domain[0]) {
        domain = domain.slice().reverse();
        range$$1 = range$$1.slice().reverse();
      }

      while (++i < j) {
        d[i] = deinterpolate(domain[i], domain[i + 1]);
        r[i] = reinterpolate(range$$1[i], range$$1[i + 1]);
      }

      return function (x) {
        var i = bisectRight(domain, x, 1, j) - 1;
        return r[i](d[i](x));
      };
    }

    function copy(source, target) {
      return target.domain(source.domain()).range(source.range()).interpolate(source.interpolate()).clamp(source.clamp());
    }

    // deinterpolate(a, b)(x) takes a domain value x in [a,b] and returns the corresponding parameter t in [0,1].
    // reinterpolate(a, b)(t) takes a parameter t in [0,1] and returns the corresponding domain value x in [a,b].
    function continuous(deinterpolate, reinterpolate) {
      var domain = unit,
          range$$1 = unit,
          interpolate$$1 = interpolateValue,
          clamp = false,
          piecewise,
          output,
          input;

      function rescale() {
        piecewise = Math.min(domain.length, range$$1.length) > 2 ? polymap : bimap;
        output = input = null;
        return scale;
      }

      function scale(x) {
        return (output || (output = piecewise(domain, range$$1, clamp ? deinterpolateClamp(deinterpolate) : deinterpolate, interpolate$$1)))(+x);
      }

      scale.invert = function (y) {
        return (input || (input = piecewise(range$$1, domain, deinterpolateLinear, clamp ? reinterpolateClamp(reinterpolate) : reinterpolate)))(+y);
      };

      scale.domain = function (_) {
        return arguments.length ? (domain = map$3.call(_, number$1), rescale()) : domain.slice();
      };

      scale.range = function (_) {
        return arguments.length ? (range$$1 = slice$2.call(_), rescale()) : range$$1.slice();
      };

      scale.rangeRound = function (_) {
        return range$$1 = slice$2.call(_), interpolate$$1 = interpolateRound, rescale();
      };

      scale.clamp = function (_) {
        return arguments.length ? (clamp = !!_, rescale()) : clamp;
      };

      scale.interpolate = function (_) {
        return arguments.length ? (interpolate$$1 = _, rescale()) : interpolate$$1;
      };

      return rescale();
    }

    // Computes the decimal coefficient and exponent of the specified number x with
    // significant digits p, where x is positive and p is in [1, 21] or undefined.
    // For example, formatDecimal(1.23) returns ["123", 0].
    var formatDecimal = function (x, p) {
      if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
      var i,
          coefficient = x.slice(0, i);

      // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
      // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
      return [coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient, +x.slice(i + 1)];
    };

    var exponent = function (x) {
      return x = formatDecimal(Math.abs(x)), x ? x[1] : NaN;
    };

    var formatGroup = function (grouping, thousands) {
      return function (value, width) {
        var i = value.length,
            t = [],
            j = 0,
            g = grouping[0],
            length = 0;

        while (i > 0 && g > 0) {
          if (length + g + 1 > width) g = Math.max(1, width - length);
          t.push(value.substring(i -= g, i + g));
          if ((length += g + 1) > width) break;
          g = grouping[j = (j + 1) % grouping.length];
        }

        return t.reverse().join(thousands);
      };
    };

    var formatDefault = function (x, p) {
      x = x.toPrecision(p);

      out: for (var n = x.length, i = 1, i0 = -1, i1; i < n; ++i) {
        switch (x[i]) {
          case ".":
            i0 = i1 = i;break;
          case "0":
            if (i0 === 0) i0 = i;i1 = i;break;
          case "e":
            break out;
          default:
            if (i0 > 0) i0 = 0;break;
        }
      }

      return i0 > 0 ? x.slice(0, i0) + x.slice(i1 + 1) : x;
    };

    var prefixExponent;

    var formatPrefixAuto = function (x, p) {
        var d = formatDecimal(x, p);
        if (!d) return x + "";
        var coefficient = d[0],
            exponent = d[1],
            i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
            n = coefficient.length;
        return i === n ? coefficient : i > n ? coefficient + new Array(i - n + 1).join("0") : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i) : "0." + new Array(1 - i).join("0") + formatDecimal(x, Math.max(0, p + i - 1))[0]; // less than 1y!
    };

    var formatRounded = function (x, p) {
        var d = formatDecimal(x, p);
        if (!d) return x + "";
        var coefficient = d[0],
            exponent = d[1];
        return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1) : coefficient + new Array(exponent - coefficient.length + 2).join("0");
    };

    var formatTypes = {
      "": formatDefault,
      "%": function _(x, p) {
        return (x * 100).toFixed(p);
      },
      "b": function b(x) {
        return Math.round(x).toString(2);
      },
      "c": function c(x) {
        return x + "";
      },
      "d": function d(x) {
        return Math.round(x).toString(10);
      },
      "e": function e(x, p) {
        return x.toExponential(p);
      },
      "f": function f(x, p) {
        return x.toFixed(p);
      },
      "g": function g(x, p) {
        return x.toPrecision(p);
      },
      "o": function o(x) {
        return Math.round(x).toString(8);
      },
      "p": function p(x, _p) {
        return formatRounded(x * 100, _p);
      },
      "r": formatRounded,
      "s": formatPrefixAuto,
      "X": function X(x) {
        return Math.round(x).toString(16).toUpperCase();
      },
      "x": function x(_x) {
        return Math.round(_x).toString(16);
      }
    };

    // [[fill]align][sign][symbol][0][width][,][.precision][type]
    var re = /^(?:(.)?([<>=^]))?([+\-\( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?([a-z%])?$/i;

    var formatSpecifier = function (specifier) {
      return new FormatSpecifier(specifier);
    };

    function FormatSpecifier(specifier) {
      if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);

      var match,
          fill = match[1] || " ",
          align = match[2] || ">",
          sign = match[3] || "-",
          symbol = match[4] || "",
          zero = !!match[5],
          width = match[6] && +match[6],
          comma = !!match[7],
          precision = match[8] && +match[8].slice(1),
          type = match[9] || "";

      // The "n" type is an alias for ",g".
      if (type === "n") comma = true, type = "g";

      // Map invalid types to the default format.
      else if (!formatTypes[type]) type = "";

      // If zero fill is specified, padding goes after sign and before digits.
      if (zero || fill === "0" && align === "=") zero = true, fill = "0", align = "=";

      this.fill = fill;
      this.align = align;
      this.sign = sign;
      this.symbol = symbol;
      this.zero = zero;
      this.width = width;
      this.comma = comma;
      this.precision = precision;
      this.type = type;
    }

    FormatSpecifier.prototype.toString = function () {
      return this.fill + this.align + this.sign + this.symbol + (this.zero ? "0" : "") + (this.width == null ? "" : Math.max(1, this.width | 0)) + (this.comma ? "," : "") + (this.precision == null ? "" : "." + Math.max(0, this.precision | 0)) + this.type;
    };

    var prefixes = ["y", "z", "a", "f", "p", "n", "µ", "m", "", "k", "M", "G", "T", "P", "E", "Z", "Y"];

    function identity$4(x) {
      return x;
    }

    var formatLocale = function (locale) {
      var group = locale.grouping && locale.thousands ? formatGroup(locale.grouping, locale.thousands) : identity$4,
          currency = locale.currency,
          decimal = locale.decimal;

      function newFormat(specifier) {
        specifier = formatSpecifier(specifier);

        var fill = specifier.fill,
            align = specifier.align,
            sign = specifier.sign,
            symbol = specifier.symbol,
            zero = specifier.zero,
            width = specifier.width,
            comma = specifier.comma,
            precision = specifier.precision,
            type = specifier.type;

        // Compute the prefix and suffix.
        // For SI-prefix, the suffix is lazily computed.
        var prefix = symbol === "$" ? currency[0] : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
            suffix = symbol === "$" ? currency[1] : /[%p]/.test(type) ? "%" : "";

        // What format function should we use?
        // Is this an integer type?
        // Can this type generate exponential notation?
        var formatType = formatTypes[type],
            maybeSuffix = !type || /[defgprs%]/.test(type);

        // Set the default precision if not specified,
        // or clamp the specified precision to the supported range.
        // For significant precision, it must be in [1, 21].
        // For fixed precision, it must be in [0, 20].
        precision = precision == null ? type ? 6 : 12 : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision)) : Math.max(0, Math.min(20, precision));

        function format(value) {
          var valuePrefix = prefix,
              valueSuffix = suffix,
              i,
              n,
              c;

          if (type === "c") {
            valueSuffix = formatType(value) + valueSuffix;
            value = "";
          } else {
            value = +value;

            // Convert negative to positive, and compute the prefix.
            // Note that -0 is not less than 0, but 1 / -0 is!
            var valueNegative = (value < 0 || 1 / value < 0) && (value *= -1, true);

            // Perform the initial formatting.
            value = formatType(value, precision);

            // If the original value was negative, it may be rounded to zero during
            // formatting; treat this as (positive) zero.
            if (valueNegative) {
              i = -1, n = value.length;
              valueNegative = false;
              while (++i < n) {
                if (c = value.charCodeAt(i), 48 < c && c < 58 || type === "x" && 96 < c && c < 103 || type === "X" && 64 < c && c < 71) {
                  valueNegative = true;
                  break;
                }
              }
            }

            // Compute the prefix and suffix.
            valuePrefix = (valueNegative ? sign === "(" ? sign : "-" : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
            valueSuffix = valueSuffix + (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + (valueNegative && sign === "(" ? ")" : "");

            // Break the formatted value into the integer “value” part that can be
            // grouped, and fractional or exponential “suffix” part that is not.
            if (maybeSuffix) {
              i = -1, n = value.length;
              while (++i < n) {
                if (c = value.charCodeAt(i), 48 > c || c > 57) {
                  valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
                  value = value.slice(0, i);
                  break;
                }
              }
            }
          }

          // If the fill character is not "0", grouping is applied before padding.
          if (comma && !zero) value = group(value, Infinity);

          // Compute the padding.
          var length = valuePrefix.length + value.length + valueSuffix.length,
              padding = length < width ? new Array(width - length + 1).join(fill) : "";

          // If the fill character is "0", grouping is applied after padding.
          if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

          // Reconstruct the final output based on the desired alignment.
          switch (align) {
            case "<":
              return valuePrefix + value + valueSuffix + padding;
            case "=":
              return valuePrefix + padding + value + valueSuffix;
            case "^":
              return padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length);
          }
          return padding + valuePrefix + value + valueSuffix;
        }

        format.toString = function () {
          return specifier + "";
        };

        return format;
      }

      function formatPrefix(specifier, value) {
        var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
            e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
            k = Math.pow(10, -e),
            prefix = prefixes[8 + e / 3];
        return function (value) {
          return f(k * value) + prefix;
        };
      }

      return {
        format: newFormat,
        formatPrefix: formatPrefix
      };
    };

    var locale$1;
    var format$1;
    var formatPrefix;

    defaultLocale({
      decimal: ".",
      thousands: ",",
      grouping: [3],
      currency: ["$", ""]
    });

    function defaultLocale(definition) {
      locale$1 = formatLocale(definition);
      format$1 = locale$1.format;
      formatPrefix = locale$1.formatPrefix;
      return locale$1;
    }

    var precisionFixed = function (step) {
      return Math.max(0, -exponent(Math.abs(step)));
    };

    var precisionPrefix = function (step, value) {
      return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3 - exponent(Math.abs(step)));
    };

    var precisionRound = function (step, max) {
      step = Math.abs(step), max = Math.abs(max) - step;
      return Math.max(0, exponent(max) - exponent(step)) + 1;
    };

    var tickFormat = function (domain, count, specifier) {
      var start = domain[0],
          stop = domain[domain.length - 1],
          step = tickStep(start, stop, count == null ? 10 : count),
          precision;
      specifier = formatSpecifier(specifier == null ? ",f" : specifier);
      switch (specifier.type) {
        case "s":
          {
            var value = Math.max(Math.abs(start), Math.abs(stop));
            if (specifier.precision == null && !isNaN(precision = precisionPrefix(step, value))) specifier.precision = precision;
            return formatPrefix(specifier, value);
          }
        case "":
        case "e":
        case "g":
        case "p":
        case "r":
          {
            if (specifier.precision == null && !isNaN(precision = precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
            break;
          }
        case "f":
        case "%":
          {
            if (specifier.precision == null && !isNaN(precision = precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
            break;
          }
      }
      return format$1(specifier);
    };

    function linearish(scale) {
      var domain = scale.domain;

      scale.ticks = function (count) {
        var d = domain();
        return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
      };

      scale.tickFormat = function (count, specifier) {
        return tickFormat(domain(), count, specifier);
      };

      scale.nice = function (count) {
        var d = domain(),
            i = d.length - 1,
            n = count == null ? 10 : count,
            start = d[0],
            stop = d[i],
            step = tickStep(start, stop, n);

        if (step) {
          step = tickStep(Math.floor(start / step) * step, Math.ceil(stop / step) * step, n);
          d[0] = Math.floor(start / step) * step;
          d[i] = Math.ceil(stop / step) * step;
          domain(d);
        }

        return scale;
      };

      return scale;
    }

    function linear() {
      var scale = continuous(deinterpolateLinear, reinterpolate);

      scale.copy = function () {
        return copy(scale, linear());
      };

      return linearish(scale);
    }

    function identity$2() {
      var domain = [0, 1];

      function scale(x) {
        return +x;
      }

      scale.invert = scale;

      scale.domain = scale.range = function (_) {
        return arguments.length ? (domain = map$3.call(_, number$1), scale) : domain.slice();
      };

      scale.copy = function () {
        return identity$2().domain(domain);
      };

      return linearish(scale);
    }

    var nice = function (domain, interval) {
      domain = domain.slice();

      var i0 = 0,
          i1 = domain.length - 1,
          x0 = domain[i0],
          x1 = domain[i1],
          t;

      if (x1 < x0) {
        t = i0, i0 = i1, i1 = t;
        t = x0, x0 = x1, x1 = t;
      }

      domain[i0] = interval.floor(x0);
      domain[i1] = interval.ceil(x1);
      return domain;
    };

    function deinterpolate(a, b) {
      return (b = Math.log(b / a)) ? function (x) {
        return Math.log(x / a) / b;
      } : constant$5(b);
    }

    function reinterpolate$1(a, b) {
      return a < 0 ? function (t) {
        return -Math.pow(-b, t) * Math.pow(-a, 1 - t);
      } : function (t) {
        return Math.pow(b, t) * Math.pow(a, 1 - t);
      };
    }

    function pow10(x) {
      return isFinite(x) ? +("1e" + x) : x < 0 ? 0 : x;
    }

    function powp(base) {
      return base === 10 ? pow10 : base === Math.E ? Math.exp : function (x) {
        return Math.pow(base, x);
      };
    }

    function logp(base) {
      return base === Math.E ? Math.log : base === 10 && Math.log10 || base === 2 && Math.log2 || (base = Math.log(base), function (x) {
        return Math.log(x) / base;
      });
    }

    function reflect(f) {
      return function (x) {
        return -f(-x);
      };
    }

    function log() {
      var scale = continuous(deinterpolate, reinterpolate$1).domain([1, 10]),
          domain = scale.domain,
          base = 10,
          logs = logp(10),
          pows = powp(10);

      function rescale() {
        logs = logp(base), pows = powp(base);
        if (domain()[0] < 0) logs = reflect(logs), pows = reflect(pows);
        return scale;
      }

      scale.base = function (_) {
        return arguments.length ? (base = +_, rescale()) : base;
      };

      scale.domain = function (_) {
        return arguments.length ? (domain(_), rescale()) : domain();
      };

      scale.ticks = function (count) {
        var d = domain(),
            u = d[0],
            v = d[d.length - 1],
            r;

        if (r = v < u) i = u, u = v, v = i;

        var i = logs(u),
            j = logs(v),
            p,
            k,
            t,
            n = count == null ? 10 : +count,
            z = [];

        if (!(base % 1) && j - i < n) {
          i = Math.round(i) - 1, j = Math.round(j) + 1;
          if (u > 0) for (; i < j; ++i) {
            for (k = 1, p = pows(i); k < base; ++k) {
              t = p * k;
              if (t < u) continue;
              if (t > v) break;
              z.push(t);
            }
          } else for (; i < j; ++i) {
            for (k = base - 1, p = pows(i); k >= 1; --k) {
              t = p * k;
              if (t < u) continue;
              if (t > v) break;
              z.push(t);
            }
          }
        } else {
          z = ticks(i, j, Math.min(j - i, n)).map(pows);
        }

        return r ? z.reverse() : z;
      };

      scale.tickFormat = function (count, specifier) {
        if (specifier == null) specifier = base === 10 ? ".0e" : ",";
        if (typeof specifier !== "function") specifier = format$1(specifier);
        if (count === Infinity) return specifier;
        if (count == null) count = 10;
        var k = Math.max(1, base * count / scale.ticks().length); // TODO fast estimate?
        return function (d) {
          var i = d / pows(Math.round(logs(d)));
          if (i * base < base - 0.5) i *= base;
          return i <= k ? specifier(d) : "";
        };
      };

      scale.nice = function () {
        return domain(nice(domain(), {
          floor: function floor(x) {
            return pows(Math.floor(logs(x)));
          },
          ceil: function ceil(x) {
            return pows(Math.ceil(logs(x)));
          }
        }));
      };

      scale.copy = function () {
        return copy(scale, log().base(base));
      };

      return scale;
    }

    function raise$1(x, exponent) {
      return x < 0 ? -Math.pow(-x, exponent) : Math.pow(x, exponent);
    }

    function pow() {
      var exponent = 1,
          scale = continuous(deinterpolate, reinterpolate),
          domain = scale.domain;

      function deinterpolate(a, b) {
        return (b = raise$1(b, exponent) - (a = raise$1(a, exponent))) ? function (x) {
          return (raise$1(x, exponent) - a) / b;
        } : constant$5(b);
      }

      function reinterpolate(a, b) {
        b = raise$1(b, exponent) - (a = raise$1(a, exponent));
        return function (t) {
          return raise$1(a + b * t, 1 / exponent);
        };
      }

      scale.exponent = function (_) {
        return arguments.length ? (exponent = +_, domain(domain())) : exponent;
      };

      scale.copy = function () {
        return copy(scale, pow().exponent(exponent));
      };

      return linearish(scale);
    }

    function quantile$$1() {
      var domain = [],
          range$$1 = [],
          thresholds = [];

      function rescale() {
        var i = 0,
            n = Math.max(1, range$$1.length);
        thresholds = new Array(n - 1);
        while (++i < n) {
          thresholds[i - 1] = threshold(domain, i / n);
        }return scale;
      }

      function scale(x) {
        if (!isNaN(x = +x)) return range$$1[bisectRight(thresholds, x)];
      }

      scale.invertExtent = function (y) {
        var i = range$$1.indexOf(y);
        return i < 0 ? [NaN, NaN] : [i > 0 ? thresholds[i - 1] : domain[0], i < thresholds.length ? thresholds[i] : domain[domain.length - 1]];
      };

      scale.domain = function (_) {
        if (!arguments.length) return domain.slice();
        domain = [];
        for (var i = 0, n = _.length, d; i < n; ++i) {
          if (d = _[i], d != null && !isNaN(d = +d)) domain.push(d);
        }domain.sort(ascending$2);
        return rescale();
      };

      scale.range = function (_) {
        return arguments.length ? (range$$1 = slice$2.call(_), rescale()) : range$$1.slice();
      };

      scale.quantiles = function () {
        return thresholds.slice();
      };

      scale.copy = function () {
        return quantile$$1().domain(domain).range(range$$1);
      };

      return scale;
    }

    function quantize$1() {
      var x0 = 0,
          x1 = 1,
          n = 1,
          domain = [0.5],
          range$$1 = [0, 1];

      function scale(x) {
        if (x <= x) return range$$1[bisectRight(domain, x, 0, n)];
      }

      function rescale() {
        var i = -1;
        domain = new Array(n);
        while (++i < n) {
          domain[i] = ((i + 1) * x1 - (i - n) * x0) / (n + 1);
        }return scale;
      }

      scale.domain = function (_) {
        return arguments.length ? (x0 = +_[0], x1 = +_[1], rescale()) : [x0, x1];
      };

      scale.range = function (_) {
        return arguments.length ? (n = (range$$1 = slice$2.call(_)).length - 1, rescale()) : range$$1.slice();
      };

      scale.invertExtent = function (y) {
        var i = range$$1.indexOf(y);
        return i < 0 ? [NaN, NaN] : i < 1 ? [x0, domain[0]] : i >= n ? [domain[n - 1], x1] : [domain[i - 1], domain[i]];
      };

      scale.copy = function () {
        return quantize$1().domain([x0, x1]).range(range$$1);
      };

      return linearish(scale);
    }

    function threshold$1() {
      var domain = [0.5],
          range$$1 = [0, 1],
          n = 1;

      function scale(x) {
        if (x <= x) return range$$1[bisectRight(domain, x, 0, n)];
      }

      scale.domain = function (_) {
        return arguments.length ? (domain = slice$2.call(_), n = Math.min(domain.length, range$$1.length - 1), scale) : domain.slice();
      };

      scale.range = function (_) {
        return arguments.length ? (range$$1 = slice$2.call(_), n = Math.min(domain.length, range$$1.length - 1), scale) : range$$1.slice();
      };

      scale.invertExtent = function (y) {
        var i = range$$1.indexOf(y);
        return [domain[i - 1], domain[i]];
      };

      scale.copy = function () {
        return threshold$1().domain(domain).range(range$$1);
      };

      return scale;
    }

    var t0$1 = new Date();
    var t1$1 = new Date();

    function newInterval(floori, offseti, count, field) {

      function interval(date) {
        return floori(date = new Date(+date)), date;
      }

      interval.floor = interval;

      interval.ceil = function (date) {
        return floori(date = new Date(date - 1)), offseti(date, 1), floori(date), date;
      };

      interval.round = function (date) {
        var d0 = interval(date),
            d1 = interval.ceil(date);
        return date - d0 < d1 - date ? d0 : d1;
      };

      interval.offset = function (date, step) {
        return offseti(date = new Date(+date), step == null ? 1 : Math.floor(step)), date;
      };

      interval.range = function (start, stop, step) {
        var range = [];
        start = interval.ceil(start);
        step = step == null ? 1 : Math.floor(step);
        if (!(start < stop) || !(step > 0)) return range; // also handles Invalid Date
        do {
          range.push(new Date(+start));
        } while ((offseti(start, step), floori(start), start < stop));
        return range;
      };

      interval.filter = function (test) {
        return newInterval(function (date) {
          if (date >= date) while (floori(date), !test(date)) {
            date.setTime(date - 1);
          }
        }, function (date, step) {
          if (date >= date) while (--step >= 0) {
            while (offseti(date, 1), !test(date)) {}
          } // eslint-disable-line no-empty
        });
      };

      if (count) {
        interval.count = function (start, end) {
          t0$1.setTime(+start), t1$1.setTime(+end);
          floori(t0$1), floori(t1$1);
          return Math.floor(count(t0$1, t1$1));
        };

        interval.every = function (step) {
          step = Math.floor(step);
          return !isFinite(step) || !(step > 0) ? null : !(step > 1) ? interval : interval.filter(field ? function (d) {
            return field(d) % step === 0;
          } : function (d) {
            return interval.count(0, d) % step === 0;
          });
        };
      }

      return interval;
    }

    var millisecond = newInterval(function () {
      // noop
    }, function (date, step) {
      date.setTime(+date + step);
    }, function (start, end) {
      return end - start;
    });

    // An optimized implementation for this simple case.
    millisecond.every = function (k) {
      k = Math.floor(k);
      if (!isFinite(k) || !(k > 0)) return null;
      if (!(k > 1)) return millisecond;
      return newInterval(function (date) {
        date.setTime(Math.floor(date / k) * k);
      }, function (date, step) {
        date.setTime(+date + step * k);
      }, function (start, end) {
        return (end - start) / k;
      });
    };

    var durationSecond$1 = 1e3;
    var durationMinute$1 = 6e4;
    var durationHour$1 = 36e5;
    var durationDay$1 = 864e5;
    var durationWeek$1 = 6048e5;

    var second = newInterval(function (date) {
      date.setTime(Math.floor(date / durationSecond$1) * durationSecond$1);
    }, function (date, step) {
      date.setTime(+date + step * durationSecond$1);
    }, function (start, end) {
      return (end - start) / durationSecond$1;
    }, function (date) {
      return date.getUTCSeconds();
    });

    var minute = newInterval(function (date) {
      date.setTime(Math.floor(date / durationMinute$1) * durationMinute$1);
    }, function (date, step) {
      date.setTime(+date + step * durationMinute$1);
    }, function (start, end) {
      return (end - start) / durationMinute$1;
    }, function (date) {
      return date.getMinutes();
    });

    var hour = newInterval(function (date) {
      var offset = date.getTimezoneOffset() * durationMinute$1 % durationHour$1;
      if (offset < 0) offset += durationHour$1;
      date.setTime(Math.floor((+date - offset) / durationHour$1) * durationHour$1 + offset);
    }, function (date, step) {
      date.setTime(+date + step * durationHour$1);
    }, function (start, end) {
      return (end - start) / durationHour$1;
    }, function (date) {
      return date.getHours();
    });

    var day = newInterval(function (date) {
      date.setHours(0, 0, 0, 0);
    }, function (date, step) {
      date.setDate(date.getDate() + step);
    }, function (start, end) {
      return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute$1) / durationDay$1;
    }, function (date) {
      return date.getDate() - 1;
    });

    function weekday(i) {
      return newInterval(function (date) {
        date.setDate(date.getDate() - (date.getDay() + 7 - i) % 7);
        date.setHours(0, 0, 0, 0);
      }, function (date, step) {
        date.setDate(date.getDate() + step * 7);
      }, function (start, end) {
        return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute$1) / durationWeek$1;
      });
    }

    var sunday = weekday(0);
    var monday = weekday(1);
    var tuesday = weekday(2);
    var wednesday = weekday(3);
    var thursday = weekday(4);
    var friday = weekday(5);
    var saturday = weekday(6);

    var month = newInterval(function (date) {
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
    }, function (date, step) {
      date.setMonth(date.getMonth() + step);
    }, function (start, end) {
      return end.getMonth() - start.getMonth() + (end.getFullYear() - start.getFullYear()) * 12;
    }, function (date) {
      return date.getMonth();
    });

    var year = newInterval(function (date) {
      date.setMonth(0, 1);
      date.setHours(0, 0, 0, 0);
    }, function (date, step) {
      date.setFullYear(date.getFullYear() + step);
    }, function (start, end) {
      return end.getFullYear() - start.getFullYear();
    }, function (date) {
      return date.getFullYear();
    });

    // An optimized implementation for this simple case.
    year.every = function (k) {
      return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function (date) {
        date.setFullYear(Math.floor(date.getFullYear() / k) * k);
        date.setMonth(0, 1);
        date.setHours(0, 0, 0, 0);
      }, function (date, step) {
        date.setFullYear(date.getFullYear() + step * k);
      });
    };

    var utcMinute = newInterval(function (date) {
      date.setUTCSeconds(0, 0);
    }, function (date, step) {
      date.setTime(+date + step * durationMinute$1);
    }, function (start, end) {
      return (end - start) / durationMinute$1;
    }, function (date) {
      return date.getUTCMinutes();
    });

    var utcHour = newInterval(function (date) {
      date.setUTCMinutes(0, 0, 0);
    }, function (date, step) {
      date.setTime(+date + step * durationHour$1);
    }, function (start, end) {
      return (end - start) / durationHour$1;
    }, function (date) {
      return date.getUTCHours();
    });

    var utcDay = newInterval(function (date) {
      date.setUTCHours(0, 0, 0, 0);
    }, function (date, step) {
      date.setUTCDate(date.getUTCDate() + step);
    }, function (start, end) {
      return (end - start) / durationDay$1;
    }, function (date) {
      return date.getUTCDate() - 1;
    });

    function utcWeekday(i) {
      return newInterval(function (date) {
        date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 7 - i) % 7);
        date.setUTCHours(0, 0, 0, 0);
      }, function (date, step) {
        date.setUTCDate(date.getUTCDate() + step * 7);
      }, function (start, end) {
        return (end - start) / durationWeek$1;
      });
    }

    var utcSunday = utcWeekday(0);
    var utcMonday = utcWeekday(1);
    var utcTuesday = utcWeekday(2);
    var utcWednesday = utcWeekday(3);
    var utcThursday = utcWeekday(4);
    var utcFriday = utcWeekday(5);
    var utcSaturday = utcWeekday(6);

    var utcMonth = newInterval(function (date) {
      date.setUTCDate(1);
      date.setUTCHours(0, 0, 0, 0);
    }, function (date, step) {
      date.setUTCMonth(date.getUTCMonth() + step);
    }, function (start, end) {
      return end.getUTCMonth() - start.getUTCMonth() + (end.getUTCFullYear() - start.getUTCFullYear()) * 12;
    }, function (date) {
      return date.getUTCMonth();
    });

    var utcYear = newInterval(function (date) {
      date.setUTCMonth(0, 1);
      date.setUTCHours(0, 0, 0, 0);
    }, function (date, step) {
      date.setUTCFullYear(date.getUTCFullYear() + step);
    }, function (start, end) {
      return end.getUTCFullYear() - start.getUTCFullYear();
    }, function (date) {
      return date.getUTCFullYear();
    });

    // An optimized implementation for this simple case.
    utcYear.every = function (k) {
      return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function (date) {
        date.setUTCFullYear(Math.floor(date.getUTCFullYear() / k) * k);
        date.setUTCMonth(0, 1);
        date.setUTCHours(0, 0, 0, 0);
      }, function (date, step) {
        date.setUTCFullYear(date.getUTCFullYear() + step * k);
      });
    };

    function localDate(d) {
      if (0 <= d.y && d.y < 100) {
        var date = new Date(-1, d.m, d.d, d.H, d.M, d.S, d.L);
        date.setFullYear(d.y);
        return date;
      }
      return new Date(d.y, d.m, d.d, d.H, d.M, d.S, d.L);
    }

    function utcDate(d) {
      if (0 <= d.y && d.y < 100) {
        var date = new Date(Date.UTC(-1, d.m, d.d, d.H, d.M, d.S, d.L));
        date.setUTCFullYear(d.y);
        return date;
      }
      return new Date(Date.UTC(d.y, d.m, d.d, d.H, d.M, d.S, d.L));
    }

    function newYear(y) {
      return { y: y, m: 0, d: 1, H: 0, M: 0, S: 0, L: 0 };
    }

    function formatLocale$1(locale) {
      var locale_dateTime = locale.dateTime,
          locale_date = locale.date,
          locale_time = locale.time,
          locale_periods = locale.periods,
          locale_weekdays = locale.days,
          locale_shortWeekdays = locale.shortDays,
          locale_months = locale.months,
          locale_shortMonths = locale.shortMonths;

      var periodRe = formatRe(locale_periods),
          periodLookup = formatLookup(locale_periods),
          weekdayRe = formatRe(locale_weekdays),
          weekdayLookup = formatLookup(locale_weekdays),
          shortWeekdayRe = formatRe(locale_shortWeekdays),
          shortWeekdayLookup = formatLookup(locale_shortWeekdays),
          monthRe = formatRe(locale_months),
          monthLookup = formatLookup(locale_months),
          shortMonthRe = formatRe(locale_shortMonths),
          shortMonthLookup = formatLookup(locale_shortMonths);

      var formats = {
        "a": formatShortWeekday,
        "A": formatWeekday,
        "b": formatShortMonth,
        "B": formatMonth,
        "c": null,
        "d": formatDayOfMonth,
        "e": formatDayOfMonth,
        "H": formatHour24,
        "I": formatHour12,
        "j": formatDayOfYear,
        "L": formatMilliseconds,
        "m": formatMonthNumber,
        "M": formatMinutes,
        "p": formatPeriod,
        "S": formatSeconds,
        "U": formatWeekNumberSunday,
        "w": formatWeekdayNumber,
        "W": formatWeekNumberMonday,
        "x": null,
        "X": null,
        "y": formatYear,
        "Y": formatFullYear,
        "Z": formatZone,
        "%": formatLiteralPercent
      };

      var utcFormats = {
        "a": formatUTCShortWeekday,
        "A": formatUTCWeekday,
        "b": formatUTCShortMonth,
        "B": formatUTCMonth,
        "c": null,
        "d": formatUTCDayOfMonth,
        "e": formatUTCDayOfMonth,
        "H": formatUTCHour24,
        "I": formatUTCHour12,
        "j": formatUTCDayOfYear,
        "L": formatUTCMilliseconds,
        "m": formatUTCMonthNumber,
        "M": formatUTCMinutes,
        "p": formatUTCPeriod,
        "S": formatUTCSeconds,
        "U": formatUTCWeekNumberSunday,
        "w": formatUTCWeekdayNumber,
        "W": formatUTCWeekNumberMonday,
        "x": null,
        "X": null,
        "y": formatUTCYear,
        "Y": formatUTCFullYear,
        "Z": formatUTCZone,
        "%": formatLiteralPercent
      };

      var parses = {
        "a": parseShortWeekday,
        "A": parseWeekday,
        "b": parseShortMonth,
        "B": parseMonth,
        "c": parseLocaleDateTime,
        "d": parseDayOfMonth,
        "e": parseDayOfMonth,
        "H": parseHour24,
        "I": parseHour24,
        "j": parseDayOfYear,
        "L": parseMilliseconds,
        "m": parseMonthNumber,
        "M": parseMinutes,
        "p": parsePeriod,
        "S": parseSeconds,
        "U": parseWeekNumberSunday,
        "w": parseWeekdayNumber,
        "W": parseWeekNumberMonday,
        "x": parseLocaleDate,
        "X": parseLocaleTime,
        "y": parseYear,
        "Y": parseFullYear,
        "Z": parseZone,
        "%": parseLiteralPercent
      };

      // These recursive directive definitions must be deferred.
      formats.x = newFormat(locale_date, formats);
      formats.X = newFormat(locale_time, formats);
      formats.c = newFormat(locale_dateTime, formats);
      utcFormats.x = newFormat(locale_date, utcFormats);
      utcFormats.X = newFormat(locale_time, utcFormats);
      utcFormats.c = newFormat(locale_dateTime, utcFormats);

      function newFormat(specifier, formats) {
        return function (date) {
          var string = [],
              i = -1,
              j = 0,
              n = specifier.length,
              c,
              pad,
              format;

          if (!(date instanceof Date)) date = new Date(+date);

          while (++i < n) {
            if (specifier.charCodeAt(i) === 37) {
              string.push(specifier.slice(j, i));
              if ((pad = pads[c = specifier.charAt(++i)]) != null) c = specifier.charAt(++i);else pad = c === "e" ? " " : "0";
              if (format = formats[c]) c = format(date, pad);
              string.push(c);
              j = i + 1;
            }
          }

          string.push(specifier.slice(j, i));
          return string.join("");
        };
      }

      function newParse(specifier, newDate) {
        return function (string) {
          var d = newYear(1900),
              i = parseSpecifier(d, specifier, string += "", 0);
          if (i != string.length) return null;

          // The am-pm flag is 0 for AM, and 1 for PM.
          if ("p" in d) d.H = d.H % 12 + d.p * 12;

          // Convert day-of-week and week-of-year to day-of-year.
          if ("W" in d || "U" in d) {
            if (!("w" in d)) d.w = "W" in d ? 1 : 0;
            var day$$1 = "Z" in d ? utcDate(newYear(d.y)).getUTCDay() : newDate(newYear(d.y)).getDay();
            d.m = 0;
            d.d = "W" in d ? (d.w + 6) % 7 + d.W * 7 - (day$$1 + 5) % 7 : d.w + d.U * 7 - (day$$1 + 6) % 7;
          }

          // If a time zone is specified, all fields are interpreted as UTC and then
          // offset according to the specified time zone.
          if ("Z" in d) {
            d.H += d.Z / 100 | 0;
            d.M += d.Z % 100;
            return utcDate(d);
          }

          // Otherwise, all fields are in local time.
          return newDate(d);
        };
      }

      function parseSpecifier(d, specifier, string, j) {
        var i = 0,
            n = specifier.length,
            m = string.length,
            c,
            parse;

        while (i < n) {
          if (j >= m) return -1;
          c = specifier.charCodeAt(i++);
          if (c === 37) {
            c = specifier.charAt(i++);
            parse = parses[c in pads ? specifier.charAt(i++) : c];
            if (!parse || (j = parse(d, string, j)) < 0) return -1;
          } else if (c != string.charCodeAt(j++)) {
            return -1;
          }
        }

        return j;
      }

      function parsePeriod(d, string, i) {
        var n = periodRe.exec(string.slice(i));
        return n ? (d.p = periodLookup[n[0].toLowerCase()], i + n[0].length) : -1;
      }

      function parseShortWeekday(d, string, i) {
        var n = shortWeekdayRe.exec(string.slice(i));
        return n ? (d.w = shortWeekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
      }

      function parseWeekday(d, string, i) {
        var n = weekdayRe.exec(string.slice(i));
        return n ? (d.w = weekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
      }

      function parseShortMonth(d, string, i) {
        var n = shortMonthRe.exec(string.slice(i));
        return n ? (d.m = shortMonthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
      }

      function parseMonth(d, string, i) {
        var n = monthRe.exec(string.slice(i));
        return n ? (d.m = monthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
      }

      function parseLocaleDateTime(d, string, i) {
        return parseSpecifier(d, locale_dateTime, string, i);
      }

      function parseLocaleDate(d, string, i) {
        return parseSpecifier(d, locale_date, string, i);
      }

      function parseLocaleTime(d, string, i) {
        return parseSpecifier(d, locale_time, string, i);
      }

      function formatShortWeekday(d) {
        return locale_shortWeekdays[d.getDay()];
      }

      function formatWeekday(d) {
        return locale_weekdays[d.getDay()];
      }

      function formatShortMonth(d) {
        return locale_shortMonths[d.getMonth()];
      }

      function formatMonth(d) {
        return locale_months[d.getMonth()];
      }

      function formatPeriod(d) {
        return locale_periods[+(d.getHours() >= 12)];
      }

      function formatUTCShortWeekday(d) {
        return locale_shortWeekdays[d.getUTCDay()];
      }

      function formatUTCWeekday(d) {
        return locale_weekdays[d.getUTCDay()];
      }

      function formatUTCShortMonth(d) {
        return locale_shortMonths[d.getUTCMonth()];
      }

      function formatUTCMonth(d) {
        return locale_months[d.getUTCMonth()];
      }

      function formatUTCPeriod(d) {
        return locale_periods[+(d.getUTCHours() >= 12)];
      }

      return {
        format: function format(specifier) {
          var f = newFormat(specifier += "", formats);
          f.toString = function () {
            return specifier;
          };
          return f;
        },
        parse: function parse(specifier) {
          var p = newParse(specifier += "", localDate);
          p.toString = function () {
            return specifier;
          };
          return p;
        },
        utcFormat: function utcFormat(specifier) {
          var f = newFormat(specifier += "", utcFormats);
          f.toString = function () {
            return specifier;
          };
          return f;
        },
        utcParse: function utcParse(specifier) {
          var p = newParse(specifier, utcDate);
          p.toString = function () {
            return specifier;
          };
          return p;
        }
      };
    }

    var pads = { "-": "", "_": " ", "0": "0" };
    var numberRe = /^\s*\d+/;
    var percentRe = /^%/;
    var requoteRe = /[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;

    function pad(value, fill, width) {
      var sign = value < 0 ? "-" : "",
          string = (sign ? -value : value) + "",
          length = string.length;
      return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
    }

    function requote(s) {
      return s.replace(requoteRe, "\\$&");
    }

    function formatRe(names) {
      return new RegExp("^(?:" + names.map(requote).join("|") + ")", "i");
    }

    function formatLookup(names) {
      var map = {},
          i = -1,
          n = names.length;
      while (++i < n) {
        map[names[i].toLowerCase()] = i;
      }return map;
    }

    function parseWeekdayNumber(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 1));
      return n ? (d.w = +n[0], i + n[0].length) : -1;
    }

    function parseWeekNumberSunday(d, string, i) {
      var n = numberRe.exec(string.slice(i));
      return n ? (d.U = +n[0], i + n[0].length) : -1;
    }

    function parseWeekNumberMonday(d, string, i) {
      var n = numberRe.exec(string.slice(i));
      return n ? (d.W = +n[0], i + n[0].length) : -1;
    }

    function parseFullYear(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 4));
      return n ? (d.y = +n[0], i + n[0].length) : -1;
    }

    function parseYear(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.y = +n[0] + (+n[0] > 68 ? 1900 : 2000), i + n[0].length) : -1;
    }

    function parseZone(d, string, i) {
      var n = /^(Z)|([+-]\d\d)(?:\:?(\d\d))?/.exec(string.slice(i, i + 6));
      return n ? (d.Z = n[1] ? 0 : -(n[2] + (n[3] || "00")), i + n[0].length) : -1;
    }

    function parseMonthNumber(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.m = n[0] - 1, i + n[0].length) : -1;
    }

    function parseDayOfMonth(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.d = +n[0], i + n[0].length) : -1;
    }

    function parseDayOfYear(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 3));
      return n ? (d.m = 0, d.d = +n[0], i + n[0].length) : -1;
    }

    function parseHour24(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.H = +n[0], i + n[0].length) : -1;
    }

    function parseMinutes(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.M = +n[0], i + n[0].length) : -1;
    }

    function parseSeconds(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.S = +n[0], i + n[0].length) : -1;
    }

    function parseMilliseconds(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 3));
      return n ? (d.L = +n[0], i + n[0].length) : -1;
    }

    function parseLiteralPercent(d, string, i) {
      var n = percentRe.exec(string.slice(i, i + 1));
      return n ? i + n[0].length : -1;
    }

    function formatDayOfMonth(d, p) {
      return pad(d.getDate(), p, 2);
    }

    function formatHour24(d, p) {
      return pad(d.getHours(), p, 2);
    }

    function formatHour12(d, p) {
      return pad(d.getHours() % 12 || 12, p, 2);
    }

    function formatDayOfYear(d, p) {
      return pad(1 + day.count(year(d), d), p, 3);
    }

    function formatMilliseconds(d, p) {
      return pad(d.getMilliseconds(), p, 3);
    }

    function formatMonthNumber(d, p) {
      return pad(d.getMonth() + 1, p, 2);
    }

    function formatMinutes(d, p) {
      return pad(d.getMinutes(), p, 2);
    }

    function formatSeconds(d, p) {
      return pad(d.getSeconds(), p, 2);
    }

    function formatWeekNumberSunday(d, p) {
      return pad(sunday.count(year(d), d), p, 2);
    }

    function formatWeekdayNumber(d) {
      return d.getDay();
    }

    function formatWeekNumberMonday(d, p) {
      return pad(monday.count(year(d), d), p, 2);
    }

    function formatYear(d, p) {
      return pad(d.getFullYear() % 100, p, 2);
    }

    function formatFullYear(d, p) {
      return pad(d.getFullYear() % 10000, p, 4);
    }

    function formatZone(d) {
      var z = d.getTimezoneOffset();
      return (z > 0 ? "-" : (z *= -1, "+")) + pad(z / 60 | 0, "0", 2) + pad(z % 60, "0", 2);
    }

    function formatUTCDayOfMonth(d, p) {
      return pad(d.getUTCDate(), p, 2);
    }

    function formatUTCHour24(d, p) {
      return pad(d.getUTCHours(), p, 2);
    }

    function formatUTCHour12(d, p) {
      return pad(d.getUTCHours() % 12 || 12, p, 2);
    }

    function formatUTCDayOfYear(d, p) {
      return pad(1 + utcDay.count(utcYear(d), d), p, 3);
    }

    function formatUTCMilliseconds(d, p) {
      return pad(d.getUTCMilliseconds(), p, 3);
    }

    function formatUTCMonthNumber(d, p) {
      return pad(d.getUTCMonth() + 1, p, 2);
    }

    function formatUTCMinutes(d, p) {
      return pad(d.getUTCMinutes(), p, 2);
    }

    function formatUTCSeconds(d, p) {
      return pad(d.getUTCSeconds(), p, 2);
    }

    function formatUTCWeekNumberSunday(d, p) {
      return pad(utcSunday.count(utcYear(d), d), p, 2);
    }

    function formatUTCWeekdayNumber(d) {
      return d.getUTCDay();
    }

    function formatUTCWeekNumberMonday(d, p) {
      return pad(utcMonday.count(utcYear(d), d), p, 2);
    }

    function formatUTCYear(d, p) {
      return pad(d.getUTCFullYear() % 100, p, 2);
    }

    function formatUTCFullYear(d, p) {
      return pad(d.getUTCFullYear() % 10000, p, 4);
    }

    function formatUTCZone() {
      return "+0000";
    }

    function formatLiteralPercent() {
      return "%";
    }

    var locale$2;
    var timeFormat;
    var timeParse;
    var utcFormat$1;
    var utcParse$1;

    defaultLocale$1({
      dateTime: "%x, %X",
      date: "%-m/%-d/%Y",
      time: "%-I:%M:%S %p",
      periods: ["AM", "PM"],
      days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    });

    function defaultLocale$1(definition) {
      locale$2 = formatLocale$1(definition);
      timeFormat = locale$2.format;
      timeParse = locale$2.parse;
      utcFormat$1 = locale$2.utcFormat;
      utcParse$1 = locale$2.utcParse;
      return locale$2;
    }

    var isoSpecifier = "%Y-%m-%dT%H:%M:%S.%LZ";

    function formatIsoNative(date) {
        return date.toISOString();
    }

    var formatIso = Date.prototype.toISOString ? formatIsoNative : utcFormat$1(isoSpecifier);

    function parseIsoNative(string) {
      var date = new Date(string);
      return isNaN(date) ? null : date;
    }

    var parseIso = +new Date("2000-01-01T00:00:00.000Z") ? parseIsoNative : utcParse$1(isoSpecifier);

    var durationSecond = 1000;
    var durationMinute = durationSecond * 60;
    var durationHour = durationMinute * 60;
    var durationDay = durationHour * 24;
    var durationWeek = durationDay * 7;
    var durationMonth = durationDay * 30;
    var durationYear = durationDay * 365;

    function date$1(t) {
      return new Date(t);
    }

    function number$2(t) {
      return t instanceof Date ? +t : +new Date(+t);
    }

    function calendar(year$$1, month$$1, week, day$$1, hour$$1, minute$$1, second$$1, millisecond$$1, format) {
      var scale = continuous(deinterpolateLinear, reinterpolate),
          invert = scale.invert,
          domain = scale.domain;

      var formatMillisecond = format(".%L"),
          formatSecond = format(":%S"),
          formatMinute = format("%I:%M"),
          formatHour = format("%I %p"),
          formatDay = format("%a %d"),
          formatWeek = format("%b %d"),
          formatMonth = format("%B"),
          formatYear = format("%Y");

      var tickIntervals = [[second$$1, 1, durationSecond], [second$$1, 5, 5 * durationSecond], [second$$1, 15, 15 * durationSecond], [second$$1, 30, 30 * durationSecond], [minute$$1, 1, durationMinute], [minute$$1, 5, 5 * durationMinute], [minute$$1, 15, 15 * durationMinute], [minute$$1, 30, 30 * durationMinute], [hour$$1, 1, durationHour], [hour$$1, 3, 3 * durationHour], [hour$$1, 6, 6 * durationHour], [hour$$1, 12, 12 * durationHour], [day$$1, 1, durationDay], [day$$1, 2, 2 * durationDay], [week, 1, durationWeek], [month$$1, 1, durationMonth], [month$$1, 3, 3 * durationMonth], [year$$1, 1, durationYear]];

      function tickFormat(date) {
        return (second$$1(date) < date ? formatMillisecond : minute$$1(date) < date ? formatSecond : hour$$1(date) < date ? formatMinute : day$$1(date) < date ? formatHour : month$$1(date) < date ? week(date) < date ? formatDay : formatWeek : year$$1(date) < date ? formatMonth : formatYear)(date);
      }

      function tickInterval(interval, start, stop, step) {
        if (interval == null) interval = 10;

        // If a desired tick count is specified, pick a reasonable tick interval
        // based on the extent of the domain and a rough estimate of tick size.
        // Otherwise, assume interval is already a time interval and use it.
        if (typeof interval === "number") {
          var target = Math.abs(stop - start) / interval,
              i = bisector(function (i) {
            return i[2];
          }).right(tickIntervals, target);
          if (i === tickIntervals.length) {
            step = tickStep(start / durationYear, stop / durationYear, interval);
            interval = year$$1;
          } else if (i) {
            i = tickIntervals[target / tickIntervals[i - 1][2] < tickIntervals[i][2] / target ? i - 1 : i];
            step = i[1];
            interval = i[0];
          } else {
            step = tickStep(start, stop, interval);
            interval = millisecond$$1;
          }
        }

        return step == null ? interval : interval.every(step);
      }

      scale.invert = function (y) {
        return new Date(invert(y));
      };

      scale.domain = function (_) {
        return arguments.length ? domain(map$3.call(_, number$2)) : domain().map(date$1);
      };

      scale.ticks = function (interval, step) {
        var d = domain(),
            t0 = d[0],
            t1 = d[d.length - 1],
            r = t1 < t0,
            t;
        if (r) t = t0, t0 = t1, t1 = t;
        t = tickInterval(interval, t0, t1, step);
        t = t ? t.range(t0, t1 + 1) : []; // inclusive stop
        return r ? t.reverse() : t;
      };

      scale.tickFormat = function (count, specifier) {
        return specifier == null ? tickFormat : format(specifier);
      };

      scale.nice = function (interval, step) {
        var d = domain();
        return (interval = tickInterval(interval, d[0], d[d.length - 1], step)) ? domain(nice(d, interval)) : scale;
      };

      scale.copy = function () {
        return copy(scale, calendar(year$$1, month$$1, week, day$$1, hour$$1, minute$$1, second$$1, millisecond$$1, format));
      };

      return scale;
    }

    var colors = function (s) {
      return s.match(/.{6}/g).map(function (x) {
        return "#" + x;
      });
    };

    colors("1f77b4ff7f0e2ca02cd627289467bd8c564be377c27f7f7fbcbd2217becf");

    colors("393b795254a36b6ecf9c9ede6379398ca252b5cf6bcedb9c8c6d31bd9e39e7ba52e7cb94843c39ad494ad6616be7969c7b4173a55194ce6dbdde9ed6");

    colors("3182bd6baed69ecae1c6dbefe6550dfd8d3cfdae6bfdd0a231a35474c476a1d99bc7e9c0756bb19e9ac8bcbddcdadaeb636363969696bdbdbdd9d9d9");

    colors("1f77b4aec7e8ff7f0effbb782ca02c98df8ad62728ff98969467bdc5b0d58c564bc49c94e377c2f7b6d27f7f7fc7c7c7bcbd22dbdb8d17becf9edae5");

    cubehelixLong(cubehelix(300, 0.5, 0.0), cubehelix(-240, 0.5, 1.0));

    var warm = cubehelixLong(cubehelix(-100, 0.75, 0.35), cubehelix(80, 1.50, 0.8));

    var cool = cubehelixLong(cubehelix(260, 0.75, 0.35), cubehelix(80, 1.50, 0.8));

    var rainbow = cubehelix();

    function sequential(interpolator) {
      var x0 = 0,
          x1 = 1,
          clamp = false;

      function scale(x) {
        var t = (x - x0) / (x1 - x0);
        return interpolator(clamp ? Math.max(0, Math.min(1, t)) : t);
      }

      scale.domain = function (_) {
        return arguments.length ? (x0 = +_[0], x1 = +_[1], scale) : [x0, x1];
      };

      scale.clamp = function (_) {
        return arguments.length ? (clamp = !!_, scale) : clamp;
      };

      scale.interpolator = function (_) {
        return arguments.length ? (interpolator = _, scale) : interpolator;
      };

      scale.copy = function () {
        return sequential(interpolator).domain([x0, x1]).clamp(clamp);
      };

      return linearish(scale);
    }

    var slice$3 = Array.prototype.slice;

    var identity$5 = function (x) {
      return x;
    };

    var top = 1;
    var right$1 = 2;
    var bottom = 3;
    var left$1 = 4;
    var epsilon$2 = 1e-6;

    function translateX(scale0, scale1, d) {
      var x = scale0(d);
      return "translate(" + (isFinite(x) ? x : scale1(d)) + ",0)";
    }

    function translateY(scale0, scale1, d) {
      var y = scale0(d);
      return "translate(0," + (isFinite(y) ? y : scale1(d)) + ")";
    }

    function center(scale) {
      var offset = scale.bandwidth() / 2;
      if (scale.round()) offset = Math.round(offset);
      return function (d) {
        return scale(d) + offset;
      };
    }

    function entering() {
      return !this.__axis;
    }

    function axis(orient, scale) {
      var tickArguments = [],
          tickValues = null,
          tickFormat = null,
          tickSizeInner = 6,
          tickSizeOuter = 6,
          tickPadding = 3;

      function axis(context) {
        var values = tickValues == null ? scale.ticks ? scale.ticks.apply(scale, tickArguments) : scale.domain() : tickValues,
            format = tickFormat == null ? scale.tickFormat ? scale.tickFormat.apply(scale, tickArguments) : identity$5 : tickFormat,
            spacing = Math.max(tickSizeInner, 0) + tickPadding,
            transform = orient === top || orient === bottom ? translateX : translateY,
            range = scale.range(),
            range0 = range[0] + 0.5,
            range1 = range[range.length - 1] + 0.5,
            position = (scale.bandwidth ? center : identity$5)(scale.copy()),
            selection = context.selection ? context.selection() : context,
            path = selection.selectAll(".domain").data([null]),
            tick = selection.selectAll(".tick").data(values, scale).order(),
            tickExit = tick.exit(),
            tickEnter = tick.enter().append("g").attr("class", "tick"),
            line = tick.select("line"),
            text = tick.select("text"),
            k = orient === top || orient === left$1 ? -1 : 1,
            x,
            y = orient === left$1 || orient === right$1 ? (x = "x", "y") : (x = "y", "x");

        path = path.merge(path.enter().insert("path", ".tick").attr("class", "domain").attr("stroke", "#000"));

        tick = tick.merge(tickEnter);

        line = line.merge(tickEnter.append("line").attr("stroke", "#000").attr(x + "2", k * tickSizeInner).attr(y + "1", 0.5).attr(y + "2", 0.5));

        text = text.merge(tickEnter.append("text").attr("fill", "#000").attr(x, k * spacing).attr(y, 0.5).attr("dy", orient === top ? "0em" : orient === bottom ? "0.71em" : "0.32em"));

        if (context !== selection) {
          path = path.transition(context);
          tick = tick.transition(context);
          line = line.transition(context);
          text = text.transition(context);

          tickExit = tickExit.transition(context).attr("opacity", epsilon$2).attr("transform", function (d) {
            return transform(position, this.parentNode.__axis || position, d);
          });

          tickEnter.attr("opacity", epsilon$2).attr("transform", function (d) {
            return transform(this.parentNode.__axis || position, position, d);
          });
        }

        tickExit.remove();

        path.attr("d", orient === left$1 || orient == right$1 ? "M" + k * tickSizeOuter + "," + range0 + "H0.5V" + range1 + "H" + k * tickSizeOuter : "M" + range0 + "," + k * tickSizeOuter + "V0.5H" + range1 + "V" + k * tickSizeOuter);

        tick.attr("opacity", 1).attr("transform", function (d) {
          return transform(position, position, d);
        });

        line.attr(x + "2", k * tickSizeInner);

        text.attr(x, k * spacing).text(format);

        selection.filter(entering).attr("fill", "none").attr("font-size", 10).attr("font-family", "sans-serif").attr("text-anchor", orient === right$1 ? "start" : orient === left$1 ? "end" : "middle");

        selection.each(function () {
          this.__axis = position;
        });
      }

      axis.scale = function (_) {
        return arguments.length ? (scale = _, axis) : scale;
      };

      axis.ticks = function () {
        return tickArguments = slice$3.call(arguments), axis;
      };

      axis.tickArguments = function (_) {
        return arguments.length ? (tickArguments = _ == null ? [] : slice$3.call(_), axis) : tickArguments.slice();
      };

      axis.tickValues = function (_) {
        return arguments.length ? (tickValues = _ == null ? null : slice$3.call(_), axis) : tickValues && tickValues.slice();
      };

      axis.tickFormat = function (_) {
        return arguments.length ? (tickFormat = _, axis) : tickFormat;
      };

      axis.tickSize = function (_) {
        return arguments.length ? (tickSizeInner = tickSizeOuter = +_, axis) : tickSizeInner;
      };

      axis.tickSizeInner = function (_) {
        return arguments.length ? (tickSizeInner = +_, axis) : tickSizeInner;
      };

      axis.tickSizeOuter = function (_) {
        return arguments.length ? (tickSizeOuter = +_, axis) : tickSizeOuter;
      };

      axis.tickPadding = function (_) {
        return arguments.length ? (tickPadding = +_, axis) : tickPadding;
      };

      return axis;
    }





    function axisBottom(scale) {
      return axis(bottom, scale);
    }

    function axisLeft(scale) {
      return axis(left$1, scale);
    }

    var defaultMargin = { top: 10, right: 20, bottom: 30, left: 30 };
    var defaultHeight = 200;
    var defaultWidth = 400;

    var defaultXAccessor = "x";
    var defaultYAccessor = "y";

    var uuidTemplate = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
    var uuidReplaceStr = "x";

    var stringType = "string";
    var undefinedType = "undefined";

    /*
     * http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
     */
    var uuid = function uuid() {
        return uuidTemplate.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c === uuidReplaceStr ? r : r & 0x3 | 0x8;
            return v.toString(16);
        });
    };

    var _getValue = function _getValue(accessor, data) {
        return (typeof accessor === "undefined" ? "undefined" : _typeof(accessor)) === stringType ? data[accessor] : accessor(data);
    };

    var ThreesyLine = function () {
        createClass(ThreesyLine, null, [{
            key: "getValue",
            value: function getValue(accessor, data) {
                return _getValue(accessor, data);
            }
        }]);

        function ThreesyLine() {
            var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
            classCallCheck(this, ThreesyLine);

            // Wrapper HTML element for the chart.
            if (opts.element) {
                this.element = select(opts.element);
            }

            // Element id and CSS classes.
            this.id = opts.id || uuid();
            this.classes = opts.classes || [];

            // Chart dimensions and margins/padding.
            this.margin = opts.margin || defaultMargin;
            this.height = (opts.height || defaultHeight) - this.margin.top - this.margin.bottom;
            this.width = (opts.width || defaultWidth) - this.margin.left - this.margin.right;

            // Chart data.
            this.data = opts.data || [];

            this.accessorX = opts.accessorX || defaultXAccessor;
            this.accessorY = opts.accessorY || defaultYAccessor;

            this.domainX = opts.domainX;
            this.domainY = opts.domainY;

            this.showDataPoints = _typeof(opts.showDataPoints) === undefinedType ? true : opts.showDataPoints;
            this.showGridLines = _typeof(opts.showGridLines) === undefinedType ? true : opts.showGridLines;
        }

        createClass(ThreesyLine, [{
            key: "draw",
            value: function draw() {
                var _this = this;

                if (_typeof(this.element) === undefinedType) {
                    throw new Error("No element selected.");
                }

                if (_typeof(this.data) === undefinedType || !this.data.length) {
                    throw new Error("No chart data provided.");
                }

                if (_typeof(this.domainX) === undefinedType) {
                    this.domainX = this.data.map(function (d) {
                        return _getValue(_this.accessorX, d);
                    });
                }

                if (_typeof(this.domainY) === undefinedType) {
                    this.domainY = extent(this.data, function (d) {
                        return _getValue(_this.accessorY, d);
                    });
                }

                // Create the x and y scales, and set the
                // the domain and range for each.
                this.scaleX = point$2().domain(this.domainX).range([0, this.width]);

                this.scaleY = linear().domain(this.domainY).range([this.height, 0]);

                // Set the x and y axis types.
                this.axisX = axisBottom(this.scaleX);
                this.axisY = axisLeft(this.scaleY).ticks(this.data.length);

                // Create the SVG and set the margins
                this.chart = this.element.append("svg").attr("id", this.id).attr("class", this.classes.join(" ")).attr("height", this.height + this.margin.top + this.margin.bottom).attr("width", this.width + this.margin.left + this.margin.right).append("g").attr("transform", "translate(" + this.margin.left + ", " + this.margin.top + ")");

                this.chart.classed("threesy-line", true);

                this.gridLineX = this.chart.selectAll(".threesy-grid-line-x").data(this.data.filter(function (d, i) {
                    return i > 0;
                })).enter().append("line").attr("class", "threesy-grid-line threesy-grid-line-x").attr("x1", function (d) {
                    return _this.scaleX(_getValue(_this.accessorX, d));
                }).attr("x2", function (d) {
                    return _this.scaleX(_getValue(_this.accessorX, d));
                }).attr("y1", 0).attr("y2", this.height);

                this.gridLineY = this.chart.selectAll(".threesy-grid-line-y").data(this.data.filter(function (d) {
                    return _this.scaleY(_getValue(_this.accessorY, d)) < _this.height - 1;
                })).enter().append("line").attr("class", "threesy-grid-line threesy-grid-line-y").attr("x1", 0).attr("x1", this.width).attr("y1", function (d) {
                    return _this.scaleY(_getValue(_this.accessorY, d));
                }).attr("y2", function (d) {
                    return _this.scaleY(_getValue(_this.accessorY, d));
                });

                // Draw the x and y axes
                this.axisLineX = this.chart.append("g").attr("class", "x axis").attr("transform", "translate(0, " + this.height + ")").call(this.axisX);

                this.axisLineY = this.chart.append("g").attr("class", "y axis").call(this.axisY);

                // Create the line generator and set the
                // access functions
                this.line = line().x(function (d) {
                    return _this.scaleX(_getValue(_this.accessorX, d));
                }).y(function (d) {
                    return _this.scaleY(_getValue(_this.accessorY, d));
                });

                // Draw the path
                this.path = this.chart.append("g").append("path").datum(this.data).attr("class", "line").attr("d", this.line);

                // Create circles for each data point.
                // Only visible if showDataPoints = true.
                this.dataPoints = this.chart.selectAll(".threesy-data-point").data(this.data).enter().append("circle").attr("class", "threesy-data-point").attr("r", 3.5).attr("cx", function (d) {
                    return _this.scaleX(_getValue(_this.accessorX, d));
                }).attr("cy", function (d) {
                    return _this.scaleY(_getValue(_this.accessorY, d));
                }).style("visibility", this.showDataPoints ? "visible" : "hidden");

                return this;
            }
        }, {
            key: "update",
            value: function update(data) {
                var _this2 = this;

                if ((typeof data === "undefined" ? "undefined" : _typeof(data)) === undefinedType || !data.length) {
                    throw new Error("Can't invoke update without data.");
                }

                this.data = data;
                this.domainX = this.data.map(function (d) {
                    return _getValue(_this2.accessorX, d);
                });
                this.domainY = extent(this.data, function (d) {
                    return _getValue(_this2.accessorY, d);
                });

                this.scaleX.domain(this.domainX);
                this.scaleY.domain(this.domainY);

                this.gridLineX.data(this.data.filter(function (d, i) {
                    return i > 0;
                })).attr("x1", function (d) {
                    return _this2.scaleX(_getValue(_this2.accessorX, d));
                }).attr("x2", function (d) {
                    return _this2.scaleX(_getValue(_this2.accessorX, d));
                }).attr("y1", 0).attr("y2", this.height);

                this.gridLineY.data(this.data.filter(function (d) {
                    return _this2.scaleY(_getValue(_this2.accessorY, d)) < _this2.height - 1;
                })).attr("x1", 0).attr("x1", this.width).attr("y1", function (d) {
                    return _this2.scaleY(_getValue(_this2.accessorY, d));
                }).attr("y2", function (d) {
                    return _this2.scaleY(_getValue(_this2.accessorY, d));
                });

                this.gridLineX.exit().remove();
                this.gridLineY.exit().remove();

                this.axisLineX.call(this.axisX);
                this.axisLineY.call(this.axisY);

                this.path.datum(this.data).attr("d", this.line);

                this.dataPoints.data(this.data).attr("cx", function (d) {
                    return _this2.scaleX(_getValue(_this2.accessorX, d));
                }).attr("cy", function (d) {
                    return _this2.scaleY(_getValue(_this2.accessorY, d));
                });

                this.dataPoints.exit().remove();
            }
        }, {
            key: "toggleDataPoints",
            value: function toggleDataPoints() {
                this.dataPoints.style("visibility", (this.showDataPoints = !this.showDataPoints) ? "visible" : "hidden");
            }
        }, {
            key: "toggleGridLines",
            value: function toggleGridLines() {
                this.chart.selectAll(".threesy-grid-line").style("visibility", (this.showGridLines = !this.showGridLines) ? "visible" : "hidden");
            }
        }]);
        return ThreesyLine;
    }();

    return ThreesyLine;

}());
