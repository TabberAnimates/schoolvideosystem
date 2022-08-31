//see: http://elegantcode.com/2011/01/26/basic-javascript-part-8-namespaces/
function namespace(namespaceString) {
    var parts = namespaceString.split('.'),
        parent = window,
        currentPart = '';

    for (var i = 0, length = parts.length; i < length; i++) {
        currentPart = parts[i];
        parent[currentPart] = parent[currentPart] || {};
        parent = parent[currentPart];
    }

    return parent;
}

(function () {
    if ('function' != typeof Function.prototype.inheritsFrom) {
        Function.prototype.inheritsFrom = function (obj) {
            this.prototype = obj.constructor == Function ? new obj : obj;
            this.prototype.constructor = this;
            return this;
        };
    }
})();
